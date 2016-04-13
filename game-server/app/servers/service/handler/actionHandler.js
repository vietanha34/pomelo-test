/**
 * Created by vietanha34 on 3/26/16.
 */

var pomelo = require('pomelo');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var utils = require('../../../util/utils');
var ActionDao = require('../../../dao/actionDao');
var GuildDao = require('../../../dao/GuildDao');
var Promise = require('bluebird');
var util = require('util');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

Handler.prototype.action = function (msg, session, next) {
  var accept = msg.accept;
  var action = msg.action || {};
  var uid = session.uid;
  var fullname = session.get('fullname');
  ActionDao.removeAction({id : action.id}, uid);
  switch(action.type){
    case consts.ACTION_ID.INVITE_GUILD:
      GuildDao.removeInvite({ uid : uid, guildId: action.guildId});
      if (accept){
        return GuildDao.getMembers(uid)
          .then(function (member) {
            if (member && member.role < consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER){
              return Promise.reject({});
            }else {
              return GuildDao.getMembers(action.inviteUid, action.guildId)
            }
          })
          .then(function (member) {
            if (member && member.role === consts.GUILD_MEMBER_STATUS.PRESIDENT){
              GuildDao.createMember({ uid : uid, guildId : action.guildId, role: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER}, true)
                .then(function () {
                  GuildDao.addEvent({
                    guildId : action.guildId,
                    uid : session.uid,
                    fullname: fullname,
                    content: util.format('[%s] gia nhập hội quán', action.fullname),
                    type: consts.GUILD_EVENT_TYPE.LEAVE_GUILD
                  });
                })
            }else {
              GuildDao.createMember({ uid : uid, guildId : action.guildId, role: consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER}, true);
            }
          })

      }
      break;
      // action invite;
  }

  return utils.invokeCallback(next, null, {});
};