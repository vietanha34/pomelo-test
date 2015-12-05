/**
 * Created by bi on 5/8/15.
 */


var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var formula = require('../../consts/formula');
var consts = require('../../consts/consts');
var UserDao = require('../../dao/userDao');
var TopDao = require('../../dao/topDao');

module.exports.type = Config.TYPE.TOPUP;

/**
 * Event Gửi về khi phát sinh 1 giao dịch
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 * * uid: định dang user
 * * topupType: CARD: 1, IAP: 3, Banking 4
 * * money: số tiền thật (VNĐ)
 * * gold: số tiền ảo cộng vào game
 *
 * @event
 * @param {Object} app
 * @param {Number} type
 * @param {Object} param
 */

module.exports.process = function (app, type, param) {
  utils.log('TOPUP',param);
  return UserDao.getUserProperties(param.uid, ['vipPoint'])
    .then(function(user) {

      // update user info
      user.hasPay = 1;
      user.vipPoint += formula.calVipPointByMoney(param.money);
      UserDao.updateProperties(param.uid, user);

      // increase daily topup
      var attr = '';
      if (param.topupType == consts.TOPUP_TYPE.SMS) attr = 'todaySms';
      else if (param.topupType == consts.TOPUP_TYPE.CARD) attr = 'todayCard';
      if (attr) pomelo.app.get('redisInfo').hincrby(redisKeyUtil.getPlayerInfoKey(param.uid), attr, 1);

      // update BXH
      var updateParams = {
        gold: param.gold,
        vipPoint: user.vipPoint
      };
      return TopDao.updateVip({uid: param.uid, update: updateParams});
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};