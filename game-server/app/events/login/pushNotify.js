/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var consts = require('../../consts/consts');
var HomeDao = require('../../dao/homeDao');
var NotifyDao = require('../../dao/notifyDao');

module.exports.type = Config.TYPE.LOGIN;

/**
 * Event Gửi về khi có người chơi login vào trò chơi
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 *
 * * uid : đinh danh người chơi
 * * username : tài khoản người chơi
 * * platform : platform
 * * deviceId : định danh device
 * * deviceToken : token để push offline
 *
 * @event
 * @param app
 * @param type
 * @param param
 */

module.exports.process = function (app, type, param) {
  if (param.resume || !param.uid) return;

  //setTimeout(function(){
  //  NotifyDao.push({
  //    type: consts.NOTIFY.TYPE.MARQUEE,
  //    title: 'Chào mừng!',
  //    msg: 'Chào mừng bạn đã đến Cờ Thủ phiên bản mới, hấp dẫn hơn!',
  //    buttonLabel: '',
  //    command: {target: consts.NOTIFY.TARGET.NORMAL},
  //    scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
  //    users: [param.uid],
  //    image:  {id: 0}
  //  });
  //}, 3000);
};
