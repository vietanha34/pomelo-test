/**
 * Created by vietanha34 on 1/14/16.
 */

var async = require('async');
var utils = require('../../../util/utils');
var Code = require('../../../consts/code');
var pomelo = require('pomelo');
var Promise = require('bluebird');
var GuildDao = require('../../../dao/GuildDao');
var RoomDao = require('../../../dao/roomChatDao');
var consts = require('../../../consts/consts');
var lodash = require('lodash');
var util = require('util');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var ActionDao = require('../../../dao/actionDao');
var NotifyDao = require('../../../dao/notifyDao');
var moment = require('moment');

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
      if (result && !result.ec) {
        RoomDao.createRoom({
          roomId: redisKeyUtil.getChatGuildName(result.guildId),
          members: [session.uid]
        })
      }
      return next(null, result);
    })
    .catch(function (err) {
      next(null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL});
    })
};

Handler.prototype.getGuild = function (msg, session, next) {
  GuildDao.getGuild(session.uid)
    .then(function (result) {
      return next(null, result)
    })
    .catch(function (err) {
      next(null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL});
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
      if (user) {
        member = user;
        role = member.role;
        guildId = guildId || member.guildId;
      }
      resourceId.guildId = guildId;
      roleId = user || {guildId: guildId, role: 0};
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
      if (user) {
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user;
      return getPermission(role, 1);
    })
    .then(function (permission) {
      console.log('permission : ', permission);
      msg.guildId = guildId;
      var updateData = {};
      updateData.guildId = guildId;
      if (msg.detail) updateData['detail'] = msg.detail;
      if (msg.icon) updateData['icon'] = JSON.stringify(msg.icon);
      if (msg.sIcon) updateData['sIcon'] = JSON.stringify(msg.sIcon);
      return GuildDao.updateGuild(roleId, permission, updateData);
    })
    .then(function (resource) {
      resource = resource || {};
      resource.guildId = guildId;
      return utils.invokeCallback(next, null, resource);
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, {ec: Code.FAIL})
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
  var uid = session.uid;
  var sort = msg.sort || 1;
  var member;
  var roleId;
  var guildId;
  switch (msg.sort) {
    case 1:
      msg.sort = 'gold';
      break;
    case 2:
      msg.sort = 'fame';
      break;
    case 3:
      msg.sort = 'numMember';
      break;
    case 4:
      msg.sort = 'level';
      break;
    default:
      msg.sort = 'name'
  }
  return getRole(uid)
    .then(function (user) {
      console.log('members : ', user);
      var role = 0;
      if (user) {
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user || {};
      return getPermission(role, 1);
    })
    .then(function (permission) {
      return GuildDao.getListGuild(roleId, {
        offset: offset,
        length: length,
        sort: msg.sort,
        keyword: msg.keyword
      })
    })
    .then(function (guilds) {
      return utils.invokeCallback(next, null, {
        data: guilds,
        sort: sort,
        offset: offset,
        length: length,
        keyword: msg.keyword
      })
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, {data: [], offset: 0, length: 0, keyword: msg.keyword});
    })
};


Handler.prototype.updateMember = function (msg, session, next) {
  var uid = session.uid;
  var member;
  var roleId;
  var guildId;
  var countMember;
  var currentUid = msg.uid || uid;
  return getRole(uid)
    .then(function (user) {
      var role = 0;
      if (user) {
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user;
      return getPermission(role, 1);
    })
    .then(function (permission) {
      switch (msg.type) {
        case consts.GUILD_UPDATE_MEMBER_TYPE.ADD_MEMBER:
          // add event
          return pomelo.app.get('mysqlClient')
            .GuildMember
            .count({
              where : {
                uid : currentUid,
                guildId : guildId,
                role : consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
              },
              raw : true
            })
            .then(function (count) {
              if (count){
                return GuildDao.createMember({ uid : currentUid, guildId : guildId, role: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER}, true);
              }
            });
          break;
        case consts.GUILD_UPDATE_MEMBER_TYPE.REMOVE_MEMBER:
          return pomelo.app.get('mysqlClient')
            .GuildMember
            .count
          ({
            where: {
              guildId: guildId,
              role: {
                $ne: consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
              }
            }
          })
            .then(function (count) {
              countMember = count;
              if (currentUid === uid && roleId.role === consts.GUILD_MEMBER_STATUS.PRESIDENT && count > 1) {
                return Promise.reject({ec: Code.FAIL, msg: "Hội chủ không được rời hội quán"});
              } else {
                return GuildDao.deleteMember(currentUid, guildId);
              }
            });
          break;
        case consts.GUILD_UPDATE_MEMBER_TYPE.UPGRADE_MEMBER:
        case consts.GUILD_UPDATE_MEMBER_TYPE.DOWNGRADE_MEMBER:
          if (msg.role === consts.GUILD_MEMBER_STATUS.PRESIDENT) {
            return Promise.reject({ec: Code.FAIL, msg: "Không thể nâng cấp người chơi lên hội chủ"});
          }
          if (msg.role === consts.GUILD_MEMBER_STATUS.VICE_PRESIDENT) {
            return pomelo.app.get('mysqlClient')
              .GuildMember
              .count({
                where: {
                  guildId: guildId,
                  role: consts.GUILD_MEMBER_STATUS.VICE_PRESIDENT
                }
              })
              .then(function (count) {
                if (count >= 2) {
                  return Promise.reject({ec: Code.FAIL, msg: "Hội quán chỉ được tối đa 2 hội phó"});
                } else {
                  return GuildDao.updateMember(currentUid, guildId, {role: msg.role});
                }
              })
          } else {
            return GuildDao.updateMember(currentUid, guildId, {role: msg.role});
          }
          break;
        case consts.GUILD_UPDATE_MEMBER_TYPE.ABDICATE_MEMBER:
          if (currentUid === uid) {
            return Promise.reject({
              ec: Code.FAIL, msg: "Bạn không thể nhường chức cho chính mình"
            })
          }
          return GuildDao.getMembers(currentUid, guildId)
            .then(function (member) {
              if (member) {
                if (member.role > roleId.role) {
                  // ok nhường chức nào
                  var updateData = [];
                  updateData.push([uid, guildId, {role: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER}]);
                  updateData.push([currentUid, guildId, {role: roleId.role}]);
                  return Promise.map(updateData, function (update) {
                    return GuildDao.updateMember.apply(undefined, update);
                  })
                    .then(function (members) {
                      var users = [];
                      for (var i = 0, len = members.length; i < len; i++) {
                        if (lodash.isArray(members[i].member)) {
                          users = users.concat(members[i].member);
                        }
                      }
                      return Promise.resolve({member: users});
                    })
                } else {
                  return Promise.reject({
                    ec: Code.FAIL, msg: "Không thể thực hiện chức năng nhường chức cho người có chức lớn hơn mình"
                  })
                }
              } else {
                return Promise.reject({
                  ec: Code.FAIL, msg: "Nhường chức cho người không có trong hội quán"
                })
              }
            });
          break;
      }
      return GuildDao.updateMember(roleId, permission, msg);
    })
    .then(function (resource) {
      console.log('resource : ', resource);
      resource = resource || {};
      resource.guildId = guildId;
      resource.type = msg.type;
      if (resource && !resource.ec) {
        switch (msg.type) {
          case consts.GUILD_UPDATE_MEMBER_TYPE.ADD_MEMBER:
            GuildDao.getGuild(currentUid)
              .then(function (data) {
                data.push = 1;
                pomelo.app.get('statusService').pushByUids([currentUid], 'service.guildHandler.getGuild', data);
                pomelo.app.get('statusService').pushByUids([currentUid], 'undefined', {
                  ec: Code.FAIL,
                  msg: 'Bạn vừa được chấp nhận là thành viên của hội quán'
                });
                pomelo.app.get('statusService').pushByUids([uid], 'undefined', {
                  ec: Code.FAIL,
                  msg: 'Bạn vừa thêm người chơi vào hội quán thành công'
                })
              });
            ActionDao.removeAction({
              guildId: guildId,
              type: consts.ACTION_ID.INVITE_GUILD
            }, currentUid);
            GuildDao.addEvent({
              guildId: guildId,
              uid: session.uid,
              fullname: resource.fullname,
              content: util.format('[%s] gia nhập hội quán', resource.member ? resource.member[0].fullname : ''),
              type: consts.GUILD_EVENT_TYPE.JOIN_GUILD
            });
            GuildDao.updateGuild(roleId, {}, {
              numMember: pomelo.app.get('mysqlClient').sequelize.literal('numMember + ' + 1)
            });
            // remove trong list invite
            resource.member = [{
              uid: currentUid,
              role: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
            }];
            GuildDao.removeInvite({uid: currentUid, guildId: resource.guildId});
            RoomDao.addMember(redisKeyUtil.getChatGuildName(guildId), [currentUid]);
            break;
          case consts.GUILD_UPDATE_MEMBER_TYPE.REMOVE_MEMBER:
            if (currentUid === uid) {
              GuildDao.addEvent({
                guildId: guildId,
                uid: session.uid,
                fullname: resource.fullname,
                content: util.format('[%s] rời hội quán', resource.member ? resource.member[0].fullname : ''),
                type: consts.GUILD_EVENT_TYPE.LEAVE_GUILD
              });
              if (countMember === 1) {
                //xoá hội quán đi nếu chỉ có 1 thành viên
                GuildDao.deleteGuild(guildId);
              }
            } else {
              GuildDao.getGuild(currentUid)
                .then(function (data) {
                  data.push = 1;
                  pomelo.app.get('statusService').pushByUids([currentUid], 'service.guildHandler.getGuild', data);
                  pomelo.app.get('statusService').pushByUids([currentUid], 'undefined', {
                    ec: Code.FAIL,
                    msg: 'Bạn vừa bị đuổi khỏi hội quán'
                  })
                });
              GuildDao.addEvent({
                guildId: guildId,
                uid: session.uid,
                fullname: resource.fullname,
                content: util.format('[%s] bị đuổi khỏi hội quán', resource.member ? resource.member[0].fullname : ''),
                type: consts.GUILD_EVENT_TYPE.LEAVE_GUILD
              });
            }
            pomelo.app.get('redisCache').set(redisKeyUtil.getLeaveGuild(currentUid), 1);
            pomelo.app.get('redisCache').expire(redisKeyUtil.getLeaveGuild(currentUid),24 * 60 * 60);
            resource.member = [{uid: currentUid, role: consts.GUILD_MEMBER_STATUS.GUEST}];
            RoomDao.kickUser(redisKeyUtil.getChatGuildName(guildId), [currentUid]);
            break;
          case consts.GUILD_UPDATE_MEMBER_TYPE.DOWNGRADE_MEMBER:
          case consts.GUILD_UPDATE_MEMBER_TYPE.UPGRADE_MEMBER:
            GuildDao.getGuild(currentUid)
              .then(function (data) {
                data.push = 1;
                pomelo.app.get('statusService').pushByUids([currentUid], 'service.guildHandler.getGuild', data);
              });
            var notifyMsg = '';
            var eventMsg = '';
            switch (msg.role) {
              case consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER:
                notifyMsg = 'Bạn vừa bị giáng chức xuống làm hội viên';
                eventMsg = '[%s] bị giáng chức xuống thành hội viên';
                break;
              case consts.GUILD_MEMBER_STATUS.VICE_PRESIDENT:
                notifyMsg = 'Bạn vừa được nâng chức lên làm hội phó';
                eventMsg = '[%s] được nâng chức lên thành hội phó';
                break;
            }
            pomelo.app.get('statusService').pushByUids([currentUid], 'undefined', {ec: Code.FAIL, msg: notifyMsg});
            GuildDao.addEvent({
              guildId: guildId,
              uid: session.uid,
              fullname: resource.fullname,
              content: util.format(eventMsg, resource.member ? resource.member[0].fullname : ''),
              type: consts.GUILD_EVENT_TYPE.JOIN_GUILD
            });
            break;
          case consts.GUILD_UPDATE_MEMBER_TYPE.ABDICATE_MEMBER:
            GuildDao.getGuild(currentUid)
              .then(function (data) {
                data.push = 1;
                pomelo.app.get('statusService').pushByUids([currentUid], 'service.guildHandler.getGuild', data);
              });
            notifyMsg = "Bạn đã được hội chủ nhường chức hội chủ";
            pomelo.app.get('statusService').pushByUids([currentUid], 'undefined', {ec: Code.FAIL, msg: notifyMsg});
            GuildDao.addEvent({
              guildId: guildId,
              uid: session.uid,
              fullname: resource.fullname,
              content: util.format('[%s] Nhường chức hội chủ cho người chơi [%s]', resource.member ? resource.member[0].fullname : '', resource.member ? resource.member[1].fullname : ''),
              type: consts.GUILD_EVENT_TYPE.JOIN_GUILD
            });
            ActionDao.getAction({ type : consts.ACTION_ID.TOURNAMENT_DUEL}, uid)
              .then(function (actions) {
                for (var i = 0, len = actions.length; i < len; i ++){
                  var action = actions[i];
                  ActionDao.addAction(action, currentUid)
                }
              })
        }
      }
      return utils.invokeCallback(next, null, resource);
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL});
    })
};

