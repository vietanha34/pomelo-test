/**
 * Created by bi on 5/8/15.
 */


var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var userDao = require('../../dao/userDao');

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
  var uid = param.uid || 0;
  if (!uid) return false;
  var mysqlClient = pomelo.app.get('mysqlClient');
	pomelo
		.app
		.get('redisCache')
		.HINCRBY(redisKeyUtil.getPromotionKey(uid), 'hasPay', 1, function (err, count) {
			utils.print(err);
			if (count == 1) {
				userDao.updateProperties(uid, {hasPay: 1});
			}
		});
  mysqlClient
    .AccUserDetail
    .update({
      topup : mysqlClient.sequelize.literal(' topup + ' + param.gold)
    }, {
      where : {
        uid : uid
      }
    })
};