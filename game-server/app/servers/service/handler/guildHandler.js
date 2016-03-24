/**
 * Created by vietanha34 on 1/14/16.
 */

var async = require('async');
var utils = require('../../../util/utils');
var Code = require('../../../consts/code');
var pomelo = require('pomelo');
var Promise = require('bluebird');
var GuildDao = require('../../../dao/guildDao');
var RoomDao = require('../../../dao/roomChatDao');
var consts = require('../../../consts/consts');
var lodash = require('lodash');
var util = require('util');
var redisKeyUtil = require('../../../util/redisKeyUtil');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.createGuild = function (msg, session, next) {
  var uid = session.uid;
  GuildDao.createGuild(uid, msg)
    .then(function (result) {
      if (result && !result.ec){
        RoomDao.createRoom({
          roomId : redisKeyUtil.getChatGuildName(result.guildId),
          members : [session.uid]
        })
      }
      return next(null, result);
    })
    .catch(function (err) {
      next(null, { ec : err.ec || Code.FAIL, msg : err.msg || Code.FAIL});
    })
};

Handler.prototype.getGuild = function (msg, session, next) {
  GuildDao.getGuild(session.uid)
    .then(function (result) {
      return next(null, result)
    })
    .catch(function (err) {
      next(null, { ec : err.ec || Code.FAIL, msg : err.msg || Code.FAIL});
    })
};

Handler.prototype.getListGuild = function (msg, session, next) {
  GuildDao.getListGuild(msg)
    .then(function (result) {
      return next(null, result)
    })
    .catch(function (err) {
      next(null, { ec : err.ec || Code.FAIL, msg : err.msg || Code.FAIL});
    })
};

