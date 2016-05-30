/**
 * Created by vietanha34 on 3/26/16.
 */

var pomelo = require('pomelo');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var utils = require('../../../util/utils');
var ActionDao = require('../../../dao/actionDao');
var TourDao = require('../../../dao/tourDao');
var GuildDao = require('../../../dao/GuildDao');
var UserDao = require('../../../dao/userDao');
var lodash = require('lodash');
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
                          .then(function () {
                            pomelo.app.get('statusService')
                              .pushByUids([uid], 'undefined', {ec: Code.FAIL, msg: "Chúc mừng bạn đã trở thành thành viên của hội quán"});
                          })
                          .catch(function (err) {
                            pomelo.app.get('statusService')
                              .pushByUids([uid], 'undefined', {ec: Code.FAIL, msg: err.ec || Code.FAILs});
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
            var tour, tableConfig, round;
            return pomelo.app.get('mysqlClient')
              .sequelize
              .transaction(function (t) {
                return pomelo.app.get('mysqlClient')
                  .Tournament
                  .create({
                    type: consts.TOUR_TYPE.FRIENDLY,
                    tourType: 1,
                    name: action.name
                  },{transaction : t})
                  .then(function (tu) {
                    tour = tu;
                    return pomelo.app.get('mysqlClient')
                      .TourTableConfig
                      .create({
                        gameId : action.gameId,
                        bet : action.bet,
                        totalTime : action.totalTime,
                        turnTime: action.turnTime,
                        timeWait : 5 * 60 * 1000,
                        level : 0,
                        tourTimeWait : 10 * 60 * 1000,
                        showKill : action.showKill || 0,
                        mustWin : 0,
                        lockMode : lodash.isArray(action.lockMode) ? action.lockMode.join(',') : '',
                        matchPlay : action.numMatch || 2
                      }, { transaction : t})
                  })
                  .then(function (config) {
                    tableConfig = config;
                    return pomelo.app.get('mysqlClient')
                      .TourSchedule
                      .create({
                        matchTime : action.time / 1000 | 0,
                        matchmaking : 1,
                        show : 1
                      }, { transaction : t})
                  })
                  .then(function (schedule) {
                    return pomelo.app.get('mysqlClient')
                      .TourRound
                      .create({
                        tourId : tour.tourId,
                        scheduleId : schedule.id,
                        tableConfigId : tableConfig.id,
                        name : "Vòng chung kết",
                        status : 0,
                        numGroup : 0,
                        numRound : 1,
                        type : 1,
                        showMember : 1
                      }, { transaction : t})
                  })
                  .then(function (r) {
                    round = r;
                    return pomelo.app.get('mysqlClient')
                      .TourSchedule
                      .update({
                        roundId : round.id
                      }, {
                        where : {
                          id : round.scheduleId
                        },
                        transaction : t
                      })
                  })
              })
              .then(function () {
                console.log('tạo bàn thi đấu cho giải giao hữu');
                var tourManager = pomelo.app.get('tourManager');
                for (var i = 0; i < action.numBoard; i ++){
                  var dataCreateTable = {
                    index : i + 1,
                    tourType : consts.TOUR_TYPE.FRIENDLY,
                    gameId: action.gameId,
                    roundId: tour.roundId,
                    guildId : [action.currentGuildId, action.targetGuildId],
                    matchTime: action.time / 1000 | 0,
                    timePlay : action.matchTime / 1000 | 0,
                    mustWin : 0,
                    caroOpen : action.caroOpen,
                    mustKill : action.mustKill
                    battleType: consts.TOUR_BATTLE_TYPE.THUY_SY,
                    tc : {
                      gameId : action.gameId,
                      bet : action.bet,
                      totalTime : action.totalTime,
                      turnTime : action.turnTime,
                      timeWait : action.timeWait || 2 * 60 * 1000,
                      tourTimeWait : action.tourTimeWait || 10 * 60 * 1000,
                      showKill : 0,
                      level : action.level || 0,
                      lockMode : action.lockMode || [],
                      mustWin : action.mustWin || 0,
                      caroOpen : action.caroOpen || 1
                    },
                    lockMode : action.lockMode,
                    username : [],
                    fullname : [],
                    tourId : tour.tourId
                  };
                  tourManager.createTable(dataCreateTable)
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
      //ActionDao.removeAction({id: action.id}, uid);
      return utils.invokeCallback(next, null, {});
    })
    .catch(function (err) {
      console.error('actionHandler : ',err);
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL})
    })
};
