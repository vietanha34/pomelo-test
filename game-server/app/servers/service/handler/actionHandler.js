/**
 * Created by vietanha34 on 3/26/16.
 */

var pomelo = require('pomelo');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var utils = require('../../../util/utils');
var ActionDao = require('../../../dao/actionDao');
var GuildDao = require('../../../dao/guildDao');

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
  ActionDao.removeAction({id : action.id}, uid);
  switch(action.type){
    case consts.ACTION_ID.INVITE_GUILD:
      GuildDao.removeInvite({ uid : uid, guildId: action.guildId});
      if (accept){
        GuildDao.createMember({ uid : uid, guildId : action.guildId, role: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER});
      }
      // action invite;
  }

  return utils.invokeCallback(next, null, {});
};