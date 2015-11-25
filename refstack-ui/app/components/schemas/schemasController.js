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
        .controller('SchemasController', SchemasController);

    SchemasController.$inject = [
        '$http', '$state', 'refstackApiUrl', 'raiseAlert'
    ];

    /**
     * RefStack Schemas Controller
     */
    function SchemasController($http, $state, refstackApiUrl, raiseAlert) {

        var ctrl = this;
        
        ctrl.update = update;
        ctrl.addSchema = addSchema;
        ctrl.deleteSchema = deleteSchema;

        ctrl.currentPage = 1;
        ctrl.itemsPerPage = 20;
        ctrl.maxSize = 5;
        ctrl.description = '';
        ctrl.url = '';

        /**
         * This will contact the Refstack API to get a listing of test run
         * results.
         */
        function update() {
            ctrl.showError = false;
            // Construct the API URL based on user-specified filters.
            var content_url = refstackApiUrl + '/schemas?page=' +
                ctrl.currentPage;
            ctrl.schemasRequest =
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
                        'Error retrieving schemas listing from server: ' +
                        angular.toJson(error);
                });
        };
        ctrl.update();

        function addSchema() {
            if (ctrl.description === "" || ctrl.url === "") {
                ctrl.showError = true;
                ctrl.error = 'Both fields should not be empty.';
                return;
            }

            var url = refstackApiUrl + '/schemas';
            var data = {
                description: ctrl.description,
                url: ctrl.url
            };
            $http.post(url, data).success(function (data) {
                ctrl.update();
            }).error(function (error) {
                ctrl.showError = true;
                ctrl.error =
                    'Error adding new schema: ' +
                    JSON.stringify(error);
            });

            ctrl.description = '';
            ctrl.url = '';
        };

        function deleteSchema(schema) {
            var content_url = [
                refstackApiUrl, '/schemas/', schema.schema_id
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