Handler.prototype.requestJoinGuild = function (msg, session, next) {
  var uid = session.uid;
  var guildId = msg.guildId;
  var fullname = session.get('fullname');
  return pomelo.app.get('redisCache')
    .ttlAsync(redisKeyUtil.getLeaveGuild(uid))
    .then(function (expire) {
      if (expire > -1){
        return Promise.reject({
          ec: Code.FAIL,
          msg: util.format("Bạn vừa rời hội quán, vui lòng đợi %s nữa để gia nhập hội quán khác", moment().add(expire, 'seconds').from(moment(), true))
        })
      }
      return GuildDao.getGuild(uid)
    })
    .then(function (result) {
      if (result.status) {
        return Promise.reject({ec: Code.FAIL, msg: "Người chơi đã ở trong hội quán khác rồi"})
      } else {
        return GuildDao.deleteMember(uid, null);
      }
    })
    .then(function (result) {
      if (!msg.cancel) {
        return GuildDao.createMember({uid: uid, guildId: guildId, role: consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER});
      } else {
        return Promise.resolve({});
      }
    })
    .then(function (result) {
      return pomelo.app.get('mysqlClient')
        .GuildMember
        .findOne({
          where : {
            guildId : guildId,
            role : consts.GUILD_MEMBER_STATUS.PRESIDENT
          },
          raw : true,
          attributes : ['uid']
        });
    })
    .then(function (member) {
      if(member){
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: "Hội quán",
          msg: util.format('Người chơi "%s" xin gia nhập hội quán của bạn. Vui lòng vào phần hội quán để xem thêm thông tin', fullname),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [member.uid],
          image: consts.NOTIFY.IMAGE.NORMAL
        });
      }
      return utils.invokeCallback(next, null, {cancel: msg.cancel});
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL});
    })
};

