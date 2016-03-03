/**
 * Created by vietanha34 on 1/28/16.
 */


var async = require('async');
var utils = require('../../../util/utils');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var TopupDao = require('../../../dao/topupDao');
var Promise = require('bluebird');
var NotifyDao = require('../../../dao/notifyDao');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../../util/redisKeyUtil');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getAds = function (msg, session, next) {
  var platform = session.get('platform');
  if (platform === 'windowphone') platform = 'windowsphone';
  return pomelo
    .app
    .get('videoAdsService')
    .getAds({
      platform : platform
    })
    .then(function (data) {
      if (!data.ec){
        next(null, {data: JSON.stringify(data.data)});
      } else {
        next(null, {ec: Code.FAIL, msg : "Hiện tại không có video nào phù hợp với bạn"})
      }
    })
    .catch(function (err) {
      console.error(err);
      next(null, {ec : Code.FAIL, msg : "Hiện tại không có video nào phù hợp với bạn"})
    })
};

Handler.prototype.markAds = function (msg, session, next) {
  var platform = session.get('platform');
  var uid = session.uid;
  return pomelo.app.get('videoAdsService')
    .markAds({
      id : msg.id,
      status : msg.status
    })
    .then(function (data) {
      if (!data.ec) {
        var statusService = pomelo.app.get('statusService');
        return Promise.props({
          payment : TopupDao.topup({
            uid : uid,
            gold : 500,
            msg : "Xem video cộng tiền",
            type : consts.CHANGE_GOLD_TYPE.VIDEO_ADS
          }),
          status : Promise.promisify(statusService.getStatusByUid, {context : statusService})(uid, true)
        })
      } else {
        return Promise.reject({})
      }
    })
    .then(function (result) {
      if (!result.payment.ec){
        next(null, { notifyMsg : 'Cảm ơn bạn đã xem video. Chúc bạn chơi game vui vẻ'});
        if (result.status && result.status.board){
          pomelo.app.get('statusService')
            .pushByUids([uid], 'onChargeMoney', { uid : uid, deltaGold : 500 , gold : result.payment.gold});
        }else if (result.status && !result.status.board){
          NotifyDao.push({
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: 'Cộng tiền',
            msg: 'Bạn được cộng 500 gold nhờ xem video quảng cáo. Chúc bạn chơi game vui vẻ',
            buttonLabel: 'Ok',
            gold: result.payment.gold,
            command: {},
            scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
            users: [uid]
          })
        }
        pomelo.app.get('statusService')
          .pushByUids([uid], 'onEnableVideoAds', { enable : 0});
        pomelo.app.get('redisCache')
          .set(redisKeyUtil.getUserKeyVideoAds(uid), uid);
        pomelo.app.get('redisCache')
          .expire(redisKeyUtil.getUserKeyVideoAds(uid), 60 * 60);
      }
    })
    .catch(function (err) {
      console.error(err);
      next(null, {ec : Code.FAIL, msg : "Có lỗi xảy ra xin vui lòng thử lại"})
    })
};
