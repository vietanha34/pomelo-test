/**
 * Created by vietanha34 on 9/23/15.
 */

var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var Code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var regexValidUtil = require('../util/regexValid');
var lodash = require('lodash');
var NewsDao = module.exports;

NewsDao.getNumNewsUnreadByUserId = function (uid, cb) {
  return utils.invokeCallback(cb, null, 0);
};