Handler.prototype.invitePlayer = function (msg, session, next) {
  var inviteUid = msg.uid;
  if (!inviteUid) {
    return next(null, {ec: Code.FAIL, msg: "không có người mời cụ thể"})
  }
  var uid = session.uid;
  var fullname = session.get('fullname');
  var member;
  var roleId;
  var guildId;
  return getRole(uid)
    .then(function (user) {
      var role = 0;
      if (user) {
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user;
      return getPermission(role, 1);
    })
    .then(function (permission) {
      return [GuildDao.countInvite({where: {uid: inviteUid}}),
        pomelo.app.get('mysqlClient')
          .GuildInvite
          .findOne({where: {uid: inviteUid}}),
        GuildDao.getMembers(inviteUid),
        pomelo.app.get('mysqlClient')
          .Guild
          .findOne({
            where: {
              id: guildId
            },
            raw: true,
            attributes: ['status', 'id']
          })
      ]
    })
    .spread(function (count, invite, member, guild) {
      if (!guild.status) {
        return Promise.reject(null, {
          ec: Code.FAIL,
          msg: "Hội quán đang chờ xét duyệt không thể mời người chơi khác vào hội quán"
        })
      }
      if (member && member.role < consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER) {
        return Promise.reject(null, {ec: Code.FAIL, msg: "Người chơi này đã tham gia vào hội quán khác "})
      }
      if (count > 3) {
        return Promise.reject(null, {ec: Code.FAIL, msg: "Người chơi này đã nhận đc quá nhiều lời mời"})
      } else if (!invite) {
        return pomelo.app.get('mysqlClient')
          .GuildInvite
          .findOrCreate(
          {
            where: {uid: inviteUid, guildId: roleId.guildId}, defaults: {
            uid: inviteUid,
            guildId: roleId.guildId,
            inviteUid: uid
          }
          }
        )
      } else {
        return Promise.reject(null, {ec: Code.FAIL, msg: "Người này đã đc mời vào hội quán"});
      }
    })
    .spread(function (invite, created) {
      if (!created) {
        return Promise.reject({ec: Code.FAIL, msg: "Người chơi này đã nhận đc lời mời từ hội quán này rồi"});
      } else {
        return pomelo.app.get('mysqlClient').Guild.findOne({where: {id: guildId}, raw: true, attributes: ['name']})
      }
    })
    .then(function (guild) {
      // add action invite
      ActionDao.addAction({
        msg: util.format("Bạn nhận được lời mời vào hội quán '%s' từ người chơi '%s'. Bạn có muốn tham gia không?", guild.name, fullname),
        title: "Lời mời",
        action: {
          id: Date.now(),
          type: consts.ACTION_ID.INVITE_GUILD,
          guildId: guildId,
          inviteUid: uid
        }
      }, inviteUid);
      return utils.invokeCallback(next, null, {});
    })
    .catch(function (err) {
      if (lodash.isError(err)) {
      }
      console.error('err : ', err);
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL})
    })
};

