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

    CloudDataController.$inject = ['$http', '$state', '$stateParams', 'refstackApiUrl', 'raiseAlert'];

    /**
     * Refstack Cloud Data Controller
     * This controller is for viewing large deatils of the Cloud.
     */
    function CloudDataController($http, $state, $stateParams, refstackApiUrl, raiseAlert) {

        var ctrl = this;

        ctrl.getCloudData = getCloudData;

        ctrl.cloud_id = $stateParams.cloud_id;
        ctrl.data_type = $stateParams.data_type;

        ctrl.data = '';
        ctrl.needFullLink = false;

        function getCloudData(partial) {
            var url = refstackApiUrl + "/clouds/"
                      + ctrl.cloud_id + "/"
                      + ctrl.data_type 
                      + "?line_count=" + (partial ? 50 : 0);
            $http.get(url).success(function (data) {
                ctrl.data = data.data;
                ctrl.needFullLink = data.partial ? true : false;
            }).error(function (error) {
                raiseAlert('danger',
                    error.title, error.detail);
            });
        };
        ctrl.getCloudData($stateParams.partial);
    }
})();