/**
 * Lấy thông tin chi tiết về guild
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getGuildResource = function (msg, session, next) {
  var uid = session.uid;
  var guildId = msg.guildId;
  var resourceId = msg.resourceId;
  resourceId.uid = uid;
  var member;
  var roleId;
  return getRole(uid, guildId)
    .then(function (user) {
      var role = 0;
      if (user){
        member = user;
        role = member.role;
        guildId = guildId || member.guildId;
      }
      resourceId.guildId = guildId;
      roleId = user || { guildId : guildId, role : 0};
      return getPermission(role, resourceId.id);
    })
    .then(function (permission) {
      console.log('permission : ', permission);
      return GuildDao.getResource(roleId, permission, resourceId);
    })
    .then(function (resource) {
      console.log('resource : ', resource);
      resource.isPopup = msg.isPopup;
      resource.guildId = guildId;
      return utils.invokeCallback(next, null, resource);
    })
};

Handler.prototype.updateGuild = function (msg, session, next) {
  var uid = session.uid;
  var member;
  var roleId;
  var guildId;
  return getRole(uid)
    .then(function (user) {
      console.log('members : ', user);
      var role = 0;
      if (user){
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user;
      return getPermission(role,1);
    })
    .then(function (permission) {
      console.log('permission : ', permission);
      msg.guildId = guildId;
      var updateData = {};
      updateData.guildId = guildId;
      if (msg.detail) updateData['detail'] = msg.detail;
      if (msg.icon) updateData['icon'] = JSON.stringify(msg.icon);
      return GuildDao.updateGuild(roleId, permission, updateData);
    })
    .then(function (resource) {
      resource = resource || {};
      resource.guildId = guildId;
      return utils.invokeCallback(next, null, resource);
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, { ec : Code.FAIL})
    })
};

/**
 * lấy danh sách các guild
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getListGuild = function (msg, session, next) {
  var offset = msg.offset || 0;
  var length = msg.length || 20;
  var sort = msg.sort || 1;
  var sortField = 'name';
  switch (sort) {
    case 1:
      sortField = 'name';
      break;
    case 2:
      sortField = 'fame';
      break;
    case 3:
      sortField = 'numMember';
      break;
    default:
      break;
  }
  GuildDao.getListGuild({
    offset: offset,
    length: length,
    sort: sortField,
    keyword : msg.keyword
  })
    .then(function (guilds) {
      return utils.invokeCallback(next, null, {data: guilds, sort : sort, offset: offset, length : length, keyword: msg.keyword})
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, { data : [], offset: 0, length: 0, keyword : msg.keyword});
    })
};


Handler.prototype.updateMember = function (msg, session, next) {
  var uid = session.uid;
  var member;
  var roleId;
  var guildId;
  var currentUid = msg.uid || uid;
  return getRole(uid)
    .then(function (user) {
      var role = 0;
      if (user){
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user;
      return getPermission(role,1);
    })
    .then(function (permission) {
      switch (msg.type){
        case consts.GUILD_UPDATE_MEMBER_TYPE.ADD_MEMBER:
          // add event
          return GuildDao.updateMember(currentUid, guildId, { role : consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER});
          break;
        case consts.GUILD_UPDATE_MEMBER_TYPE.REMOVE_MEMBER:
          return GuildDao.deleteMember(currentUid, guildId);
          break;
        case consts.GUILD_UPDATE_MEMBER_TYPE.UPGRADE_MEMBER:
        case consts.GUILD_UPDATE_MEMBER_TYPE.DOWNGRADE_MEMBER:
          return GuildDao.updateMember(currentUid, guildId, { role : msg.role});
          break;
        case consts.GUILD_UPDATE_MEMBER_TYPE.ABDICATE_MEMBER:
          break;
      }
      return GuildDao.updateMember(roleId, permission, msg);
    })
    .then(function (resource) {
      resource = resource || {};
      resource.guildId = guildId;
      if (resource && !resource.ec){
        switch(msg.type){
          case consts.GUILD_UPDATE_MEMBER_TYPE.ADD_MEMBER:
            GuildDao.addEvent({
              guildId : guildId,
              uid : session.uid,
              fullname: fullname,
              content: util.format('[%s] Xung quỹ hội %s gold', fullname, msg.gold),
              type: consts.GUILD_EVENT_TYPE.JOIN_GUILD
            });
            RoomDao.addMember(redisKeyUtil.getChatGuildName(guildId), [currentUid]);
            break;
          case consts.GUILD_UPDATE_MEMBER_TYPE.REMOVE_MEMBER:
            if (currentUid === uid){
              GuildDao.addEvent({
                guildId : guildId,
                uid : session.uid,
                fullname: fullname,
                content: util.format('[%s] Xung quỹ hội %s gold', fullname, msg.gold),
                type: consts.GUILD_EVENT_TYPE.LEAVE_GUILD
              });
            }else {

            }
            RoomDao.kickUser(redisKeyUtil.getChatGuildName(guildId), [currentUid]);
            break;
          case consts.GUILD_UPDATE_MEMBER_TYPE.UPGRADE_MEMBER:
          case consts.GUILD_UPDATE_MEMBER_TYPE.DOWNGRADE_MEMBER:
          case consts.GUILD_UPDATE_MEMBER_TYPE.ABDICATE_MEMBER:
        }
      }
      return utils.invokeCallback(next, null, resource);
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, { ec : Code.FAIL})
    })
};

Handler.prototype.requestJoinGuild = function (msg, session, next) {
  var uid = session.uid;
  var guildId = msg.guildId;
  return GuildDao.getGuild(uid)
    .then(function (result) {
      if (result.status){
        return Promise.cancel({ec: Code.FAIL, msg: "Người chơi đã ở trong hội quán khác rồi"})
      }else {
        return GuildDao.deleteMember(uid, null);
      }
    })
    .then(function (result) {
      if (!msg.cancel){
        return GuildDao.createMember(uid, guildId)
      }
    })
    .then(function (result) {
      if (!msg.cancel) return utils.invokeCallback(next, null, { });
    })
    .catch(function (err) {
      return utils.invokeCallback(next, null, { ec : err.ec , msg : err.msg});
    })
};

Handler.prototype.invitePlayer = function (msg, session, next) {
  
};

Handler.prototype.addFund = function (msg, session, next) {
  var uid = session.uid;
  var member;
  var roleId;
  var guildId;
  var permission;
  var fullname = session.get('fullname');
  if (!lodash.isNumber(msg.gold) || msg.gold <= 500){
    return utils.invokeCallback(next, null, { ec : Code.FAIL});
  }
  var mysqlClient = pomelo.app.get('mysqlClient');
  return getRole(uid)
    .then(function (user) {
      var role = 0;
      if (user){
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user;
      return getPermission(role, 1);
    })
    .then(function (per) {
      permission = per;
      return pomelo.app.get('paymentService')
        .subBalance({
          uid : uid,
          gold : msg.gold,
          msg : "góp tiền vào bang"
        })
    })
    .then(function (result) {
      if (!result.ec){
        return [GuildDao.updateGuild(roleId, permission, {
          gold : mysqlClient.sequelize.literal('gold + ' + result.subGold)
        }),
          GuildDao.updateMember(uid, guildId, {
            gold : mysqlClient.sequelize.literal('gold + ' + result.subGold)
          }),
          GuildDao.addEvent({
            guildId : guildId,
            uid : session.uid,
            fullname: fullname,
            content: util.format('[%s] Xung quỹ hội %s gold', fullname, msg.gold),
            type: consts.GUILD_EVENT_TYPE.ADD_GOLD
          })
        ];
      }
    })
    .spread(function () {
      // add Event
      return pomelo.app.get('mysqlClient')
        .Guild
        .findOne({
          where : {
            id : guildId
          },
          attributes: ['gold'],
          raw : true
        });
    })
    .then(function (guild) {
      return utils.invokeCallback(next, null, {fund : guild.gold});
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, { ec : err.ec || Code.FAIL, msg : err.msg || Code.FAIL});
    })
    .finally(function () {
      msg = null;
    })
};

/**
 * Kiểm tra người chơi thuộc guild nào, thông tin guild, thông tin của người chơi, quyền hạn trong guild
 *
 * @param opts
 */
