/**
 * Created by KienDT on 11/25/14.
 */

var utils = require('../../../util/utils');

module.exports = function (app) {
  return new EventRemote(app);
};

var EventRemote = function (app) {
  this.app = app;
};

EventRemote.prototype.emit = function (type, params, cb) {
  utils.invokeCallback(cb);
  console.log('emit : ', type, params);
  this.app.get('eventService').emitter.emit(type, params);
};