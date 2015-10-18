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

    angular.module('refstackApp').controller('CloudController', CloudController);

    CloudController.$inject = ['$http', '$state', '$stateParams', 'refstackApiUrl', 'raiseAlert'];

    /**
     * Refstack Cloud Controller
     * This controller is for the '/cloud' page where a user can do something
     * with the cloud.
     */
    function CloudController($http, $state, $stateParams, refstackApiUrl, raiseAlert) {

        var ctrl = this;

        ctrl.getVersionList = getVersionList;
        ctrl.getCloudDetail = getCloudDetail;
        ctrl.updateConfig = updateConfig;
        ctrl.run = run;
        ctrl.stop = stop;
        ctrl.isEditingAllowed = isEditingAllowed;
        ctrl.shareCloud = shareCloud;
        ctrl.isShared = isShared;

        /** The cloudID extracted from the URL route. */
        ctrl.cloud_id = $stateParams.cloud_id;

        ctrl.config = '';
        ctrl.isConfigLoaded = '[No data]';

        /** The target OpenStack marketing program to show capabilities for. */
        ctrl.target = 'platform';
        /** The schema version of the currently selected capabilities data. */
        ctrl.version = null;

        /** TODO: commonize it with other instances of this method */
        function getVersionList() {
            var content_url = refstackApiUrl + '/capabilities';
            ctrl.versionsRequest = $http.get(content_url).success(function(data) {
                ctrl.versionList = data.sort().reverse();
                ctrl.version = ctrl.versionList[0];
            }).error(function(error) {
                ctrl.showError = true;
                ctrl.error = 'Error retrieving version list: ' + JSON.stringify(error);
            });
        };

        /**
         * This will contact the Refstack API to get a listing of test run
         * results.
         */
        function getCloudDetail() {
            ctrl.showError = false;
            // Construct the API URL based on user-specified filters.
            var content_url = refstackApiUrl + '/clouds/' + ctrl.cloud_id;
            ctrl.cloudRequest = $http.get(content_url).success(function(data) {
                ctrl.cloudDetail = data;
                ctrl.getVersionList();
            }).error(function(error) {
                ctrl.showError = true;
                ctrl.resultsData = null;
                ctrl.error = 'Error retrieving results from server: ' + JSON.stringify(error);
            });
        };
        ctrl.getCloudDetail();

        ctrl.configFile = {
            change : function(f) {
                if (f.size > 1024 * 1024) {
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

        function updateConfig() {
            if (ctrl.config == '') {
                ctrl.showError = true;
                ctrl.error = 'Config is not loaded.';
                return;
            }
            var url = refstackApiUrl + "/clouds/" + ctrl.cloud_id + "/config";
            var data = {
                config : ctrl.config
            };
            $http.put(url, data).success(function(data) {
                raiseAlert('success', '', 'Config has updated!');
            }).error(function(error) {
                ctrl.showError = true;
                ctrl.error = 'Error updating cloud config: ' + JSON.stringify(error);
            });

            ctrl.config = '';
            ctrl.isConfigLoaded = '';
            angular.element(document.querySelector('#configFile')).val(null);
        };

        function run() {
            var brun = angular.element(document.querySelector('#brun'));
            var bstop = angular.element(document.querySelector('#bstop'));
            brun.css('display', 'none');
            var url = [refstackApiUrl, '/clouds/run', '?cloud_id=' + ctrl.cloud_id, '&version=' + ctrl.version, '&target=' + ctrl.target].join('');
            $http.get(url).success(function() {
                raiseAlert('success', '', 'Tests were run!');
                bstop.css('display', '');
            }).error(function(error) {
                raiseAlert('danger', error.title, error.detail);
                brun.css('display', '');
            });
        };

        function stop() {
            var brun = angular.element(document.querySelector('#brun'));
            var bstop = angular.element(document.querySelector('#bstop'));
            bstop.css('display', 'none');
            var url = [refstackApiUrl, '/clouds/stop', '?cloud_id=' + ctrl.cloud_id].join('');
            $http.get(url).success(function() {
                raiseAlert('success', '', 'Job is stopping. Please reload page.');
            }).error(function(error) {
                raiseAlert('danger', error.title, error.detail);
            });
        };

        function isEditingAllowed() {
            return Boolean(ctrl.cloudDetail && ctrl.cloudDetail.can_edit);
        };

        function isShared() {
            return Boolean(ctrl.cloudDetail && ctrl.cloudDetail.shared);
        };

        function shareCloud(shareState) {
            var content_url = [refstackApiUrl, '/clouds/', ctrl.cloud_id, '/shared'].join('');
            ctrl.shareRequest = $http.post(content_url, shareState.toString()).success(function() {
                ctrl.cloudDetail.shared = shareState;
                raiseAlert('success', '', 'Cloud share option changed!');
            }).error(function(error) {
                raiseAlert('danger', error.title, error.detail);
            });
        };
    }

})();
