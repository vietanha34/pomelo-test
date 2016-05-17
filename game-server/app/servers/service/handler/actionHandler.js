/**
 * Created by vietanha34 on 3/26/16.
 */

var pomelo = require('pomelo');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var utils = require('../../../util/utils');
var ActionDao = require('../../../dao/actionDao');
var TourDao = require('../../../dao/tourDao');
var GuildDao = require('../../../dao/guildDao');
var UserDao = require('../../../dao/userDao');
var Promise = require('bluebird');
var util = require('util');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var moment = require('moment');
moment.locale('vi');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.action = function (msg, session, next) {
  var accept = msg.accept;
  var action = msg.action || {};
  var uid = session.uid;
  var fullname = session.get('fullname');
  Promise.delay(0)
    .then(function () {
      switch (action.type) {
        case consts.ACTION_ID.INVITE_GUILD:
          GuildDao.removeInvite({uid: uid, guildId: action.guildId});
          if (accept) {
            return pomelo.app.get('redisCache')
              .getAsync(redisKeyUtil.getLeaveGuild(uid))
              .then(function (result) {
                if (result > 0) {
                  return pomelo.app.get('redisCache')
                    .ttlAsync(redisKeyUtil.getLeaveGuild(uid))
                    .then(function (expire) {
                      return Promise.reject({
                        ec: Code.FAIL,
                        msg: util.format("Bạn vừa rời hội quán, vui lòng đợi %s nữa để gia nhập hội quán khác", moment().add(expire, 'seconds').from(moment(), true))
                      })
                    });
                } else {
                  return GuildDao.getMembers(uid)
                    .then(function (member) {
                      if (member && member.role < consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER) {
                        return Promise.reject({});
                      } else {
                        return GuildDao.getMembers(action.inviteUid, action.guildId)
                      }
                    })
                    .then(function (member) {
                      if (member && member.role === consts.GUILD_MEMBER_STATUS.PRESIDENT) {
                        pomelo.app.get('statusService')
                          .pushByUids([uid], 'undefined', {ec: Code.FAIL, msg: "Chúc mừng bạn đã trở thành thành viên của hội quán"});
                        return GuildDao.createMember({
                          uid: uid,
                          guildId: action.guildId,
                          role: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
                        }, true)
                          .then(function (res) {
                            if (res && !res.ec) {
                              return UserDao.getUserProperties(uid, ['username', 'fullname'])
                            } else {
                              return Promise.reject();
                            }
                          })
                          .then(function (user) {
                            user = user || {};
                            return GuildDao.addEvent({
                              guildId: action.guildId,
                              uid: session.uid,
                              fullname: fullname,
                              content: util.format('[%s] gia nhập hội quán', user.fullname),
                              type: consts.GUILD_EVENT_TYPE.LEAVE_GUILD
                            });
                          })
                      } else {
                        pomelo.app.get('statusService')
                          .pushByUids([uid], 'undefined', {ec: Code.FAIL, msg: "Vui lòng chờ hội chủ đồng ý để xác nhận việc gia nhập của bạn"});
                        return GuildDao.createMember({
                          uid: uid,
                          guildId: action.guildId,
                          role: consts.GUILD_MEMBER_STATUS.REQUEST_MEMBER
                        }, true);
                      }
                    })
                }
              })
          }
          else {
            return Promise.resolve({});
          }
          break;
        case consts.ACTION_ID.TOURNAMENT_DUEL:
          if (accept) {
            // create giải đấu
            return pomelo.app.get('mysqlClient')
              .Tournament
              .create({
                type: consts.TOUR_TYPE.FRIENDLY,
                tourType: 1,
                name: action.name
              }) 
              .then(function (tour) {
                // tạo bàn đấu
                var tourManager = pomelo.app.get('tourManager');
                for (var i = 0; i < action.numBoard; i ++){
                  tourManager.createTable({
                    index : i+1,
                    tourType : consts.TOUR_TYPE.FRIENDLY,
                    username : [],
                    fullname : [],
                    guildId : [action.currentGuildId, action.targetGuildId],
                    tourId : tour.tourId,
                    timePlay : action.matchTime / 1000 | 0,
                    mustWin : 0,
                    lockMode : action.lockMode,
                    tc : {
                      gameId : action.gameId,
                      bet : action.bet
                    }
                  })
                }
              })

          } else {
            GuildDao.addEvent({
              guildId: action.currentGuildId,
              uid: session.uid,
              fullname: fullname,
              content: util.format('Lời khiêu chiến bị huỷ'),
              type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
            });
            GuildDao.addEvent({
              guildId: action.targetGuildId,
              uid: session.uid,
              fullname: fullname,
              content: util.format('Lời khiêu chiến bị huỷ'),
              type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
            });
            return Promise.resolve({})
          }
        // action invite;
      }
    })
    .then(function () {
      ActionDao.removeAction({id: action.id}, uid);
      return utils.invokeCallback(next, null, {});
    })
    .catch(function (err) {
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL})
    })
};