var getUser = function (opts) {

};

/**
 *  Kiểm tra permission
 *
 * @param uid
 * @param guildId
 * @param resource
 * @param action
 */
var checkPermission = function (uid, guildId, resource, action) {

};

/**
 * Kiểm tra role hiện tại của người dùng trong guild
 *
 * @param uid
 * @param guildId
 */
var getMemberProperties = function (uid, guildId) {
  var mysqlClient = pomelo.app.get('mysqlClient');
  return mysqlClient
    .GuildMember
    .findOne({
      where : {
        uid : uid,
        guild : guildId
      }
    })
    .then(function () {

    })
};

/**
 * Lấy về permission của role hiện tại
 *
 * @param roleId
 * @param resourceId;
 */
var getPermission = function (roleId, resourceId, cb) {
  resourceId = lodash.isArray(resourceId) ? resourceId.push(0) : [resourceId, 0];
  return utils.invokeCallback(cb, null, {});
  //return pomelo.app.get('mysqlClient')
  //  .RoleResource
  //  .findAll({
  //    where: {
  //      resourceId: {
  //        $in : resourceId
  //      },
  //      roleId : roleId
  //    },
  //    raw: true
  //  })
};

var getRole = function (uid, guildId) {
  if (guildId){
    return pomelo.app.get('mysqlClient')
      .GuildMember
      .findOne({
        where : {
          uid : uid,
          guildId: guildId
        },
        attributes: ['guildId', 'role'],
        raw: true
      })
  } else {
    return pomelo.app.get('mysqlClient')
      .GuildMember
      .findOne({
        where : {
          uid : uid
        },
        attributes: ['guildId', 'role'],
        raw: true
      })
  }
};
