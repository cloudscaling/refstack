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
from pecan.secure import secure
from six.moves.urllib import parse

from refstack import db
from refstack.api import constants as const
from refstack.api import utils as api_utils
from refstack.api import validators
from refstack.api.controllers import validation

LOG = log.getLogger(__name__)

CONF = cfg.CONF


class CloudsController(validation.BaseRestControllerWithValidation):

    """/v1/clouds handler."""

    __validator__ = validators.CloudValidator

    @secure(api_utils.is_authenticated)
    def store_item(self, cloud):
        """Handler for storing item. Should return new item id."""
        cloud['openid'] = api_utils.get_user_id();
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

        TODO
        """
        openid = api_utils.get_user_id()
        results = db.get_user_clouds(openid)

        # TODO: add paging

        LOG.error(results)
        page = {'results': results,
                'pagination': {
                    'current_page': 1,
                    'total_pages': 1
                }}

        return page

    @secure(api_utils.is_authenticated)
    @pecan.expose()
    def config(self, cloudID):
        """Get information of all registered clouds.

        TODO
        """
        return db.get_cloud(cloudID)['config']
