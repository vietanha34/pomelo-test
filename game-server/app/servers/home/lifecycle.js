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
  cb();
};

module.exports.afterStartAll = function (app) {
  app.set('maintenance', false);
  app.get('statusService').clean();
  app.get('waitingService').clean();
};
