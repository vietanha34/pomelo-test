/**
 * Created by vietanha34 on 7/3/14.
 */
var lodash = require('lodash');
var utils = require('../../util/utils');
var util = require('util');
var Promise = require('bluebird');

module.exports.beforeStartup = function (app, cb) {
  cb();
};


module.exports.afterStartup = function (app, cb) {
  cb();
};

module.exports.beforeShutdown = function (app, cb) {
  console.log('finish shutdown');
  var mysqlClient = app.get('mysqlClient');
  Promise.delay(0)
    .then(function () {
      return [
        mysqlClient
          .TourHistory
          .drop(),
        mysqlClient
          .TourSchedule.drop(),
      mysqlClient
        .TourProfile
        .drop(),
      mysqlClient
        .TourGroup
        .drop(),
      mysqlClient
        .TourTable
        .drop(),
        mysqlClient.TourPrize.drop(),
        mysqlClient.TourTableConfig.drop()
      ]
    })
    .then(function () {
      return mysqlClient
        .TourRound
        .drop()
    })
    .then(function () {
      return mysqlClient
        .Tournament
        .drop();
    })
    .then(function () {
      utils.invokeCallback(cb);
    })
    .catch(function (err) {
      console.error('dropTable err : ', err);
      return utils.invokeCallback(cb);
    })

};

module.exports.afterStartAll = function (app) {
  app.set('maintenance', false);
  app.get('statusService').clean();
  app.get('waitingService').clean();
};
