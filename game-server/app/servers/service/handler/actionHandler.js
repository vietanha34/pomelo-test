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
var Notify = require('../../../dao/notifyDao');
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
  var currentGuildName, targetGuildName;
  return ActionDao.actionExist({id: action.id, type: action.type}, uid)
    .then(function (exist) {
      if (!exist) {
        return Promise.reject({ec: Code.FAIL, msg: "Yêu cầu này không còn tồn tại nữa"});
      }
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
                              .pushByUids([uid], 'undefined', {
                                ec: Code.FAIL,
                                msg: "Chúc mừng bạn đã trở thành thành viên của hội quán"
                              });
                          })
                          .catch(function (err) {
                            pomelo.app.get('statusService')
                              .pushByUids([uid], 'undefined', {ec: Code.FAIL, msg: err.ec || Code.FAILs});
                          })
                      } else {
                        pomelo.app.get('statusService')
                          .pushByUids([uid], 'undefined', {
                            ec: Code.FAIL,
                            msg: "Vui lòng chờ hội chủ đồng ý để xác nhận việc gia nhập của bạn"
                          });
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
            if (action.time < Date.now()) { // thời gian nhận tối thiểu là 1h
              ActionDao.removeAction({id: action.id}, uid);
              return Promise.reject({ec: Code.FAIL, msg: "Đã hết thời gian chấp nhận lời mời giao hữu này"})
            }
            var tour, tableConfig, round, schedule;
            return TourDao.getTour({
              where: {
                type: consts.TOUR_TYPE.FRIENDLY,
                $or: [
                  {
                    guildId1: action.targetGuildId
                  },
                  {
                    guildId2: action.targetGuildId
                  }
                ],
                schedule: {
                  $gte: Date.now() / 1000 | 0
                }
              }
            })
              .then(function (tours) {
                if (tours && tours.length > 0) {
                  return Promise.reject({
                    ec: Code.FAIL,
                    msg: "Hội quán của bạn đang trong thời gian thi đấu, không thể chấp nhận lời mời đấu trường khác"
                  })
                }
                return [
                  pomelo.app.get('mysqlClient')
                    .Guild
                    .findOne({
                      where: {id: action.currentGuildId},
                      attributes: ['name', 'sIcon', 'gold', 'icon', 'id', 'numMember'],
                      raw: true
                    }),
                  pomelo.app.get('mysqlClient')
                    .Guild
                    .findOne({
                      where: {id: action.targetGuildId},
                      attributes: ['name', 'sIcon', 'gold', 'icon', 'id', 'numMember'],
                      raw: true
                    })
                ]
              })
              .spread(function (currentGuild, targetGuild) {
                console.log('currentguild : ', currentGuild, targetGuild);
                if (!currentGuild || !targetGuild) {
                  return Promise.reject({ec: Code.FAIL, msg : "một trong 2 hội quán không tồn tại"})
                }
                if (targetGuild.gold < action.numBoard * action.numMatch * action.bet) {
                  return Promise.reject({
                    ec: Code.FAIL,
                    msg: util.format("Hội quán của bạn cần %s gold để nhận lời khiêu chiến. Vui lòng góp thêm quỹ hội!", action.numBoard * action.numMatch * action.bet)
                  })
                }
                // if (targetGuild.numMember < action.numBoard){
                //   return Promise.reject({ec: Code.FAIL, msg: util.format("Hội quán của bạn cần tối thiểu %s thành viên để thi đấu với %s bàn đấu. Vui lòng mời thêm thành viên để chấp nhận lời khiêu chiến này", action.numBoard, action.numBoard)});
                // }
                currentGuild.sIcon = utils.JSONParse(currentGuild.sIcon, {});
                targetGuild.sIcon = utils.JSONParse(targetGuild.sIcon, {});
                currentGuildName = currentGuild.name;
                targetGuildName = targetGuild.name;
                return pomelo.app.get('mysqlClient')
                  .sequelize
                  .transaction(function (t) {
                    return pomelo.app.get('mysqlClient')
                      .Tournament
                      .create({
                        type: consts.TOUR_TYPE.FRIENDLY,
                        tourType: 1,
                        fee: action.bet,
                        name: action.name,
                        status: consts.TOUR_STATUS.STARTED,
                        rule: consts.GAME_MAP[action.gameId],
                        numBoard: action.numBoard,
                        numMatch: action.numMatch,
                        beginTime: new Date(),
                        endTime: moment(action.time).toDate(),
                        guild1: JSON.stringify(currentGuild),
                        guild2: JSON.stringify(targetGuild),
                        guildId1: currentGuild.id,
                        guildId2: targetGuild.id,
                        schedule: action.time / 1000 | 0
                      }, {transaction: t})
                      .then(function (tu) {
                        tour = tu;
                        return pomelo.app.get('mysqlClient')
                          .TourTableConfig
                          .create({
                            gameId: action.gameId,
                            bet: action.bet,
                            totalTime: action.totalTime,
                            turnTime: action.turnTime,
                            timeWait: 5 * 60 * 1000,
                            level: 0,
                            tourTimeWait: 10 * 60 * 1000,
                            showKill: action.showKill || 0,
                            mustWin: 0,
                            lockMode: lodash.isArray(action.lockMode) ? action.lockMode.join(',') : '',
                            matchPlay: action.numMatch || 2
                          }, {transaction: t})
                      })
                      .then(function (config) {
                        tableConfig = config;
                        return pomelo.app.get('mysqlClient')
                          .TourSchedule
                          .create({
                            matchTime: action.time / 1000 | 0,
                            matchmaking: 1,
                            show: 1
                          }, {transaction: t})
                      })
                      .then(function (s) {
                        schedule = s;
                        return pomelo.app.get('mysqlClient')
                          .TourRound
                          .create({
                            tourId: tour.tourId,
                            scheduleId: schedule.id,
                            tableConfigId: tableConfig.id,
                            name: "Vòng chung kết",
                            status: 0,
                            numGroup: 0,
                            numRound: 1,
                            type: 1,
                            showMember: 1
                          }, {transaction: t})
                      })
                      .then(function (r) {
                        round = r;
                        return pomelo.app.get('mysqlClient')
                          .TourSchedule
                          .update({
                            roundId: round.id
                          }, {
                            where: {
                              id: round.scheduleId
                            },
                            transaction: t
                          })
                      })
                      .then(function () {
                        return pomelo.app.get('mysqlClient')
                          .Tournament
                          .update({
                            roundId: round.id
                          }, {
                            where: {
                              tourId: tour.tourId
                            },
                            transaction: t
                          })
                      })
                      .then(function () {
                        return pomelo.app.get('mysqlClient')
                          .GuildBattle
                          .update({
                            allow : 1,
                            tourId : tour.tourId
                          }, {
                            where : {
                              actionId : action.id,
                              guildId1 : action.currentGuildId
                            },
                            transaction : t
                          })
                      })
                  })
                  .then(function () {
                    console.log('tạo bàn thi đấu cho giải giao hữu');
                    var tourManager = pomelo.app.get('tourManager');
                    for (var i = 0; i < action.numBoard; i++) {
                      var dataCreateTable = {
                        index: i + 1,
                        tourType: consts.TOUR_TYPE.FRIENDLY,
                        gameId: action.gameId,
                        roundId: tour.roundId,
                        guildId: [action.currentGuildId, action.targetGuildId],
                        guildName : [currentGuildName, targetGuildName],
                        matchTime: action.time / 1000 | 0,
                        timePlay: action.matchTime / 1000 | 0,
                        mustWin: 0,
                        scheduleId: schedule.id,
                        battleType: consts.TOUR_BATTLE_TYPE.THUY_SY,
                        tc: {
                          gameId: action.gameId,
                          bet: action.bet,
                          totalTime: action.totalTime,
                          turnTime: action.turnTime,
                          timeWait: action.timeWait || 2 * 60 * 1000,
                          tourTimeWait: action.tourTimeWait || 2 * 60 * 1000,
                          showKill: 0,
                          level: action.level || 0,
                          lockMode: action.lockMode || [],
                          mustWin: action.mustWin || 0,
                          caroOpen: action.caroOpen || 1
                        },
                        lockMode: action.lockMode,
                        username: [],
                        fullname: [],
                        tourId: tour.tourId,
                        player: JSON.stringify([
                          {
                            avatar: utils.JSONParse(targetGuild.icon),
                            fullname: ''
                          },
                          {
                            avatar: utils.JSONParse(currentGuild.icon),
                            fullname: ''
                          }
                        ])
                      };
                      tourManager.createTable(dataCreateTable)
                    }
                  })
              })
              .then(function () {
                GuildDao.addEvent({
                  guildId: action.currentGuildId,
                  uid: uid,
                  fullname: fullname,
                  type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD,
                  content: util.format('Hội quán "%s" đã chấp nhận lời thách đấu. Mọi người cùng tham gia đấu trường vào lúc %s', targetGuildName, moment(action.time).format('HH:mm DD/MM'))
                });
                GuildDao.addEvent({
                  guildId: action.targetGuildId,
                  uid: uid,
                  fullname: fullname,
                  type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD,
                  content: util.format('Hội trưởng đã chấp nhận lời thách đấu từ hội quán "%s". Mọi người cùng tham gia đấu trường vào lúc %s', targetGuildName, moment(action.time).format('HH:mm DD/MM'))
                })
              })
              .then(function () {
                var timePlay = moment(action.time).format('HH:mm DD/MM');
                pomelo.app.get('redisCache')
                  .set(redisKeyUtil.getGuildDuelSuccess(action.currentGuildId, action.targetGuildId), 1);
                pomelo.app.get('redisCache')
                  .expire(redisKeyUtil.getGuildDuelSuccess(action.currentGuildId, action.targetGuildId), 24 * 60 * 60 + ((action.time - Date.now()) / 1000 | 0));
                // gửi thông báo đến các thành viên trong hội quán
                pomelo.app.get('chatService')
                  .sendMessageToGroup(redisKeyUtil.getChatGuildName(action.currentGuildId), {
                    type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
                    title: "Hội quán",
                    msg: util.format('Hội quán "%s" đã chấp nhận lời mời giao hữu vào hồi %s', targetGuildName, timePlay),
                    buttonLabel: "Ok",
                    command: {target: consts.NOTIFY.TARGET.NORMAL},
                    image: consts.NOTIFY.IMAGE.NORMAL
                  }, 'onNotify');
                pomelo.app.get('chatService')
                  .sendMessageToGroup(redisKeyUtil.getChatGuildName(action.targetGuildId), {
                    type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
                    title: "Hội quán",
                    msg: util.format('Hội chủ đã đồng ý lời mời giao hữu với hội quán "%s" vào hồi %s', currentGuildName, timePlay),
                    buttonLabel: "Ok",
                    command: {target: consts.NOTIFY.TARGET.NORMAL},
                    image: consts.NOTIFY.IMAGE.NORMAL
                  }, 'onNotify');
                ActionDao.removeAction({type: consts.ACTION_ID.TOURNAMENT_DUEL}, uid);
                pomelo.app.get('mysqlClient')
                  .GuildBattle
                  .findAll({
                    where: {
                      $or: [
                        {guildId1: action.targetGuildId},
                        {guildId2: action.targetGuildId}
                      ],
                      time: {
                        $gte: new Date(),
                        $lte: moment(action.time).add(4, 'hours').toDate()
                      },
                      allow: null
                    },
                    attributes: ['guildId1', 'guildId2', 'actionId'],
                    raw: true
                  })
                  .each(function (battle) {
                    console.log('battle : ', battle);
                    // if (battle.guildId1 === action.targetGuildId){
                    //   GuildDao.addEvent({
                    //       guildId: battle.guildId1,
                    //       uid: uid,
                    //       fullname: '',
                    //       content: util.format('Huỷ lời mời giao hữu với hội quán', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.first['User.fullname'], tour.name),
                    //       type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
                    //     });
                    //   GuildDao.addEvent({
                    //     guildId: battle.guildId1,
                    //     uid: uid,
                    //     fullname: '',
                    //     content: util.format('Chúc mừng %s [%s] đã vô địch giải đấu "%s" ', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.first['User.fullname'], tour.name),
                    //     type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
                    //   })
                    // }else {
                    //   GuildDao.addEvent({
                    //     guildId: battle.guildId1,
                    //     uid: uid,
                    //     fullname: '',
                    //     content: util.format('Chúc mừng %s [%s] đã vô địch giải đấu "%s" ', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.first['User.fullname'], tour.name),
                    //     type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
                    //   });
                    //   GuildDao.addEvent({
                    //     guildId: battle.guildId1,
                    //     uid: uid,
                    //     fullname: '',
                    //     content: util.format('Chúc mừng %s [%s] đã vô địch giải đấu "%s" ', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.first['User.fullname'], tour.name),
                    //     type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
                    //   })
                    // }
                    GuildDao.removeAction(battle.guildId2, {
                      type: consts.ACTION_ID.TOURNAMENT_DUEL,
                      id: battle.actionId
                    });
                    pomelo.app.get('mysqlClient')
                      .GuildBattle
                      .update({
                        allow: 0,
                        tourId: tour.tourId
                      }, {
                        where: {
                          actionId: battle.actionId
                        }
                      });
                  });
                pomelo.app.get('mysqlClient')
                  .GuildBattle
                  .findAll({
                    where: {
                      $or: [
                        {guildId1: action.currentGuildId},
                        {guildId2: action.currentGuildId}
                      ],
                      time: {
                        $gte: new Date(),
                        $lte: moment(action.time).add(4, 'hours').toDate()
                      },
                      allow: null
                    },
                    attributes: ['guildId1', 'guildId2', 'actionId'],
                    raw: true
                  })
                  .each(function (battle) {
                    console.log('battle : ', battle);
                    // if (battle.guildId1 === action.targetGuildId){
                    //   GuildDao.addEvent()
                    //   GuildDao.addEvent()
                    // }else {
                    //   GuildDao.addEvent()
                    //   GuildDao.addEvent()
                    // }
                    GuildDao.removeAction(battle.guildId2, {
                      type: consts.ACTION_ID.TOURNAMENT_DUEL,
                      id: battle.actionId
                    });
                    pomelo.app.get('mysqlClient')
                      .GuildBattle
                      .update({
                        allow: 0,
                        tourId: tour.tourId
                      }, {
                        where: {
                          actionId: battle.actionId
                        }
                      });
                  });
              })
              .finally(function () {
                // tour = null;
                tableConfig = null;
                schedule = null;
                round = null;
              })
          }
          else {
            return Promise
              .delay(0)
              .then(function () {
                return [
                  pomelo.app.get('mysqlClient')
                    .Guild
                    .findOne({
                      where: {id: action.currentGuildId},
                      attributes: ['name', 'sIcon', 'gold', 'icon', 'id'],
                      raw: true
                    }),
                  pomelo.app.get('mysqlClient')
                    .Guild
                    .findOne({
                      where: {id: action.targetGuildId},
                      attributes: ['name', 'sIcon', 'gold', 'icon', 'id'],
                      raw: true
                    })
                ]
              })
              .spread(function (guild1, guild2) {
                GuildDao.pushToPresident(action.currentGuildId, {
                  type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
                  title: "Hội quán",
                  msg: util.format('Hội quán %s đã từ chối lời mời khiêu chiến của bạn', guild2.name),
                  buttonLabel: "Ok",
                  command: {target: consts.NOTIFY.TARGET.NORMAL},
                  image: consts.NOTIFY.IMAGE.NORMAL
                }, 'onNotify');
                GuildDao.addEvent({
                  guildId: action.currentGuildId,
                  uid: session.uid,
                  fullname: fullname,
                  content: util.format('Hội quán "%s" đã từ chối lời mời giao hữu vào lúc %s', guild2.name, moment(action.time).format('HH:mm DD/MM')),
                  type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
                });
                GuildDao.addEvent({
                  guildId: action.targetGuildId,
                  uid: session.uid,
                  fullname: fullname,
                  content: util.format('Hội chủ đã từ chối lời mời giao hữu từ hội quán "%s"', guild1.name),
                  type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
                });
                pomelo.app.get('redisCache')
                  .set(redisKeyUtil.getGuildDuelFail(action.currentGuildId, action.targetGuildId), 1);
                pomelo.app.get('redisCache')
                  .expire(redisKeyUtil.getGuildDuelFail(action.currentGuildId, action.targetGuildId), 24 * 60 * 60);
                return pomelo.app.get('mysqlClient')
                  .GuildBattle
                  .update({
                    allow: 0
                  }, {
                    where: {
                      guildId1: action.currentGuildId,
                      guildId2: action.targetGuildId
                    }
                  });
              });
          }
        // action invite;
      }
    })
    .then(function () {
      ActionDao.removeAction({id: action.id}, uid);
      return utils.invokeCallback(next, null, {});
    })
    .catch(function (err) {
      console.error('actionHandler : ', err);
      pomelo.app.get('statusService').pushByUids([uid], 'onNotify', action);
      return utils.invokeCallback(next, null, {ec: err.ec || Code.FAIL, msg: err.msg || Code.FAIL})
    })
};
