var refstackApp = angular.module('refstackApp');

/**
 * Refstack Clouds Controller
 * This controller is for the '/clouds' page where a user can browse
 * a listing of user registred clouds.
 */
refstackApp.controller('cloudsController',
    ['$scope', '$http', '$state', 'refstackApiUrl', 'raiseAlert',
     function ($scope, $http, $state, refstackApiUrl, raiseAlert) {
         'use strict';

         $scope.currentPage = 1;
         $scope.itemsPerPage = 20;
         $scope.maxSize = 5;
         $scope.name = '';
         $scope.description = '';
         $scope.config = '';
         $scope.isConfigLoaded = '[No data]';

         /**
          * This will contact the Refstack API to get a listing of test run
          * results.
          */
         $scope.update = function () {
             $scope.showError = false;
             // Construct the API URL based on user-specified filters.
             var content_url = refstackApiUrl + '/clouds?page=' +
                 $scope.currentPage;
             $scope.cloudsRequest =
                 $http.get(content_url).success(function (data) {
                     $scope.data = data;
                     $scope.totalItems = $scope.data.pagination.total_pages *
                         $scope.itemsPerPage;
                     $scope.currentPage = $scope.data.pagination.current_page;
                 }).error(function (error) {
                     $scope.data = null;
                     $scope.totalItems = 0;
                     $scope.showError = true;
                     $scope.error =
                         'Error retrieving clouds listing from server: ' +
                         JSON.stringify(error);
                 });
         };
         $scope.update();

         $scope.configFile = {
             change: function (f) {
                 if (f.size > 1024*1024) {
                     $scope.isConfigLoaded = '[Config is too big(more than 1Mb), please choose another one]';
                     return;
                 }

                 var r = new FileReader();
                 r.onloadend = function(e) {
                     var data = e.target.result;
                     $scope.config = data;
                     $scope.isConfigLoaded = '[Config loaded]';
                     $scope.$apply();
                 };
                 r.readAsText(f._file);
             }
         };

         $scope.addCloud = function() {
             var url = refstackApiUrl + '/clouds';
             var data = {
                 name: $scope.name,
                 description: $scope.description,
                 config: $scope.config
             };
             $http.post(url, data).success(function (data) {
                 $scope.update();
             }).error(function (error) {
                 $scope.showError = true;
                 $scope.error =
                     'Error adding new cloud: ' +
                     JSON.stringify(error);
             });

             $scope.name = '';
             $scope.description = '';
             $scope.isConfigLoaded = '';
         };

         $scope.deleteCloud = function (cloud) {
             var content_url = [
                 refstackApiUrl, '/clouds/', cloud.cloud_id
             ].join('');
             $scope.deleteRequest =
                 $http.delete(content_url).success(function () {
                     $scope.update();
                 }).error(function (error) {
                     raiseAlert('danger',
                         error.title, error.detail);
                 });
         };
     }]
);
