/**
 * Created by vietanha34 on 7/3/14.
 */
var util = require('util');
var utils = require('../../util/utils');

module.exports.beforeStartup = function (app, cb) {
  // do some operations before application start up
  cb();
};


module.exports.afterStartup = function (app, cb) {
  // do some operations after application start up
  cb()
};

module.exports.beforeShutdown = function (app, cb) {
  // do some operations before application shutdown down
  cb();
};

module.exports.afterStartAll = function (app) {
  // do some operations after all applications start up
  //app.get('boardService').clean();
  app.set('maintenance', null);
};
