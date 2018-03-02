/**
 * Created by vietanha34 on 7/3/14.
 */

var utils = require('../../util/utils');
var util = require('util');


module.exports.afterStartup = function (app, cb) {
  // do some operations after application start up
  // var game = app.game;
  setTimeout(function (game) {
    // game.start();
  }, 2000, app.game);
  cb();
};

module.exports.beforeShutdown = function (app, cb) {
  // do some operations before application shutdown down
  var game = app.game;
  if (game) {
    game.stop();
  }
  cb()
};

