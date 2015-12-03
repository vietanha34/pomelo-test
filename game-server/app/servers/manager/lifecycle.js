/**
 * Created by vietanha34 on 7/3/14.
 */
var lodash = require('lodash');
var utils = require('../../util/utils');
var util = require('util');
var DailyDao = require('../../dao/dailyDao');
var PaymentDao = require('../../dao/paymentDao');
var RabbitService = require('../../services/rabbitService');

module.exports.beforeStartup = function (app, cb) {
  cb();
};

module.exports.afterStartup = function (app, cb) {
  //if (app.get('env') !== 'development') {
    var rabbitService = new RabbitService();
    rabbitService.run();
  //}
  cb();
};

module.exports.beforeShutdown = function (app, cb) {
  cb();
};

module.exports.afterStartAll = function (app) {
};
