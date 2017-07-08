/**
 * Created by vietanha34 on 7/3/14.
 */
var lodash = require('lodash');
var utils = require('../../util/utils');
var util = require('util');

module.exports.beforeStartup = function (app, cb) {
  cb();
};


module.exports.afterStartup = function (app, cb) {
  console.error('afterStartup');
  cb();
};

module.exports.beforeShutdown = function (app, cb) {
  utils.invokeCallback(cb);
};

module.exports.afterStartAll = function (app) {
  app.get('tourManager').init();
};
