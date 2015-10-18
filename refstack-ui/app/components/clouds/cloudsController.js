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
        .controller('CloudsController', CloudsController);

    CloudsController.$inject = [
        '$http', '$state', 'refstackApiUrl', 'raiseAlert'
    ];

    /**
     * RefStack Clouds Controller
     */
    function CloudsController($http, $state, refstackApiUrl, raiseAlert) {

        var ctrl = this;
        
        ctrl.update = update;
        ctrl.addCloud = addCloud;
        ctrl.deleteCloud = deleteCloud;

        ctrl.currentPage = 1;
        ctrl.itemsPerPage = 20;
        ctrl.maxSize = 5;
        ctrl.name = '';
        ctrl.description = '';
        ctrl.config = '';
        ctrl.isConfigLoaded = '[No data]';

        /**
         * This will contact the Refstack API to get a listing of test run
         * results.
         */
        function update() {
            ctrl.showError = false;
            // Construct the API URL based on user-specified filters.
            var content_url = refstackApiUrl + '/clouds?page=' +
                ctrl.currentPage;
            ctrl.cloudsRequest =
                $http.get(content_url).success(function (data) {
                    ctrl.data = data;
                    ctrl.totalItems = ctrl.data.pagination.total_pages *
                        ctrl.itemsPerPage;
                    ctrl.currentPage = ctrl.data.pagination.current_page;
                }).error(function (error) {
                    ctrl.data = null;
                    ctrl.totalItems = 0;
                    ctrl.showError = true;
                    ctrl.error =
                        'Error retrieving clouds listing from server: ' +
                        angular.toJson(error);
                });
        };
        ctrl.update();

        ctrl.configFile = {
            change: function (f) {
                if (f.size > 1024*1024) {
                    ctrl.isConfigLoaded = '[Config is too big(more than 1Mb), please choose another one]';
                    return;
                }

                var r = new FileReader();
                r.onloadend = function(e) {
                    var data = e.target.result;
                    ctrl.config = data;
                    ctrl.isConfigLoaded = '[Config loaded]';
                    ctrl.$apply();
                };
                r.readAsText(f._file);
            }
        };

        function addCloud() {
            if (ctrl.config == '') {
                ctrl.showError = true;
                ctrl.error = 'Config is not loaded.';
                return;
            }

            var url = refstackApiUrl + '/clouds';
            var data = {
                name: ctrl.name,
                description: ctrl.description,
                config: ctrl.config
            };
            $http.post(url, data).success(function (data) {
                ctrl.update();
            }).error(function (error) {
                ctrl.showError = true;
                ctrl.error =
                    'Error adding new cloud: ' +
                    JSON.stringify(error);
            });

            ctrl.name = '';
            ctrl.description = '';
            ctrl.config = '';
            ctrl.isConfigLoaded = '';
            angular.element(document.querySelector('#configFile')).val(null);
        };

        function deleteCloud(cloud) {
            var content_url = [
                refstackApiUrl, '/clouds/', cloud.cloud_id
            ].join('');
            ctrl.deleteRequest =
                $http.delete(content_url).success(function () {
                    ctrl.update();
                }).error(function (error) {
                    raiseAlert('danger',
                        error.title, error.detail);
                });
        };
    }
})();
