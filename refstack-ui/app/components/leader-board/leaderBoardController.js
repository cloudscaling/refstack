var refstackApp = angular.module('refstackApp');

/**
 * Refstack Leader Board Controller
 * This controller is for the '/leaderBoard' page where a user can browse
 * a listing of shared clouds.
 */
refstackApp.controller('leaderBoardController',
    ['$scope', '$http', '$state', 'refstackApiUrl', 'raiseAlert',
     function ($scope, $http, $state, refstackApiUrl, raiseAlert) {
         'use strict';

         $scope.currentPage = 1;
         $scope.itemsPerPage = 20;
         $scope.maxSize = 5;

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
             var content_url = refstackApiUrl + '/leaderBoard'
                               + '?page=' + $scope.currentPage
                               + '&version=' + $scope.version
                               + '&target=' + $scope.target;
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
     }]
);
