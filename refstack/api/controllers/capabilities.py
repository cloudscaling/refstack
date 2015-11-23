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

"""Defcore capabilities controller."""

from oslo_config import cfg
from oslo_log import log
import pecan
from pecan import rest

from refstack.api.controllers import caps_utils

CONF = cfg.CONF
LOG = log.getLogger(__name__)


class CapabilitiesController(rest.RestController):
    """/v1/capabilities handler.

    This acts as a proxy for retrieving capability files
    from the openstack/defcore Github repository.
    """

    @pecan.expose('json')
    def get(self):
        """Get a list of all available capabilities."""
        return caps_utils.get_target_programs()

    @pecan.expose('json')
    def get_one(self, target_program, version):
        """Handler for getting contents of specific capability file."""
        return caps_utils.get_capability(target_program, version)
