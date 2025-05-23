/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var consts = require('../../consts/consts');
var UserDao = require('../../dao/userDao');
var ItemDao = require('../../dao/itemDao');
var NotifyDao = require('../../dao/notifyDao');
var HomeDao = require('../../dao/homeDao');
var DailyDao = require('../../dao/dailyDao');
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

  var fs = require('fs');
  fs.appendFile("/home/anhlv/cothu/source/game-server/logs/logLogin.log", JSON.stringify(param) + '\n', function(err) {
    if(err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });
  var theMoment = moment();
  var startOfDay = moment().startOf('day').unix();
  var startOfWeek = moment().startOf('isoweek').unix();

  UserDao.getUserProperties(param.uid, ['lastLogin', 'username'])
    .then(function(user) {
      var opts = {
        appId: consts.PR_ID,
        register: 0,
        deviceId: param.deviceId,
        deviceToken: param.deviceToken || '',
        uid: param.uid,
        username: user.username || '',
        dtId: param.dtId || 1,
        platform: (isNaN(param.platform) ? param.platform : (consts.PLATFORM_UNMAP[param.platform] || 'ios')),
        platformRaw: param.platform
      };

      pomelo.app.get('redisService')
        .publish(redisKeyUtil.getSubscriberChannel(), JSON.stringify(opts), function (err, res) {
          if (err) {
            console.error(err, res);
          }
          opts = null;
        });

      user.lastLogin = user.lastLogin ? moment(user.lastLogin).unix() : 1;
      UserDao.updateProperties(param.uid, {lastLogin: theMoment.format('YYYY-MM-DD HH:mm:ss')});
      if (!user.lastLogin || user.lastLogin >= startOfDay) return;

      var userKey = redisKeyUtil.getPlayerInfoKey(param.uid);
      var multi = pomelo.app.get('redisInfo').multi();
      multi.hdel([userKey, 'dailyReceived', 'todaySms', 'todayCard', 'todayPromotion', 'adsCount']);

      if (user.lastLogin <= startOfWeek)
        multi.hset(userKey, 'loginCount', '1');
      else
        multi.hincrby(userKey, 'loginCount', 1);

      multi.exec(function(e) {
        if (e) {
          console.error(e.stack || e);
          utils.log(e.stack || e);
        }
        else {
          setTimeout(function() {
            pomelo.app.get('redisCache').getAsync(redisKeyUtil.getIsReviewVersion(param.version))
              .then(function(isReview) {
                if (isReview) {
                  DailyDao.getGold(param.uid)
                    .then(function(result) {
                      HomeDao.pushInfo(param.uid, {userInfo: {gold: result.gold, dailyReceived: 1}});
                    });
                }
              });
          }, 3000);
        }
      });

      ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.SUA_THOI_GIAN, (3 * 60));
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });
};
