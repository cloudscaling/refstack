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

"""Schemas controller."""

from oslo_config import cfg
from oslo_log import log
import pecan
from pecan.secure import secure
from webob import exc

from refstack.api.controllers import validation
from refstack.api import utils as api_utils
from refstack.api import validators
from refstack import db

CONF = cfg.CONF
LOG = log.getLogger(__name__)


class SchemasController(validation.BaseRestControllerWithValidation):
    """/v1/schemas handler.

    This can list/add/delete/update schema URLs.
    """

    __validator__ = validators.SchemaValidator

    @pecan.expose('json')
    def get(self):
        """Get a list of all available schemas."""
        results = db.get_schemas()
        openid = api_utils.get_user_id()
        for result in results:
            if result['openid'] != openid:
                result['openid'] = None
        results = sorted(results,
            cmp=lambda x, y: cmp(x['description'], y['description'])
                if x['openid'] == y['openid'] else -1 if x['openid'] else 1)

        # TODO: add paging

        page = {'results': results,
                'pagination': {
                    'current_page': 1,
                    'total_pages': 1
                }}
        return page

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def store_item(self, schema):
        """Handler for storing item. Should return new item id."""
        schema['openid'] = api_utils.get_user_id()
        schema_id = db.store_schema(schema)
        return {'schema_id': schema_id}

    @secure(api_utils.is_authenticated)
    @pecan.expose('json')
    def delete(self, schema_id):
        """Delete schema."""
        schema = db.get_schema(schema_id)
        if schema['openid'] != api_utils.get_user_id():
            raise exc.HTTPUnauthorized('Only owner can do it with the schema.')

        db.delete_schema(schema_id)
        pecan.response.status = 204
