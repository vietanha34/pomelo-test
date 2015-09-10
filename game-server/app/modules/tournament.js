/**
 * Created by vietanha34 on 3/9/15.
 */

var utils = require('../util/utils');
var pomelo = require('pomelo');
var lodash = require('lodash');
var Code = require('../consts/code');
var logger = require('pomelo-logger').getLogger(__filename);


module.exports = function (opts) {
  return new Module(opts);
};

module.exports.moduleId = 'tournament';

var Module = function (opts) {
  opts = opts || {};
  this.app = opts.app;
  this.type = opts.type || 'pull';
};

Module.prototype.monitorHandler = function (agent, msg, cb) {
  this.app.get('tourService').addCrons(msg.tourId);
  utils.invokeCallback(cb, null, { ec :Code.OK})
};

Module.prototype.masterHandler = function (agent, msg, cb) {
  agent.request('tournament-server-1', module.exports.moduleId, msg, cb);
};

Module.prototype.clientHandler = function (agent, msg, cb) {
  console.error('handler message : ', msg);
  var tourId = msg.tourId;
  if (tourId) {
    agent.notifyByType('tournament', module.exports.moduleId, msg);
  }
  utils.invokeCallback(cb, null, { ec :Code.OK})
};
