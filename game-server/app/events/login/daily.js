/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var consts = require('../../consts/consts');
var UserDao = require('../../dao/userDao');
var moment = require('moment');

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

  var theMoment = moment();
  var startOfDay = theMoment.startOf('hour').unix(); // todo day
  var startOfWeek = theMoment.startOf('day').unix(); // todo isoweek
  var now = theMoment.unix();

  UserDao.getUserProperties(param.uid, ['lastLogin'])
    .then(function(user) {
      UserDao.updateProperties(param.uid, {lastLogin: now});
      if (!user.lastLogin || user.lastLogin >= startOfDay) return;

      var userKey = redisKeyUtil.getPlayerInfoKey(param.uid);
      var multi = pomelo.app.get('redisInfo').multi();
      multi.hdel([userKey, 'dailyReceived', 'todaySms', 'todaySms']);

      if (user.lastLogin <= startOfWeek)
        multi.hset(userKey, 'loginCount', '1');
      else
        multi.hincrby(userKey, 'loginCount', 1);

      multi.exec();
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });
};
