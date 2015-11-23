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
        .controller('LeaderBoardController', LeaderBoardController);

    LeaderBoardController.$inject = [
        '$http', '$state', 'refstackApiUrl', 'raiseAlert'
    ];

    /**
     * Refstack Leader Board Controller
     * This controller is for the '/leaderBoard' page where a user can browse
     * a listing of shared clouds.
     */
    function LeaderBoardController($http, $state, refstackApiUrl, raiseAlert) {

        var ctrl = this;

        ctrl.update = update;
        ctrl.coefToStyle = coefToStyle;

        ctrl.currentPage = 1;
        ctrl.itemsPerPage = 20;
        ctrl.maxSize = 5;


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
                    ctrl.update();
                }
            });
        }


         /**
          * This will contact the Refstack API to get a listing of test run
          * results.
          */
        function update() {
            ctrl.showError = false;
            // Construct the API URL based on user-specified filters.
            var content_url = refstackApiUrl + '/leaderBoard'
                              + '?page=' + ctrl.currentPage
                              + '&version=' + ctrl.version
                              + '&target=' + ctrl.targetProgram;
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
                        JSON.stringify(error);
                });
        }

        function coefToStyle(coef) {
            if (Number(coef) !== coef)
                return ''; // parent color
            if (coef < 50)
                return '#FF3300'; // red
            if (coef < 70)
                return '#FFFF99'; // yellow
            return '#33CC33'; // green
        }
    }
})();
