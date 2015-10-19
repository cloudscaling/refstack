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

from oslo_config import cfg
from oslo_log import log
import pecan
from pecan import rest

from refstack.api.controllers import caps_utils
from refstack.api import exceptions as api_exc
from refstack.api import utils as api_utils
from refstack import db

LOG = log.getLogger(__name__)
CONF = cfg.CONF


class LeaderBoardController(rest.RestController):

    """/v1/leaderBoard handler."""

    @pecan.expose('json')
    def get(self):
        """Get information for leader board."""
        expected_input_params = ['version', 'target']
        params = api_utils.parse_input_params(expected_input_params)
        if 'version' not in params:
            raise api_exc.ValidationError(
                'Version parameters can not be null.')
        if 'target' not in params:
            raise api_exc.ValidationError(
                'Target parameters can not be null.')

        ref_tests = caps_utils.get_capability_tests(params['version'],
                                                    params['target'])
        ref_tests_count = len(ref_tests)
        LOG.debug("All tests count: %s" % float(len(ref_tests)))
        clouds = db.get_shared_clouds()
        for cloud in clouds:
            if ref_tests_count == 0:
                cloud.update({'coef': 'N/A'})
                continue
            tests = db.get_cloud_last_results(cloud['id'])
            tests_count = 0
            for test in tests:
                if test['name'] in ref_tests:
                    tests_count += 1
            LOG.debug("Passed tests count: %s" % len(tests))
            coef = int(100 * tests_count / float(ref_tests_count))
            cloud.update({'coef': coef})

        # TODO: add paging

        page = {'results': clouds,
                'pagination': {
                    'current_page': 1,
                    'total_pages': 1
                }}

        return page
