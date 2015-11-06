/**
 * Created by vietanha34 on 7/13/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var ProfileDao = require('../../dao/profileDao');

module.exports.type = Config.TYPE.LOGIN;

/**
 * Event Gửi về khi có người chơi thoát game vào trò chơi
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 *
 * * uid : đinh danh người chơi
 * * username : tài khoản người chơi
 * * playTime : thời gian chơi game, tính bằng giây
 * * boardId : Định danh của bàn chơi hiện đang chơi
 * * ip : Đia chỉ ip đang sử dụng
 *
 * @event
 * @param app
 * @param type
 * @param param
 */
module.exports.process = function (app, type, param) {
  if (param.resume || !param.uid) return;

  ProfileDao.updateUser(param);
};
