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

  var globalConfig = pomelo.app.get('configService').getConfig();

  if (globalConfig.IS_REVIEW) {
    setTimeout(function () {
      NotifyDao.push({
        type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
        title: 'Chào mừng!',
        msg: 'Chào mừng bạn đã đến Cờ Thủ phiên bản mới!',
        buttonLabel: 'OK',
        command: {target: consts.NOTIFY.TARGET.NORMAL},
        scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
        users: [param.uid],
        image: {id: 0}
      });
    }, 3000);
  }

  var userNotifyKey = redisKeyUtil.getUserNotifyKey(param.uid);
  var redisCache = pomelo.app.get('redisCache');
  redisCache
    .hgetallAsync(userNotifyKey)
    .then(function(notify) {
      if (!notify) return;
      var keys = Object.keys(notify);
      var notifyObj;
      for (var i=0; i<keys.length; i++) {
        notifyObj = utils.JSONParse(notify[keys[i]], null);
        if (notifyObj) {
          return NotifyDao.push({
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: notifyObj.title || '',
            msg: notifyObj.msg || '',
            buttonLabel: 'Nhận',
            command: {target: consts.NOTIFY.TARGET.GET_GOLD, extra: keys[i]},
            scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
            users: [param.uid],
            image:  consts.NOTIFY.IMAGE.GOLD
          });
        }
      }
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });

  // push from CMS
  setTimeout(function(){
    redisCache.hgetall('cothu:pushOnline', function(e, notify) {
      if (!e && notify) {
        var keys = Object.keys(notify);
        var notifyObj;
        var pushObj;
        var del = ['cothu:pushOnline'];
        var now = Date.now()/1000|0;
        for (var i=0; i<keys.length; i++) {
          notifyObj = utils.JSONParse(notify[keys[i]], null);
          if (notifyObj && notifyObj.startTime <= now && notifyObj.endTime >= now
            && (notifyObj.scope == consts.NOTIFY.SCOPE.ALL || notifyObj.users.indexOf(param.uid)>=0)) {
            pushObj = {
              type: Number(notifyObj.type)||0,
              title: utils.JSONParse(notifyObj.title, {vi: ''}).vi,
              msg: utils.JSONParse(notifyObj.msg, {vi: ''}).vi || '',
              buttonLabel: utils.JSONParse(notifyObj.buttonLabel, {vi: 'OK', en: 'OK'}),
              buttonColor: Number(notifyObj.buttonColor) || 0,
              command: utils.JSONParse(notifyObj.command, {target: 0}),
              scope: consts.NOTIFY.SCOPE.USER,
              users: [param.uid],
              image: consts.NOTIFY.IMAGE.NORMAL
            };
            NotifyDao.push(pushObj, function (e, reply) {
              if (e) console.error(e.stack || e);
            });
          }
          else if (!notifyObj || notifyObj.endTime < now) {
            del.push(keys[i]);
          }
        }

        if (del.length >= 2) redisCache.hdel(del, function(e, reply) {});
      }
    });
  }, 4000);
};
