/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var consts = require('../../consts/consts');
var code = require('../../consts/code');
var TopupDao = require('../../dao/topupDao');
var ItemDao = require('../../dao/itemDao');
var NotifyDao = require('../../dao/notifyDao');

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
  utils.log('REGISTER', param);
  if (!param.uid || !param.username) {
    console.error('wrong param register: ', param);
    return;
  }

  param.ip = param.ip || 'ip';
  param.deviceId = param.deviceId || 'deviceId';

  var mysql = pomelo.app.get('mysqlClient');

  var query = 'SELECT COUNT(uid) AS `count` FROM ' +
                '(SELECT uid FROM UserDevice WHERE deviceId = :deviceId ' +
                  'UNION ' +
                'SELECT uid FROM UserDevice WHERE ip = :ip) T';

  mysql.sequelize
    .query(query, {
      replacements: {ip: param.ip, deviceId: param.deviceId},
      type: mysql.sequelize.QueryTypes.SELECT,
      raw: true
    })
    .then(function(user) {
      var userCount = (user && user[0]) ? (user[0].count) : 0;
      userCount = (param.ip == '113.190.242.3' || param.ip == '42.115.210.229') ? 1 : (userCount + 1);

      var Achievement = mysql.Achievement;
      Achievement
        .create({
          uid: param.uid,
          username: param.username,
          userCount: userCount
        })
        .catch(function(e) {
          console.error(e.stack || e);
        });

      mysql.sequelize.query('INSERT INTO UserDevice VALUES(:uid, :deviceId, :ip)', {
        replacements: {uid: param.uid, ip: param.ip, deviceId: param.deviceId},
        type: mysql.sequelize.QueryTypes.INSERT,
        raw: true
      });

      if (userCount <= 3) {
        var globalConfig = app.get('configService').getConfig();

        if (!globalConfig.IS_REVIEW) {
          var bonus = 0;
          if (userCount == 1) {
            switch (param.type) {
              case (consts.ACCOUNT_TYPE.ACCOUNT_TYPE_FBUSER):
                bonus = globalConfig.FB_GOLD || 0;
                break;
              case (consts.ACCOUNT_TYPE.ACCOUNT_TYPE_USER):
                bonus = globalConfig.USER_GOLD || 0;
                break;
              default :
                bonus = globalConfig.USER_GOLD || 0;
                break;
            }
          }
          else if (
            param.platform == consts.PLATFORM_ENUM.IOS || param.platform == consts.PLATFORM_ENUM.WINDOWPHONE ||
            param.platform == 'ios' || param.platform == 'windowphone') {
            if (userCount == 2) bonus = 3000;
            else if (userCount == 3) bonus = 1000;
          }

          if (bonus) {
            setTimeout(function () {
              ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.SUA_THOI_GIAN, (7 * 1440));
              ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.VE_PHONG_THUONG, (7 * 1440));
              //ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.LUAN_CO, (14 * 1440));
              TopupDao.pushGoldAward({
                uid: param.uid,
                type: 'REGISTER',
                gold: bonus,
                msg: [code.REGISTER_LANGUAGE.BONUS, bonus.toString()],
                title: code.REGISTER_LANGUAGE.BONUS_TITLE
              })
            }, 2500);
          }
          else {
            setTimeout(function () {
              ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.SUA_THOI_GIAN, (7 * 1440));
              ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.VE_PHONG_THUONG, (7 * 1440));
              //ItemDao.donateItem(param.uid, consts.ITEM_EFFECT.LUAN_CO, (14 * 1440));
              NotifyDao.push({
                type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
                title: code.REGISTER_LANGUAGE.BONUS_TITLE,
                msg: 'Bạn được tặng 1 tuần sử dụng miễn phí vé phòng thường và vật phẩm sửa thời gian',
                buttonLabel: 'OK',
                command: {target: consts.NOTIFY.TARGET.NORMAL},
                scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
                users: [param.uid],
                image:  consts.NOTIFY.IMAGE.AWARD
              });
            }, 2500);
          }
        }
      }
    });

  var opts = {
    appId: consts.PR_ID,
    register: 1,
    deviceId: param.deviceId,
    deviceToken: param.deviceToken || '',
    uid: param.uid,
    username: param.username,
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
};
