/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var consts = require('../../consts/consts');
var TopupDao = require('../../dao/topupDao');

module.exports.type = Config.TYPE.REGISTER;

/**
 * Event Gửi về khi có người chơi đăng kí vào trò chơi
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 *
 * * uid : đinh danh người chơi
 * * username : tên của người dùng
 * * platform : định danh của platform xem thêm tại ....
 * * deviceId : Định danh của thiết bị
 * * deviceToken : device token để push notification
 * * version : version của thiết bị
 * * ip : Địa chỉ ip khi đăng ký
 * * extraData : Thông tin thêm của người dùng đăng nhập từ bên thứ 3 như facebook, google
 * * deviceName : tên của thiết bị
 * * type : account type (xem thêm tại consts.ACCOUNT_TYPE)
 *
 * @event
 * @param app
 * @param type
 * @param param
 */
module.exports.process = function (app, type, param) {
  if (!param.uid || !param.username) {
    console.error('wrong param register: ', param);
    return;
  }

  //setTimeout(function(){
    //TopupDao.pushGoldAward({
    //  uid: param.uid,
    //  type: 'REGISTER',
    //  gold: 1000000,
    //  msg: 'Bạn được tặng 1000000 vàng khi vào chơi cờ thủ bản beta mới. Số vàng của bạn sẽ được reset khi ra mắt bản chính thức.',
    //  title: 'Tặng vàng tân thủ'
    //})
  //}, 2500);

  var Achievement = pomelo.app.get('mysqlClient').Achievement;
  Achievement
    .create({
      uid: param.uid,
      username: param.username,
      userCount: param.userCount||1
    })
    .catch(function(e) {
      console.error(e.stack || e);
    });
};