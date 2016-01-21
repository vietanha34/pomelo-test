/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');

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
 * * ip :
 *
 * @event
 * @param app
 * @param type
 * @param param
 */

module.exports.process = function (app, type, param) {
  if (param.resume || !param.uid) return;
  var getIpService = pomelo.app.get('geoIpService');
  getIpService
    .geoIp({ip: param.ip}, function (err, location) {
      if (location) {
        var json = utils.JSONParse(location, {});
        if (json.ec === 0) {
          pomelo.app.get('redisInfo')
            .hset(redisKeyUtil.getPlayerInfoKey(param.uid), 'location', json.data.COUNTRY_ALPHA2_CODE || 'XX')
        }
      }
    })
};
