# Copyright (c) 2015 Mirantis, Inc.
# All Rights Reserved.
#
#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

"""Test clouds controller."""

import os
import re
import shutil
import signal
import subprocess
import tempfile
import time

from oslo_config import cfg
from oslo_log import log
import pecan
from pecan import rest
from pecan.secure import secure
from webob import exc

from refstack import db
from refstack.api import utils as api_utils
from refstack.api import validators
from refstack.api.controllers import caps_utils
from refstack.api.controllers import validation
from refstack.api import exceptions as api_exc

LOG = log.getLogger(__name__)
CONF = cfg.CONF


def _get_params(params):
    result = list()
    for param in params:
        value = pecan.request.GET.get(param).strip()
        if not value:
            raise api_exc.ValidationError('Param "%s" can not be empty'
                                          % param)
        result.append(value)
    return result


def _check_cloud_owner(cloud_id):
    cloud = db.get_cloud(cloud_id)
    if cloud['openid'] != api_utils.get_user_id():
        raise exc.HTTPUnauthorized('Only owner can do it with the cloud.')


def _check_cloud_viewable(cloud_id):
    cloud = db.get_cloud(cloud_id)
    if cloud['openid'] != api_utils.get_user_id() and not cloud['shared']:
        raise exc.HTTPUnauthorized('You can not view this cloud.')


def _get_pid(cloud_id):
    try:
        output = os.popen("ps ax | grep 'cloud-%s/run' | "
                          "grep -v 'grep'" % cloud_id).read()
        pid = output.split()[0]
        LOG.debug("Cloud(%s) runs tests. PID = %s" % (cloud_id, pid))
        return pid
    except Exception:
        pass
    return None


class CloudConfigController(rest.RestController):

    """/v1/clouds/cloud_id/config handler."""

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def get(self, cloud_id):
        """..."""
        _check_cloud_owner(cloud_id)

        strings_to_obfuscate = ['aws_access', 'aws_secret', 'password',
                                'alt_password', 'admin_password']

        config = db.get_cloud_config(cloud_id).split('\n')
        new_config = list()
        for line in config:
            key = line.split('=')[0]
            if key.lower().strip() in strings_to_obfuscate:
                line = key + '= *****'
            new_config.append(line)

        return {'data': '\n'.join(new_config), 'partial': False}

    @secure(api_utils.is_authenticated)
    @pecan.expose('json', method='PUT')
    def put(self, cloud_id, **kw):
        """..."""
        _check_cloud_owner(cloud_id)

        cloud = {}
        cloud['id'] = cloud_id
        cloud['config'] = kw['config']
        db.update_cloud(cloud)

        pecan.response.status = 201


class CloudLastlogController(rest.RestController):

    """/v1/clouds/cloud_id/lastlog handler."""

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def get(self, cloud_id):
        params = _get_params(['line_count'])
        LOG.debug('Params: ' + str(params))
        line_count = int(params[0])

        _check_cloud_owner(cloud_id)

        result = {
            'data': 'Could not find log file',
            'partial': False
        }
        try:
            ftime = None
            log_file = None
            dir_path = os.path.join(tempfile.gettempdir(), 'cloud-' + cloud_id)
            if os.path.exists(dir_path):
                for filename in os.listdir(dir_path):
                    if re.search('output-\d*.\d*.log', filename):
                        filename = os.path.join(dir_path, filename)
                        ctime = os.path.getmtime(filename)
                        if not ftime or ftime < ctime:
                            ftime = ctime
                            log_file = filename
            if log_file:
                with open(log_file, 'r') as f:
                    content = f.read()
                if not line_count or line_count >= content.count('\n'):
                    result['data'] = content
                    result['partial'] = False
                else:
                    content = content.splitlines()[-line_count:]
                    content = '...\n' + '\n'.join(content)
                    result['data'] = content
                    result['partial'] = True
        except Exception:
            LOG.exception("Couldn't read log file")

        pid = _get_pid(cloud_id)
        result['isRunning'] = True if pid else False

        return result


class CloudShareController(rest.RestController):

    """/v1/clouds/<cloud_id>/shared handler."""

    @pecan.expose('json')
    def post(self, cloud_id):
        _check_cloud_owner(cloud_id)

        cloud = {}
        cloud['id'] = cloud_id
        cloud['shared'] = pecan.request.body
        db.update_cloud(cloud)

        pecan.response.status = 201