Handler.prototype.addFund = function (msg, session, next) {
  var uid = session.uid;
  var member;
  var roleId;
  var guildId;
  var permission;
  var fullname = session.get('fullname');
  if (!lodash.isNumber(msg.gold) || msg.gold <= 500) {
    return utils.invokeCallback(next, null, {ec: Code.FAIL});
  }
  var mysqlClient = pomelo.app.get('mysqlClient');
  return getRole(uid)
    .then(function (user) {
      var role = 0;
      if (user) {
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
          uid: uid,
          gold: msg.gold,
          msg: "góp tiền vào bang"
        })
    })
    .then(function (result) {
      if (!result.ec) {
        pomelo.app.get('statusService').pushByUids([uid], 'service.dailyHandler.getGoldAward', {gold: result.gold});
        return [GuildDao.updateGuild(roleId, permission, {
          gold: mysqlClient.sequelize.literal('gold + ' + result.subGold)
        }),
          GuildDao.updateMember(uid, guildId, {
            gold: mysqlClient.sequelize.literal('gold + ' + result.subGold)
          }),
          GuildDao.addEvent({
            guildId: guildId,
            uid: session.uid,
            fullname: fullname,
            content: util.format('[%s] Xung quỹ hội %s gold', fullname, msg.gold),
            type: consts.GUILD_EVENT_TYPE.ADD_GOLD
          })
        ];
      } else {
        return Promise.reject({
          ec: Code.FAIL,
          msg: "Bạn không đủ tiền để đóng quỹ hội quán"
        })
      }
    })
    .spread(function () {
      // add Event
      return pomelo.app.get('mysqlClient')
        .Guild
        .findOne({
          where: {
            id: guildId
          },
          attributes: ['gold'],
          raw: true
        });
    })
    .then(function (guild) {
      return utils.invokeCallback(next, null, {fund: guild.gold});
    })
    .catch(function (err) {
      if (lodash.isError(err)) {
        console.error('err : ', err);
      }
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL});
    })
    .finally(function () {
      msg = null;
    })
};

