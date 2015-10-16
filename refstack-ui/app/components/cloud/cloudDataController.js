var refstackApp = angular.module('refstackApp');

/**
 * Refstack Cloud Controller
 * This controller is for the '/cloud' page where a user can do something
 * with the cloud.
 */
refstackApp.controller('cloudDataController',
    ['$scope', '$http', '$stateParams', 'refstackApiUrl', 'raiseAlert',
     function ($scope, $http, $stateParams, refstackApiUrl, raiseAlert) {
         'use strict';

         $scope.cloud_id = $stateParams.cloud_id;
         $scope.data_type = $stateParams.data_type;

         $scope.data = '';
         $scope.needFullLink = false;

         $scope.getCloudData = function(partial) {
             var url = refstackApiUrl + "/clouds/"
                       + $scope.cloud_id + "/"
                       + $scope.data_type 
                       + "?line_count=" + (partial ? 50 : 0);
             $http.get(url).success(function (data) {
                 $scope.data = data.data;
                 $scope.needFullLink = data.partial ? true : false;
             }).error(function (error) {
                 raiseAlert('danger',
                     error.title, error.detail);
             });
         };
         $scope.getCloudData($stateParams.partial);
     }]
);
