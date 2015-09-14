/**
 * Created by vietanha34 on 10/27/14.
 */

var Code = require('../../../consts/code');
var userDao = require('../../../dao/userDao');
var async = require('async');
var redisKeyUtil = require("../../../util/redisKeyUtil");
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger(__filename);
var consts = require('../../../consts/consts');
var lodash = require('lodash');


module.exports = function (app) {
  return new Handler(app)
};

Handler = function (app) {
  this.app = app;
};

var pro = Handler.prototype;


pro.getUserHistory = function (msg, session, next) {
  var uid = session.uid;
  var opts = {
    uid: uid,
    offset: msg.offset,
    length: msg.length
  };
  this.app.get('topService').getUserHistory(opts, function (err, res) {
    if (err) {
      next(null, {ec: Code.FAIL});
    }
    else {
      next(null, {data: res});
    }
  })
};

pro.getGameLog = function (msg, session, next) {
  var matchId = msg.matchId;
  this.app.get('topService').getGameLog(matchId, function (err, res) {
    if (err) {
      next(null, {ec: Code.FAIL});
    }
    else {
      next(null, res);
    }
  })
};