/**
 * Khiêu chiến đấu trường
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.duel = function (msg, session, next) {
  var uid = session.uid;
  var roleId;
  var guildId;
  var member;
  var fullname = session.get('fullname');
  return getRole(uid)
    .then(function (user) {
      var role = 0;
      if (user) {
        member = user;
        role = member.role;
        guildId = member.guildId;
      }
      roleId = user || {};
      return getPermission(role, 1);
    })
    .then(function (permission) {
      if (guildId === msg.guildId){
        return Promise.reject({ec :Code.FAIL, msg : "Bạn không thể khiêu chiến với chính hội quán của mình"})
      }
      if (msg.time - (Date.now() / 1000 | 0) < 4 * 60 * 60){
        return Promise.reject({ec :Code.FAIL, msg : "Thời gian thi đấu cần cách thời điểm hiện tại ít nhất 4 tiếng"});
      }
      if (msg.time - (Date.now() / 1000 | 0) > 7 * 24 * 60 * 60){
        return Promise.reject({ec :Code.FAIL, msg : "Thời gian thi đấu cần cách thời điểm hiện tại không quá 7 ngày"});
      }
      if (roleId.role === consts.GUILD_MEMBER_STATUS.PRESIDENT) {
        return [pomelo.app.get('mysqlClient')
          .GuildBattle
          .count({
            where : {
              guildId1 : guildId
            },
            time  : {
              $gte : new Date()
            },
            allow : null
          }), pomelo.app.get('mysqlClient')
            .GuildBattle
            .count({
            where : {
              guildId1 : guildId,
              guildId2 : msg.guildId
            },
            time  : {
              $gte : new Date()
            },
            allow : null
          }),
          pomelo.app.get('redisCache')
            .getAsync(redisKeyUtil.getGuildDuelFail(guildId, msg.guildId)),
          pomelo.app.get('redisCache')
            .getAsync(redisKeyUtil.getGuildDuelSuccess(guildId, msg.guildId))
        ]
      } else {
        return Promise.reject({
          ec: Code.FAIL,
          msg: "Bạn không có đủ quyền để khiêu chiến hội quán"
        })
      }
    })
    .spread(function (count, guildCount, timeoutFail, timeoutSuccess) {
      if (count >= 3){
        return Promise.reject({ec: Code.FAIL, msg: "Hội quán của bạn không được gửi quá 3 lời mời khiêu chiến hội quán khác"})
      }

      if (guildCount >= 1){
        return Promise.reject({ec : Code.FAIL, msg: "Bạn đã gửi lời mời khiêu chiến đến hội quán này rồi, vui lòng đợi đối thủ chấp nhập"})
      }
      if (timeoutFail){
        return Promise.reject({ec : Code.FAIL, msg: "Hội quán đối thủ vừa từ chối yêu cầu của bạn, vui lòng đợi 24h để gửi lời mời khác"})
      }
      if (timeoutSuccess){
        return Promise.reject({ec :Code.FAIL, msg : "Hai hội quán vừa giao hữu thành công, vui lòng đợi 24h để có thể khiêu chiến tiếp"})
      }
      return [
        pomelo.app.get('mysqlClient')
          .Guild
          .findOne({
            where: {
              id: guildId
            },
            raw: true,
            attributes: ['name', 'id']
          }),
        pomelo.app.get('mysqlClient')
          .Guild
          .findOne({
            where: {id: msg.guildId},
            raw: true
          }),
        pomelo.app.get('mysqlClient')
          .GuildMember
          .findOne({
            where: {
              guildId: msg.guildId,
              role: consts.GUILD_MEMBER_STATUS.PRESIDENT
            },
            raw: true
          })
      ]
    })
    .spread(function (currentGuild, targetGuild, president) {
      if (!targetGuild) {
        return Promise.reject({ec: Code.FAIL, msg: 'Không có hội quán nào để khiêu chiến'})
      } else {
        msg.id = Date.now();
        msg.type = consts.ACTION_ID.TOURNAMENT_DUEL;
        msg.currentGuildId = currentGuild.id;
        msg.targetGuildId = targetGuild.id;
        GuildDao.addEvent({
          guildId: currentGuild.id,
          uid: session.uid,
          fullname: fullname,
          content: util.format('Gửi lời khiêu chiến hội quán [%s]', targetGuild.name),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        GuildDao.addEvent({
          guildId: targetGuild.id,
          uid: session.uid,
          fullname: fullname,
          content: util.format('Nhận được một lời mời khiêu chiến từ hội quán [%s]', currentGuild.name),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        next(null, { ec : Code.FAIL, msg : "Đã gửi lời thách đấu thành công đến hội quán này"});
        pomelo.app.get('mysqlClient')
          .GuildBattle
          .create({
            actionId : msg.id,
            guildId1 : msg.currentGuildId,
            guildId2 : msg.targetGuildId,
            time : msg.time
          });
        return ActionDao.addAction({
          msg: util.format("Hội quán nhận được lời mời giao hữu từ hội quán '%s' vào lúc %s. Nhấn nút xem để biết chi tiết", currentGuild.name, moment(msg.time).format()),
          title: "Thách đấu",
          buttonLabel: 'Xem',
          popup: {
            type: consts.NOTIFY_NC_POPUP_TYPE.TOURNAMENT_DUEL,
            data: msg
          },
          expire : msg.time - (Date.now() / 1000 | 0) - 60 * 60,
          action: msg
        }, president ? president.uid : 0)
      }
    })
    .catch(function (err) {
      console.error('err : ', err);
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL});
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
      where: {
        uid: uid,
        guild: guildId
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
  if (guildId) {
    return pomelo.app.get('mysqlClient')
      .GuildMember
      .findOne({
        where: {
          uid: uid,
          guildId: guildId
        },
        attributes: ['guildId', 'role'],
        raw: true
      })
  } else {
    return pomelo.app.get('mysqlClient')
      .GuildMember
      .findOne({
        where: {
          uid: uid
        },
        attributes: ['guildId', 'role'],
        raw: true
      })
  }
};
