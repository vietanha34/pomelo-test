/**
 * Created by vietanha34 on 9/23/15.
 */

var pomelo = require('pomelo');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var Code = require('../consts/code');
var Promise = require('bluebird');
var redisKeyUtil = require('../util/redisKeyUtil');
var lodash = require('lodash');
var ItemDao = module.exports;

/**
 *
 * @param uid
 * @param categoryId
 * @param cb
 */
ItemDao.getShop = function getShop(uid, categoryId, cb) {
  if (!uid || !categoryId) {
    return utils.invokeCallback(cb, null, 'invalid params get shop');
  }


};
