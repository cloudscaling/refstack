var refstackApp = angular.module('refstackApp');

/**
 * Refstack Cloud Controller
 * This controller is for the '/cloud' page where a user can do something
 * with the cloud.
 */
refstackApp.controller('cloudController',
    ['$scope', '$http', '$stateParams', 'refstackApiUrl', 'raiseAlert',
     function ($scope, $http, $stateParams, refstackApiUrl, raiseAlert) {
         'use strict';

         /** The cloudID extracted from the URL route. */
         $scope.cloud_id = $stateParams.cloud_id;

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
                 }).error(function (error) {
                     $scope.showError = true;
                     $scope.error = 'Error retrieving version list: ' +
                         JSON.stringify(error);
                 });
         };

         /**
          * This will contact the Refstack API to get a listing of test run
          * results.
          */
         $scope.getCloudDetail = function () {
             $scope.showError = false;
             // Construct the API URL based on user-specified filters.
             var content_url = refstackApiUrl + '/clouds/' + $scope.cloud_id;
             $scope.cloudRequest =
                 $http.get(content_url).success(function (data) {
                     $scope.cloudDetail = data;
                     $scope.getVersionList();
                 }).error(function (error) {
                     $scope.showError = true;
                     $scope.resultsData = null;
                     $scope.error = 'Error retrieving results from server: ' +
                         JSON.stringify(error);
                 });
         };
         $scope.getCloudDetail();

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

         $scope.updateConfig = function() {
             if ($scope.config == '') {
                 $scope.showError = true;
                 $scope.error = 'Config is not loaded.';
                 return;
             }
             var url = refstackApiUrl + "/clouds/config";
             var data = {
                 cloud_id: $scope.cloud_id,
                 config: $scope.config
             };
             $http.put(url, data).success(function (data) {
                 raiseAlert('success', '', 'Config has updated!');
             }).error(function (error) {
                 $scope.showError = true;
                 $scope.error =
                     'Error updating cloud config: ' +
                     JSON.stringify(error);
             });

             $scope.config = '';
             $scope.isConfigLoaded = '';
             angular.element(document.querySelector('#configFile')).val(null);
         };

         $scope.run = function () {
             var brun = angular.element(document.querySelector('#brun'));
             var bstop = angular.element(document.querySelector('#bstop'));
             brun.css('display', 'none');
             var url = [
                 refstackApiUrl, '/clouds/run',
                 '?cloud_id=' + $scope.cloud_id,
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

         $scope.stop = function () {
             var brun = angular.element(document.querySelector('#brun'));
             var bstop = angular.element(document.querySelector('#bstop'));
             bstop.css('display', 'none');
             var url = [
                 refstackApiUrl, '/clouds/stop',
                 '?cloud_id=' + $scope.cloud_id
             ].join('');
             $http.get(url).success(function () {
                 raiseAlert('success', '', 'Job is stopping. Please reload page.');
             }).error(function (error) {
                 raiseAlert('danger',
                     error.title, error.detail);
             });
         };

         $scope.isEditingAllowed = function () {
             return Boolean($scope.cloudDetail &&
                 $scope.cloudDetail.can_edit);
         };
     }]
);
