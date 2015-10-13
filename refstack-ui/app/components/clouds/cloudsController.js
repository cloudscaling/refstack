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

         /** The target OpenStack marketing program to show capabilities for. */
         $scope.target = 'platform';
         /** The schema version of the currently selected capabilities data. */
         $scope.version = null;

         /** TODO: commonize it with other instances of this method */
         $scope.getVersionList = function () {
             var content_url = refstackApiUrl + '/capabilities';
             $scope.versionsRequest =
                 $http.get(content_url).success(function (data) {
                     $scope.versionList = data.sort().reverse();
                     $scope.version = $scope.versionList[0];
                     $scope.update();
                 }).error(function (error) {
                     $scope.showError = true;
                     $scope.error = 'Error retrieving version list: ' +
                         JSON.stringify(error);
                 });
         };
         $scope.getVersionList();

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

         $scope.run = function (cloud) {
             var brun = angular.element(document.querySelector('#brun' + cloud.cloud_id));
             var bstop = angular.element(document.querySelector('#bstop' + cloud.cloud_id));
             brun.css('display', 'none');
             var url = [
                 refstackApiUrl, '/clouds/run',
                 '?cloud_id=' + cloud.cloud_id,
                 '&version=' + $scope.version,
                 '&target=' + $scope.target
             ].join('');
             $http.get(url).success(function () {
                 raiseAlert('success', '', 'Tests were run!');
                 bstop.css('display', '');
             }).error(function (error) {
                 raiseAlert('danger',
                     error.title, error.detail);
                 brun.css('display', '');
             });
         };

         $scope.stop = function (cloud) {
             var brun = angular.element(document.querySelector('#brun' + cloud.cloud_id));
             var bstop = angular.element(document.querySelector('#bstop' + cloud.cloud_id));
             bstop.css('display', 'none');
             var url = [
                 refstackApiUrl, '/clouds/stop',
                 '?cloud_id=' + cloud.cloud_id
             ].join('');
             $http.get(url).success(function () {
                 raiseAlert('success', '', 'Job is stopping. Please reload page.');
             }).error(function (error) {
                 raiseAlert('danger',
                     error.title, error.detail);
             });
         };
     }]
);
