/**
 * Created by vietanha34 on 5/11/16.
 */


var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var consts = require('../../consts/consts');
var ProfileDao = require('../../dao/profileDao');

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
 * * frontendId
 *
 * @event
 * @param app
 * @param type
 * @param param
 */

module.exports.process = function (app, type, param) {
  var role = consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER;
  pomelo.app.get('mysqlClient')
    .GuildMember
    .findOne({
      where :{
        uid : param.uid,
        role : {
          $lte : consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
        }
      },
      raw : true
    })
    .then(function (member) {
      if (member){
        role = member.role;
        return pomelo.app.get('mysqlClient')
          .Guild
          .findOne({
            where :{
              id : member.guildId
            },
            attributes: ['sIcon', 'id'],
            raw : true
          })
      }else {
        return Promise.reject();
      }
    })
    .then(function (guild) {
      console.log('guild : ', guild);
      if (guild){
        guild.role = role;
        pomelo.app.get('backendSessionService').getByUid(param.frontendId, param.uid, function (err, backendService) {
          if (backendService && backendService.length > 0){
            var session = backendService[0];
            session.set('guild', guild);
            session.pushAll();
          }
        })
      }
    })
};
