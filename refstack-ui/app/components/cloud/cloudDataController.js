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

(function() {'use strict';

    angular.module('refstackApp').controller('CloudDataController', CloudDataController);

    CloudDataController.$inject = ['$interval', '$http', '$stateParams', 'refstackApiUrl', 'raiseAlert'];

    /**
     * Refstack Cloud Data Controller
     * This controller is for viewing large deatils of the Cloud.
     */
    function CloudDataController($interval, $http, $stateParams, refstackApiUrl, raiseAlert) {

        var ctrl = this;

        ctrl.getCloudData = getCloudData;

        ctrl.cloud_id = $stateParams.cloud_id;
        ctrl.data_type = $stateParams.data_type;
        ctrl.partial = $stateParams.partial;

        ctrl.data = '';
        ctrl.needFullLink = false;
        ctrl.reloadTimer = null;
        ctrl.indicatorTimer = null;
        ctrl.indicator = '';

        function getCloudData() {
            var url = refstackApiUrl + "/clouds/"
                      + ctrl.cloud_id + "/"
                      + ctrl.data_type 
                      + "?line_count=" + (ctrl.partial ? 20 : 0);
            $http.get(url).success(function (data) {
                ctrl.data = data.data;
                ctrl.needFullLink = data.partial ? true : false;
                if (ctrl.reloadTimer == null && data.isRunning) {
                    ctrl.reloadTimer = $interval(function() {
                        ctrl.getCloudData();
                    }.bind(ctrl), 10000);
                } else if (ctrl.reloadTimer != null && !data.isRunning) {
                    $interval.cancel(ctrl.reloadTimer);
                }
                if (ctrl.indicatorTimer == null && data.isRunning) {
                    ctrl.indicatorTimer = $interval(function() {
                        ctrl.indicator = ctrl.indicator + '*';
                        if (ctrl.indicator.length > 4)
                            ctrl.indicator = '';
                    }.bind(ctrl), 500);
                } else if (ctrl.indicatorTimer != null && !data.isRunning) {
                    $interval.cancel(ctrl.indicatorTimer);
                    ctrl.indicator = '';
                }
            }).error(function (error) {
                raiseAlert('danger',
                    error.title, error.detail);
            });
        };
        ctrl.getCloudData();
    }
})();
