/**
 * Created by vietanha34 on 7/3/14.
 */
var lodash = require('lodash');
var utils = require('../../util/utils');
var util = require('util');
var DailyDao = require('../../dao/dailyDao');
var PaymentDao = require('../../dao/paymentDao');

module.exports.beforeStartup = function (app, cb) {
  cb();
};

module.exports.afterStartup = function (app, cb) {
  var httpServer = app.get('httpServer');
  if (httpServer) {
    httpServer.start(cb);
  }

  DailyDao.loadConfig();
  PaymentDao.loadConfig();
};

module.exports.beforeShutdown = function (app, cb) {
  var httpServer = app.get('httpServer');
  if (httpServer) {
    httpServer.stop(cb);
  }
};

module.exports.afterStartAll = function (app) {
};
