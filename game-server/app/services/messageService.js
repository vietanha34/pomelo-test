var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('poker', __filename);
var exp = module.exports;
var consts = require('../consts/consts');
var utils = require('../util/utils');
var lodash = require('lodash');
var Promise = require('bluebird');

exp.pushMessageByUids = function (uids, route, msg) {
  console.log('\n----PushMessage  to uid: %j ' +
  '\n ---- route : %s' +
  '\n ---- msg: %j', uids, route, msg);
  if (uids.length == 0) {
    return
  }
  pomelo.app.get('channelService').pushMessageByUids(route, msg, uids, errHandler);
};

exp.pushMessageToPlayer = function (uid, route, msg) {
  console.log('\n----PushMessage  to uid: %j ' +
    '\n ---- route : %s' +
    '\n ---- msg: %j', uid, route, msg);
  if (uid.sid) {
    exp.pushMessageByUids([uid], route, msg);
  }
};

function errHandler(err, fails) {
  if (!!err) {
    logger.error('Push Message error! %j', err.stack);
  }
}