class CloudsController(validation.BaseRestControllerWithValidation):

    """/v1/clouds handler."""

    config = CloudConfigController()
    lastlog = CloudLastlogController()
    shared = CloudShareController()

    __validator__ = validators.CloudValidator

    _custom_actions = {
        "run": ["GET"],
        "stop": ["GET"],
    }

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def store_item(self, cloud):
        """Handler for storing item. Should return new item id."""
        cloud['openid'] = api_utils.get_user_id()
        cloud_id = db.store_cloud(cloud)
        return {'cloud_id': cloud_id}

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def delete(self, cloud_id):
        """Delete cloud."""
        _check_cloud_owner(cloud_id)

        db.delete_cloud_results(cloud_id)
        db.delete_cloud(cloud_id)
        pecan.response.status = 204

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def get(self):
        """Get information of all registered clouds."""
        openid = api_utils.get_user_id()
        results = db.get_user_clouds(openid)
        for result in results:
            pid = _get_pid(result['id'])
            result.update({'is_running': True if pid else False})

        # TODO: add paging

        page = {'results': results,
                'pagination': {
                    'current_page': 1,
                    'total_pages': 1
                }}

        return page

    @pecan.expose('json')
    def get_one(self, cloud_id):
        """Get information about cloud."""
        _check_cloud_viewable(cloud_id)

        cloud = db.get_cloud(cloud_id)
        pid = _get_pid(cloud['id'])
        cloud['is_running'] = True if pid else False
        openid = api_utils.get_user_id()
        cloud['can_edit'] = openid == cloud['openid']
        return cloud

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def run(self):
        params = _get_params(['cloud_id', 'version', 'target'])
        LOG.debug('Params for run: ' + str(params))
        cloud_id = params[0]
        version = params[1]
        target = params[2]

        LOG.debug("cloudId = " + str(cloud_id))
        # check existense
        cloud = db.get_cloud(cloud_id)
        if not cloud:
            raise api_exc.ValidationError(
                'Cloud %s could not be found.' % cloud_id)

        _check_cloud_owner(cloud_id)

        if _get_pid(cloud_id):
            raise api_exc.ValidationError(
                'Cloud tests already run.')

        run_dir = CONF.api.refstack_client_dir
        if not run_dir:
            raise api_exc.ValidationError(
                'There is no run directory configured')

        try:
            dir_path = os.path.join(tempfile.gettempdir(), 'cloud-' + cloud_id)
            if os.path.exists(dir_path):
                shutil.rmtree(dir_path)
            os.makedirs(dir_path)

            run_time = time.time()
            log_file = os.path.join(dir_path, 'output-%s.log' % run_time)

            # store config to temp file
            config = db.get_cloud_config(cloud_id)
            cfg_file = os.path.join(dir_path, 'tempest.conf')
            LOG.debug('Config file: ' + cfg_file)
            with open(cfg_file, 'w') as f:
                f.write(config)

            # prepare tests list and store it in file
            tests = caps_utils.get_capability_tests(version, target)

            # temporary hack
            # tests = [t for t in tests if 'regions' in t]

            test_list_file = os.path.join(dir_path, 'test-list-%s' % run_time)
            LOG.error('Tests list file: ' + test_list_file)
            with open(test_list_file, 'w') as f:
                f.write('\n'.join(sorted(tests)))

            # run external process
            script_file = os.path.join(dir_path, 'run%s.sh' % run_time)
            LOG.error('Script file: ' + script_file)
            with open(script_file, 'w') as f:
                f.write('#!/bin/bash\n')
                f.write('cd %s\n' % run_dir)
                f.write('source .venv/bin/activate\n')
                f.write('./refstack-client test --upload --url %s -c %s -vv '
                    '--cpid %s -- --load-list=%s >%s 2>&1\n' % (
                    CONF.api.api_url, cfg_file, cloud_id, test_list_file,
                    log_file))

            subprocess.Popen(['setsid', '/bin/bash', '-C', script_file])
        except Exception:
            LOG.exception("Error in run.")
            shutil.rmtree(dir_path)
            raise

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def stop(self):
        params = _get_params(['cloud_id'])
        LOG.debug('Params for stop: ' + str(params))
        cloud_id = params[0]

        _check_cloud_owner(cloud_id)

        pid = _get_pid(cloud_id)
        os.kill(-int(pid), signal.SIGKILL)
