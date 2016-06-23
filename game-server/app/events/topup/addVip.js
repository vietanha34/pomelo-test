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
var ItemDao = require('../../dao/itemDao');
var NotifyDao = require('../../dao/notifyDao');

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
  return UserDao.getUserProperties(param.uid, ['vipPoint', 'hasPay'])
    .then(function(user) {
      if (!user.hasPay) {
        ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.THE_VIP, (3*1440));
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: 'Tặng thẻ VIP',
          msg: 'Chúc mừng bạn được tặng thẻ VIP bạc trong 3 ngày',
          buttonLabel: 'OK',
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [param.uid],
          image:  consts.NOTIFY.IMAGE.AWARD
        });
      }
      var userId = param.uid;
      // update user info
      user.hasPay = 1;
      user.vipPoint += formula.calVipPointByMoney((param.currency == 'VND' ? param.money : param.money*22000));
      var vipPoint = user.vipPoint;
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
      TopDao.updateVip({uid: param.uid, update: updateParams});
      return app.get('statusService').getSidsByUid(param.uid, function (err, list) {
        if (list && list.length > 0){
          pomelo.app.get('backendSessionService').getByUid(list[0], userId, function (err, backendService) {
            if (backendService && backendService.length > 0){
              var session = backendService[0];
              session.set('vipPoint', vipPoint);
              session.push('vipPoint');
            }
          })
        }
      })
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(cb, e.stack || e);
    });
};
