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
from pecan.secure import secure
import requests

from refstack import db
from refstack.api import utils as api_utils
from refstack.api import validators
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


class CloudConfigController(validation.BaseRestControllerWithValidation):

    """/v1/cloud/config handler."""

    __validator__ = validators.BaseValidator

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def get(self):
        """...

        TODO: add comment
        """
        params = _get_params(['cloud_id'])
        LOG.debug('Params: ' + str(params))
        cloud_id = params[0]

        return {'data': db.get_cloud(cloud_id)['config'], 'partial': False}

    @secure(api_utils.is_authenticated)
    @pecan.expose('json', method='PUT')
    def put(self, **kw):
        """...

        TODO: add comment
        """
        LOG.debug('Input: ' + str(kw))

        cloud = db.get_cloud(kw['cloud_id'])
        cloud['config'] = kw['config']
        db.update_cloud(cloud)

        return {'result': True}


class CloudsController(validation.BaseRestControllerWithValidation):

    """/v1/clouds handler."""

    config = CloudConfigController()

    __validator__ = validators.CloudValidator

    _custom_actions = {
        "lastlog": ["GET"],
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
        """Delete test run."""
        db.delete_cloud(cloud_id)
        pecan.response.status = 204

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def get(self):
        """Get information of all registered clouds.

        TODO: add comment
        """
        openid = api_utils.get_user_id()
        results = db.get_user_clouds(openid)
        for result in results:
            pid = self._get_pid(result['id'])
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
        """Get information about cloud.

        TODO: add comment
        """
        cloud = db.get_cloud(cloud_id)
        pid = self._get_pid(cloud['id'])
        cloud['is_running'] = True if pid else False
        openid = api_utils.get_user_id()
        cloud['can_edit'] = openid == cloud['openid']
        return cloud

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def lastlog(self):
        """...

        TODO: add comment
        """
        params = _get_params(['cloud_id', 'line_count'])
        LOG.debug('Params: ' + str(params))
        cloud_id = params[0]
        line_count = int(params[1])

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
                    return {'data': content, 'partial': False}

                content = content.splitlines()[-line_count:]
                content = '...\n' + '\n'.join(content)
                return {'data': content, 'partial': True}
        except Exception:
            LOG.exception("Couldn't read log file")

        return {'data': 'Could not find log file', 'partial': False}

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def run(self):
        params = _get_params(['cloud_id', 'version', 'target'])
        LOG.debug('Params for run: ' + str(params))
        cloud_id = params[0]
        version = params[1]
        target = params[2]

        run_dir = CONF.api.refstack_client_dir
        if not run_dir:
            raise api_exc.ValidationError(
                'There is no run directory configured')

        LOG.debug("cloudId = " + str(cloud_id))
        cloud = db.get_cloud(cloud_id)

        try:
            dir_path = os.path.join(tempfile.gettempdir(), 'cloud-' + cloud_id)
            if os.path.exists(dir_path):
                shutil.rmtree(dir_path)
            os.makedirs(dir_path)

            run_time = time.time()
            log_file = os.path.join(dir_path, 'output-%s.log' % run_time)

            # store config to temp file
            cfg_file = os.path.join(dir_path, 'tempest.conf')
            LOG.debug('Config file: ' + cfg_file)
            with open(cfg_file, 'w') as f:
                f.write(cloud['config'])

            # prepare tests list and store it in file
            # TODO: commonize it with code in capabilities
            # 1. load list from github
            github_url = ''.join((CONF.api.github_raw_base_url.rstrip('/'),
                                  '/', version))
            try:
                response = requests.get(github_url)
                LOG.debug("Response Status: %s / Used Requests Cache: %s" %
                          (response.status_code,
                           getattr(response, 'from_cache', False)))
                if response.status_code == 200:
                    full_list = response.json()
                else:
                    LOG.warning('Github returned non-success HTTP '
                                'code: %s' % response.status_code)
                    pecan.abort(response.status_code)
            except requests.exceptions.RequestException as e:
                LOG.warning('An error occurred trying to get GitHub '
                            'capability file contents: %s' % e)
                pecan.abort(500)
            # 2. filter tests by target
            targets = set()
            if target != 'platform':
                targets.add(target)
            else:
                p = full_list['platform']
                targets = set().union(p['required']).union(p['advisory'])
            components = full_list['components']
            caps = set()
            for c in components:
                if c not in targets:
                    continue
                cv = components[c]
                caps = caps.union(cv['required']).union(cv['advisory'])
            json_caps = full_list['capabilities']
            tests = set()
            for json_cap in json_caps:
                if json_cap not in caps:
                    continue
                cv = json_caps[json_cap]
                try:
                    for test in cv['tests']:
                        test_prop = cv['tests'][test]
                        test_name = test
                        if 'idempotent_id' in test_prop:
                            test_name += '[' + test_prop['idempotent_id'] + ']'
                        tests.add(test_name)
                except AttributeError:
                    LOG.exception(str(cv['tests']))
                    raise

            # temporary hack
            tests = [t for t in tests if 'regions' in t]

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
        pid = self._get_pid(params[0])
        os.kill(-int(pid), signal.SIGKILL)

    def _get_pid(self, cloud_id):
        try:
            output = os.popen("ps ax | grep 'cloud-%s/run' | "
                              "grep -v 'grep'" % cloud_id).read()
            pid = output.split()[0]
            LOG.debug("Cloud(%s) runs tests. PID = %s" % (cloud_id, pid))
            return pid
        except Exception:
            pass
        return None
