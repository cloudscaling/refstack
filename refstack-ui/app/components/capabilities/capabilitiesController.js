/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function () {
    'use strict';

    angular
        .module('refstackApp')
        .controller('CapabilitiesController', CapabilitiesController);

    CapabilitiesController.$inject = ['$http', 'refstackApiUrl'];

    /**
     * RefStack Capabilities Controller
     * This controller is for the '/capabilities' page where a user can browse
     * through tests belonging to DefCore-defined capabilities.
     */
    function CapabilitiesController($http, refstackApiUrl) {
        var ctrl = this;

        ctrl.filterStatus = filterStatus;
        ctrl.getObjectLength = getObjectLength;
        ctrl.updateCapabilities = updateCapabilities;
        ctrl.updateTargetCapabilities = updateTargetCapabilities;

        /** The various possible capability statuses. */
        ctrl.status = {
            required: true,
            advisory: false,
            deprecated: false,
            removed: false
        };

        /**
         * The template to load for displaying capability details.
         */
        ctrl.detailsTemplate = 'components/capabilities/partials/' +
                               'capabilityDetails.html';


        /** The target OpenStack marketing program to show capabilities for. */
        /** TODO: commonize it with other instances of this method */
        ctrl.getCapabilities = getCapabilities; 
        ctrl.updateVersions = updateVersions;
        ctrl.targetPrograms = null;
        ctrl.versions = null;
        ctrl.targetProgram = null;
        ctrl.version = null;
        ctrl.capabilities = null;

        function getCapabilities() {
            var content_url = refstackApiUrl + '/capabilities';
            ctrl.capsRequest = $http.get(content_url).success(function (data) {
                ctrl.targetPrograms = data;
                ctrl.targetProgram = ctrl.targetPrograms[0].targetProgram;
                ctrl.updateVersions();
            }).error(function (error) {
                ctrl.showError = true;
                ctrl.error = 'Error retrieving version list: ' +
                    angular.toJson(error);
            });
        }
        ctrl.getCapabilities();

        function updateVersions() {
            ctrl.capabilities = null;
            if (ctrl.targetPrograms == null) {
                return;
            }
            ctrl.targetPrograms.forEach(function (item) {
                if (item.targetProgram == ctrl.targetProgram) {
                    ctrl.versions = item.versions.sort().reverse();
                    ctrl.version = ctrl.versions[0];
                    ctrl.updateCapabilities();
                }
            });
        }


        function updateCapabilities() {
            var content_url = refstackApiUrl + '/capabilities/'
                              + ctrl.targetProgram + '/' + ctrl.version;
            ctrl.capsRequest =
                $http.get(content_url).success(function (data) {
                    ctrl.capabilities = data;
                    ctrl.updateTargetCapabilities();
                }).error(function (error) {
                    ctrl.showError = true;
                    ctrl.targetCapabilities = null;
                    ctrl.error = 'Error retrieving capabilities: ' +
                        angular.toJson(error);
                });
        }

        /**
         * This will update the scope's 'targetCapabilities' object with
         * capabilities belonging to the selected OpenStack marketing program
         * (programs typically correspond to 'components' in the DefCore
         * schema). Each capability will have its status mapped to it.
         */
        function updateTargetCapabilities() {
            ctrl.targetCapabilities = {};
            var components = ctrl.capabilities.components;
            var targetCaps = ctrl.targetCapabilities;

            // The 'platform' target is comprised of multiple components, so
            // we need to get the capabilities belonging to each of its
            // components.
            if (ctrl.targetProgram === 'platform') {
                var platform_components = ctrl.capabilities.platform.required;

                // This will contain status priority values, where lower
                // values mean higher priorities.
                var statusMap = {
                    required: 1,
                    advisory: 2,
                    deprecated: 3,
                    removed: 4
                };

                // For each component required for the platform program.
                angular.forEach(platform_components, function (component) {
                    // Get each capability list belonging to each status.
                    angular.forEach(components[component],
                        function (caps, status) {
                            // For each capability.
                            angular.forEach(caps, function(cap) {
                                // If the capability has already been added.
                                if (cap in targetCaps) {
                                    // If the status priority value is less
                                    // than the saved priority value, update
                                    // the value.
                                    if (statusMap[status] <
                                        statusMap[targetCaps[cap]]) {
                                        targetCaps[cap] = status;
                                    }
                                }
                                else {
                                    targetCaps[cap] = status;
                                }
                            });
                        });
                });
            }
            else {
                angular.forEach(components[ctrl.targetProgram],
                    function (caps, status) {
                        angular.forEach(caps, function(cap) {
                            targetCaps[cap] = status;
                        });
                    });
            }
        }

        /**
         * This filter will check if a capability's status corresponds
         * to a status that is checked/selected in the UI. This filter
         * is meant to be used with the ng-repeat directive.
         * @param {Object} capability
         * @returns {Boolean} True if capability's status is selected
         */
        function filterStatus(capability) {
            var caps = ctrl.targetCapabilities;
            return (ctrl.status.required &&
                caps[capability.id] === 'required') ||
                (ctrl.status.advisory &&
                caps[capability.id] === 'advisory') ||
                (ctrl.status.deprecated &&
                caps[capability.id] === 'deprecated') ||
                (ctrl.status.removed &&
                caps[capability.id] === 'removed');
        }

        /**
         * This function will get the length of an Object/dict based on
         * the number of keys it has.
         * @param {Object} object
         * @returns {Number} length of object
         */
        function getObjectLength(object) {
            return Object.keys(object).length;
        }
    }
})();
