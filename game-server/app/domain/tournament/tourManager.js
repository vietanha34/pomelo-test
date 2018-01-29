/**
 * Created by vietanha34 on 1/9/15.
 */

var pomelo = require('pomelo');
var utils = require('../../util/utils');
var lodash = require('lodash');
var TourDao = require('../../dao/tourDao');
var Promise = require('bluebird');
var consts = require('../../consts/consts');
var UserDao = require('../../dao/userDao');
var Code = require('../../consts/code');
var Notify = require('../../dao/notifyDao');
var util = require('util');
var moment = require('moment');
var GuildDao = require('../../dao/GuildDao');
var NotifyDao = require('../../dao/notifyDao')
var redisKeyUtil = require('../../util/redisKeyUtil')


var TourManager = function (opts) {
  opts = opts || {};
  this.tours = {};
  this.app = opts.app;
  this.status = false;
  this.interval = opts.interval || 60000;
  this.serverType = opts.serverType || 'tournament';
};

module.exports = TourManager;

var pro = TourManager.prototype;

pro.init = function () {
  var self = this;
  if (this.status) return;
  this.status = true
  var curServer = pomelo.app.curServer;
  // quét hệ thống xem có giải đấu nào sắp diễn ra k
  if (curServer.serverType !== this.serverType) {
    return
  }
  return pomelo.app.get('mysqlClient')
    .Tournament
    .findAll({
      where: {
        status: {
          $ne: consts.TOUR_STATUS.FINISHED
        },
      },
      raw: true
    })
    .each(function (tour) {
      var tableConfig, round;
      if (!tour) return;
      console.error('init tour : ', tour);
      return TourDao.getTourRound({
        where: {
          id: tour.roundId
        },
        raw: true
      })
        .then(function (r) {
          console.error('init round : ', r);
          round = r;
          if (!round || round.length < 1) return Promise.reject();
          round = round[0];
          return pomelo.app.get('mysqlClient')
            .TourTableConfig
            .findOne({
              where: {
                id: round.tableConfigId
              },
              raw: true
            })
        })
        .then(function (tc) {
          console.error('init tableconfig : ', tc);
          tableConfig = tc;
          return TourDao.getTourTable({
            where: {
              tourId: tour.tourId,
              stt: {
                $lt: consts.BOARD_STATUS.FINISH
              }
            },
            raw: true
          })
        })
        .each(function (table) {
          return Promise.props({
            player1: pomelo.app.get('mysqlClient').User.findOne({
              where: {
                uid: table.player1
              },
              raw: true
            }),
            player2: pomelo.app.get('mysqlClient').User.findOne({
              where: {
                uid: table.player2
              },
              raw: true
            })
          })
            .then(function (data) {
              console.error("create bàn chơi");
              var player1 = data.player1;
              var player2 = data.player2;
              var dataCreateTable = {
                gameId: table.gameId,
                tourId: table.tourId,
                roundId: tour.roundId,
                boardId: table.boardId,
                serverId: table.serverId,
                groupId: table.groupId,
                scheduleId: table.scheduleId,
                matchTime: moment(table.matchTime).unix(),
                matchPlay: tour.numMatch,
                index: table.index,
                battleType: round ? round.battleType : consts.TOUR_BATTLE_TYPE.THUY_SY,
                tourType: tour.type,
                tc : tableConfig
              };
              if (player1 && player2 && tour.type === consts.TOUR_TYPE.NORMAL) {
                dataCreateTable['uid'] = [table.player1, table.player2];
                dataCreateTable['username'] = [player1.username, player2.username];
                dataCreateTable['fullname'] = [player1.fullname, player2.fullname];
                var player = utils.JSONParse(table.player);
                for (var i = 0, len = player.length; i < len; i++) {
                  player[i].inBoard = 0;
                }
              } else {
                player = [{}, {}];
                dataCreateTable['guildId'] = [table.player1, table.player2];
              }
              dataCreateTable['player'] = player;
              self.createTable(dataCreateTable);
            });
          // tạo lại các bàn chơi chưa đc đấu
        });
    })
};

pro.matchMaking = function (tourId) {
  var tour, tableConfig, round;
  var self = this;
  TourDao.getTour({
    where: {tourId: tourId},
    raw: true
  })
    .then(function (t) {
      tour = t;
      if (!tour) {
        return Promise.reject({msg: "Không có tour nào"});
      }
      return TourDao.getTourRound({
        where: {
          id: tour.roundId
        },
        raw: true
      })
    })
    .then(function (r) {
      round = r;
      if (!round) {
        return Promise.reject({msg: " không có vòng đấu nào "})
      }
      round = round.length < 1 ? {} : round[0];
      return [
        pomelo.app.get('mysqlClient')
          .TourTableConfig
          .findOne({
            where: {
              id: round.tableConfigId
            },
            raw: true
          }),
        TourDao.getTourGroup({
          where: {
            roundId: round.id
          },
          raw: true
        }),
        pomelo.app.get('mysqlClient')
          .TourSchedule
          .findOne({
            where: {
              id: round.scheduleId
            },
            raw: true
          })
      ]
    })
    .spread(function (tc, groups, schedule) {
      if (!tc) return Promise.reject({msg: "không có table config tương ứng"});
      if (!schedule) return Promise.reject({msg: "không có lượt đấu nào phù hợp"});
      if (schedule.matchMaking) return Promise.reject({msg: 'Đã tạo lượt đấu thành công'});
      tableConfig = tc;
      schedule = schedule || {};
      var hallConfigs = pomelo.app.get('dataService').get('hallConfig').data;
      var hallConfig = hallConfigs['' + tc.gameId + consts.HALL_ID.CAO_THU];
      return Promise.each(groups, function (group) {
        return Promise.delay(0)
          .then(function () {
            return [
              TourDao.getTourProfile({
                where: {
                  groupId: group.id,
                  status: 0
                },
                include: {
                  model: pomelo.app.get('mysqlClient').User,
                  attributes: ['fullname', 'avatar', 'sex', 'username', 'uid']
                },
                order: 'point DESC',
                raw: true
              }),
              TourDao.getTourTable({
                where: {
                  groupId: group.id
                },
                attributes: ['player1', 'player2'],
                raw: true
              }),
              Promise.resolve(group)
            ]
          })
          .spread(function (profiles, tables, group) {
            var game = pomelo.app.game;
            if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE) {
              var matchUid = [];
              var updateRound = {};
              switch (round.numRound) {
                case 0: // vòng loại đầu tiên 1/8
                  if (!group.player1 || !group.player2) {
                    if (!group.player1 && group.player2) {
                      updateRound['player9'] = group.player2;
                      pomelo.app.get('mysqlClient')
                        .TourProfile
                        .update({
                          rank: 9
                        }, {
                          where: {
                            uid: group.player2,
                            groupId: group.id
                          }
                        })
                    } else if (group.player1 && !group.player2) {
                      updateRound['player9'] = group.player1;
                    }
                  }
                  if (!group.player3 || !group.player4) {
                    if (!group.player3 && group.player4) {
                      updateRound['player10'] = group.player4;
                    } else if (group.player3 && !group.player4) {
                      updateRound['player10'] = group.player3;
                    }
                  }
                  if (!group.player5 || !group.player6) {
                    if (!group.player5 && group.player6) {
                      updateRound['player11'] = group.player6;
                    } else if (group.player5 && !group.player6) {
                      updateRound['player11'] = group.player5;
                    }
                  }
                  if (!group.player7 || !group.player8) {
                    if (!group.player7 && group.player8) {
                      updateRound['player12'] = group.player8;
                    } else if (group.player7 && !group.player8) {
                      updateRound['player12'] = group.player7;
                    }
                  }
                  matchUid.push([group.player1, group.player2]);
                  matchUid.push([group.player3, group.player4]);
                  matchUid.push([group.player5, group.player6]);
                  matchUid.push([group.player7, group.player8]);
                  break;
                case 1: // vòng bán kết 1/4
                  if (!group.player9 || !group.player10) {
                    if (!group.player9 && group.player10) {
                      updateRound['player13'] = group.player10;
                      pomelo.app.get('mysqlClient')
                        .TourProfile
                        .update({
                          rank: 13
                        }, {
                          where: {
                            uid: group.player10,
                            groupId: group.id
                          }
                        })
                    } else if (group.player9 && !group.player10) {
                      updateRound['player13'] = group.player9;
                      pomelo.app.get('mysqlClient')
                        .TourProfile
                        .update({
                          rank: 13
                        }, {
                          where: {
                            uid: group.player9,
                            groupId: group.id
                          }
                        })
                    }
                  }
                  if (!group.player11 || !group.player12) {
                    if (!group.player11 && group.player12) {
                      updateRound['player14'] = group.player12;
                      pomelo.app.get('mysqlClient')
                        .TourProfile
                        .update({
                          rank: 14
                        }, {
                          where: {
                            uid: group.player12,
                            groupId: group.id
                          }
                        })
                    } else if (group.player11 && !group.player12) {
                      updateRound['player14'] = group.player11;
                      pomelo.app.get('mysqlClient')
                        .TourProfile
                        .update({
                          rank: 14
                        }, {
                          where: {
                            uid: group.player11,
                            groupId: group.id
                          }
                        })
                    }
                  }
                  matchUid.push([group.player9, group.player10]);
                  matchUid.push([group.player11, group.player12]);
                  break;
                case 2: // trận chung kết 1/2
                  if (!group.player13 || !group.player14) {
                    if (!group.player13 && group.player14) {
                      updateRound['player15'] = group.player14;
                      pomelo.app.get('mysqlClient')
                        .TourProfile
                        .update({
                          rank: 15
                        }, {
                          where: {
                            uid: group.player14,
                            groupId: group.id
                          }
                        })
                    } else if (group.player13 && !group.player14) {
                      updateRound['player15'] = group.player13;
                      pomelo.app.get('mysqlClient')
                        .TourProfile
                        .update({
                          rank: 15
                        }, {
                          where: {
                            uid: group.player13,
                            groupId: group.id
                          }
                        })
                    }
                    var championUid = updateRound['player15'];
                    // tính toán người chơi vô địch
                    var top = [];
                    var uids = [group.player9, group.player10, group.player11, group.player12];
                    var secondUid = group.player14 === championUid ? group.player13 : group.player14;
                    top.push(championUid);
                    top.push(secondUid);
                    var thirdUid, fourUid;
                    for (i = 0, len = uids.length; i < len; i++) {
                      var uid = uids[i];
                      if (!thirdUid) {
                        if (uid !== championUid && secondUid !== uid) {
                          thirdUid = uid;
                          top.push(thirdUid);
                        }
                      } else {
                        if (uid !== championUid && secondUid !== uid && championUid !== uid) {
                          fourUid = uid;
                          top.push(fourUid);
                        }
                      }
                    }
                    top = top.reverse();
                    top = lodash.compact(top);
                    return self.finishTour({
                      tourId: tour.tourId,
                      top: top
                    });
                  }
                  matchUid.push([group.player13, group.player14]);
                  break;
              }
              if (Object.keys(updateRound).length > 0) {
                pomelo.app.get('mysqlClient')
                  .TourGroup
                  .update(updateRound, {
                    where: {
                      id: group.id
                    }
                  })
              }
              var index = 0;
              return Promise.each(matchUid, function (match) {
                if (!match[0] || !match[1]) return Promise.resolve({});
                return Promise.map(match, function (uid) {
                  return UserDao.getUserProperties(uid, ['username', 'fullname', 'avatar', 'sex', 'uid'])
                })
                  .then(function (players) {
                    console.log('players : ', players);
                    var player1 = players[0];
                    var player2 = players[1];
                    index = index + 1;
                    var params = utils.clone(tc);
                    params.username = [player1['username'], player2['username']];
                    params.fullname = [player1['fullname'], player2['fullname']];
                    params.timePlay = schedule.matchTime * 1000;
                    params.index = index;
                    params.tourId = tour.tourId;
                    params.lockMode = lodash.map(lodash.compact((params.lockMode || '').split(',')), function (lock) {
                      return parseInt(lock)
                    });
                    if (params.lockMode.length >= 1) {
                      params.hallId = consts.HALL_ID.LIET_CHAP
                    }
                    params.roomId = 1000;
                    console.log('params matchMaking: ', params);
                    return Promise.delay(0)
                      .then(function () {
                        return game.boardManager.createRoomTournament(hallConfig, null, params);
                      })
                      .then(function (data) {
                        console.log('createRoomTournament : ', data);
                        var opts = {
                          boardId: data.boardId,
                          serverId: data.serverId,
                          gameId: tc.gameId,
                          index: index,
                          bet: tc.bet,
                          numPlayer: 2,
                          status: consts.BOARD_STATUS.NOT_STARTED,
                          groupId: group.id,
                          scheduleId: schedule.id,
                          matchTime: schedule.matchTime,
                          tourId: tour.tourId,
                          roundId: round.id,
                          player1: player1.uid,
                          player2: player2.uid,
                          player: JSON.stringify([
                            {
                              fullname: player1['fullname'],
                              avatar: utils.JSONParse(player1['avatar']),
                              sex: player1['sex'],
                              inBoard: 0,
                              uid: player1['uid'],
                              point: player1.point
                            },
                            {
                              fullname: player2['fullname'],
                              avatar: utils.JSONParse(player2['avatar']),
                              uid: player2['uid'],
                              sex: player2['sex'],
                              inBoard: 0,
                              point: player2.point
                            }
                          ])
                        };
                        console.log('createTourTable opts : ', opts);
                        TourDao.createTable(opts);
                      })
                  });
              });
            }
            var mapEnemy = {}, i, len;
            for (i = 0, len = tables.length; i < len; i++) {
              var table = tables[i];
              console.log('table : ', table);
              //player1
              if (mapEnemy[table.player1]) {
                if (mapEnemy[table.player1][table.player2]) {
                  mapEnemy[table.player1][table.player2] += 1;
                } else {
                  mapEnemy[table.player1][table.player2] = 1;
                }
              } else {
                mapEnemy[table.player1] = {};
                mapEnemy[table.player1][table.player2] = 1;
              }
              // player2
              if (mapEnemy[table.player2]) {
                if (mapEnemy[table.player2][table.player1]) {
                  mapEnemy[table.player2][table.player1] += 1;
                } else {
                  mapEnemy[table.player2][table.player1] = 1;
                }
              } else {
                mapEnemy[table.player2] = {};
                mapEnemy[table.player2][table.player1] = 1;
              }
            }
            var profilesClone = utils.clone(profiles);
            var matchs = [];
            while (profilesClone.length >= 2) {
              var profile = profilesClone.splice(0, 1)[0];
              var enemyIndex = 0;
              for (i = 0, len = profilesClone.length; i < len; i++) {
                if (!mapEnemy[profile.uid] || !mapEnemy[profile.uid][profilesClone[i].uid]) {
                  enemyIndex = i;
                  break;
                }
              }
              console.log('enemyIndex :', profile.uid, enemyIndex, mapEnemy);
              var enemy = profilesClone.splice(enemyIndex, 1)[0];
              matchs.push([profile, enemy]);
            }
            if (profilesClone.length === 1) {
              pomelo.app.get('mysqlClient')
                .TourProfile
                .update({
                  point: pomelo.app.get('mysqlClient').sequelize.literal('point + ' + 2)
                }, {
                  where: {
                    uid: profilesClone[0].uid,
                    tourId: tour.tourId,
                    groupId: group.id
                  }
                })
            }
            console.log('matchs : ', matchs);
            return Promise.map(matchs, function (match, i) {
              var player1 = match[0];
              var player2 = match[1];
              var params = utils.clone(tc);
              params.username = [player1['User.username'], player2['User.username']];
              params.fullname = [player1['User.fullname'], player2['User.fullname']];
              params.timePlay = schedule.matchTime * 1000;
              params.index = i + 1;
              params.tourId = tour.tourId;
              params.mustWin = round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE ? 1 : params.mustWin;
              params.lockMode = lodash.map(lodash.compact((params.lockMode || '').split(',')), function (lock) {
                return parseInt(lock)
              });
              if (params.lockMode.length >= 1) {
                params.hallId = consts.HALL_ID.LIET_CHAP
              }
              params.roomId = 1000;
              console.log('params Matchmaking: ', params);
              return Promise.delay(0)
                .then(function () {
                  return game.boardManager.createRoomTournament(hallConfig, null, params);
                })
                .then(function (data) {
                  console.log('createRoomTournament : ', data);
                  var opts = {
                    boardId: data.boardId,
                    serverId: data.serverId,
                    gameId: tc.gameId,
                    index: i + 1,
                    bet: tc.bet,
                    numPlayer: 2,
                    status: consts.BOARD_STATUS.NOT_STARTED,
                    groupId: group.id,
                    scheduleId: schedule.id,
                    tourId: tour.tourId,
                    roundId: round.id,
                    matchTime: moment(schedule.matchTime * 1000).toDate(),
                    player1: player1.uid,
                    player2: player2.uid,
                    player: JSON.stringify([
                      {
                        fullname: player1['User.fullname'],
                        avatar: utils.JSONParse(player1['User.avatar']),
                        inBoard: 0,
                        uid: player1['User.uid'],
                        point: player1.point
                      },
                      {
                        fullname: player2['User.fullname'],
                        avatar: utils.JSONParse(player2['User.avatar']),
                        uid: player2['User.uid'],
                        inBoard: 0,
                        point: player2.point
                      }
                    ])
                  };
                  console.log('createTourTable opts : ', opts);
                  return TourDao.createTable(opts);
                })
            });
          })
      })
    })
    .then(function () {
      // tạo bàn thành công
      return [pomelo.app.get('mysqlClient')
        .TourSchedule
        .update({
          matchMaking: 1
        }, {
          where: {
            id: round.scheduleId
          }
        }),
        pomelo.app.get('mysqlClient')
          .TourRound
          .update({
            numRound: pomelo.app.get('mysqlClient').sequelize.literal('numRound + ' + 1)
          }, {
            where: {
              id: round.id
            }
          })
      ]
    })
    .catch(function (err) {
      console.error('matchMaking err : ', err);
    })
    .finally(function () {
      round = null;
      tour = null;
    })
};

pro.calPoint = function (tourId) {
  var tour, round, self = this;
  return pomelo.app.get('mysqlClient')
    .Tournament
    .findOne({
      where: {tourId: tourId},
      raw: true
    })
    .then(function (t) {
      tour = t;
      if (!tour) return Promise.reject();
      return TourDao.getTourRound({
        where: {
          id: tour.roundId
        },
        raw: true
      })
    })  // tour
    .then(function (r) {
      round = r;
      if (!round || round.length < 1) return Promise.reject();
      round = round[0];
      return TourDao.getTourTable({
        where: {
          tourId: tourId,
          scheduleId: round.scheduleId
        },
        raw: true
      })
    }) // round
    .mapSeries(function (table) {
      if (table.calPoint) return;
      pomelo.app.get('mysqlClient')
        .TourTable
        .update({
          calPoint: 1,
          stt: consts.BOARD_STATUS.FINISH
        }, {
          where: {
            boardId: table.boardId
          }
        });
      if (round.battleType === consts.TOUR_BATTLE_TYPE.THUY_SY) {
        var score = table.score.split('-');
        score = lodash.map(score, function (s) {
          return parseFloat(s.trim());
        });
        var win = lodash.map(table.win.split('-'), function (s) {
          return parseInt(s.trim());
        });
        var draw = lodash.map(table.draw.split('-'), function (s) {
          return parseInt(s.trim());
        });
        var lose = lodash.map(table.lose.split('-'), function (s) {
          return parseInt(s.trim());
        });
        Promise.delay(0)
          .then(function () {
            var result = [];
            for (var i = 1, len = win.length; i <= len; i++) {
              var winWithoutEnemy = score[i - 1] - (win[i - 1] + draw[i - 1] * 0.5);
              var loseWithoutEnemy = score[!(i - 1 ) ? 1 : 0] - (lose[i - 1] + draw[i - 1] * 0.5);
              var updateData = {
                point: pomelo.app.get('mysqlClient').sequelize.literal('point + ' + score[i - 1]),
                win: pomelo.app.get('mysqlClient').sequelize.literal('win + ' + win[i - 1]),
                draw: pomelo.app.get('mysqlClient').sequelize.literal('draw + ' + draw[i - 1]),
                lose: pomelo.app.get('mysqlClient').sequelize.literal('lose + ' + lose[i - 1])
              };
              if (winWithoutEnemy) updateData['winWithoutEnemy'] = pomelo.app.get('mysqlClient').sequelize.literal('winWithoutEnemy + ' + winWithoutEnemy);
              if (loseWithoutEnemy) updateData['loseWithoutEnemy'] = pomelo.app.get('mysqlClient').sequelize.literal('loseWithoutEnemy + ' + loseWithoutEnemy);
              result.push(pomelo.app.get('mysqlClient')
                .TourProfile
                .update(updateData, {
                  where: {
                    uid: table['player' + i],
                    roundId: table.roundId
                  }
                }))
            }
            return result
          })
          .spread(function () {
            return pomelo.app.get('mysqlClient')
              .TourProfile
              .findOne({
                where: {
                  groupId: table.groupId
                },
                include: [
                  {
                    model: pomelo.app.get('mysqlClient').User,
                    attributes: ['avatar']
                  }
                ],
                raw: true,
                order: 'point DESC'
              })
              .then(function (profile) {
                if (profile && profile['User.avatar']) {
                  pomelo.app.get('mysqlClient')
                    .TourGroup
                    .update({
                      avatar: profile['User.avatar']
                    }, {
                      where: {
                        id: table.groupId
                      }
                    })
                }
              })
          })
      }
      else {
        // tính toán đấu trường loại trực tiếp
        return Promise.delay(0)
          .then(function () {
            return [pomelo.app.get('mysqlClient')
              .TourProfile
              .findOne({
                where: {
                  tourId: tourId,
                  uid: table.player1,
                  groupId: table.groupId
                },
                include: [
                  {
                    model: pomelo.app.get('mysqlClient').User,
                    attributes: ['fullname', 'uid']
                  }
                ],
                raw: true
              }),
              pomelo.app.get('mysqlClient')
                .TourProfile
                .findOne({
                  where: {
                    tourId: tourId,
                    uid: table.player2,
                    groupId: table.groupId
                  },
                  include: [
                    {
                      model: pomelo.app.get('mysqlClient').User,
                      attributes: ['fullname', 'uid']
                    }
                  ],
                  raw: true
                })
            ]
          })
          .spread(function (player1, player2) {
            console.log('player1, player2 : ', arguments);
            if (round.type === consts.TOUR_ROUND_TYPE.FINAL) {
              pomelo.app.get('mysqlClient')
                .TourHistory
                .create({
                  firstPlayerName: player1['User.fullname'],
                  firstPlayerUid: player1['uid'],
                  secondPlayerName: player2['User.fullname'],
                  secondPlayerUid: player2['uid'],
                  result: table.score,
                  tourId: tour.tourId,
                  match: table.match,
                  round: round.numRound
                });
            }
            if (table.winner) {
              if (table.player1 === table.winner) {
                profile = player1
              } else {
                profile = player2
              }
            } else {
              return
            }
            var newRank;
            if (profile.rank >= 1 && profile.rank <= 2) {
              newRank = 9
            } else if (profile.rank >= 3 && profile.rank <= 4) {
              newRank = 10
            } else if (profile.rank >= 5 && profile.rank <= 6) {
              newRank = 11
            } else if (profile.rank >= 7 && profile.rank <= 8) {
              newRank = 12
            } else if (profile.rank >= 9 && profile.rank <= 10) {
              newRank = 13
            } else if (profile.rank >= 11 && profile.rank <= 12) {
              newRank = 14
            } else if (profile.rank >= 13 && profile.rank <= 14) {
              newRank = 15
            }
            if (round.type === consts.TOUR_ROUND_TYPE.FINAL && newRank === 15) {
              // finish Tour
              pomelo.app.get('mysqlClient')
                .TourGroup
                .findOne({
                  where: {
                    id: table.groupId
                  },
                  raw: true
                })
                .then(function (group) {
                  if (!group) return;
                  var top = [];
                  var uids = [group.player9, group.player10, group.player11, group.player12];
                  var secondUid = group.player14 === profile.uid ? group.player13 : group.player14;
                  top.push(profile.uid);
                  top.push(secondUid);
                  var thirdUid, fourUid;
                  for (var i = 0, len = uids.length; i < len; i++) {
                    var uid = uids[i];
                    if (!thirdUid) {
                      if (uid !== profile.uid && secondUid !== uid) {
                        thirdUid = uid;
                        top.push(thirdUid);
                      }
                    } else {
                      if (uid !== profile.uid && secondUid !== uid && thirdUid !== uid) {
                        fourUid = uid;
                        top.push(fourUid);
                      }
                    }
                  }
                  top = top.reverse();
                  top = lodash.compact(top);
                  return self.finishTour({
                    tourId: tour.tourId,
                    top: top
                  });
                })
            }
            var updateField = {};
            updateField['player' + newRank] = table.winner;
            return [
              pomelo.app.get('mysqlClient')
                .TourProfile
                .update({
                  rank: newRank
                }, {
                  where: {
                    tourId: tourId,
                    groupId: table.groupId,
                    uid: table.winner
                  }
                }),
              pomelo.app.get('mysqlClient')
                .TourGroup
                .update(updateField, {where: {id: profile.groupId}})
            ]
          })
      }
    })
};

pro.pickUser = function (tourId, prevRoundId, nextRoundId, numPlayer) {
  var tour, prevRound, nextRound;
  numPlayer = numPlayer || 64;
  TourDao.getTour({
    where: {tourId: tourId},
    raw: true
  })
    .then(function (t) {
      tour = t;
      if (!tour) {
        return Promise.reject({msg: "Không có tour nào"});
      }
      return TourDao
        .getTourRound({
          where: {
            $or: [
              {
                id: prevRoundId
              },
              {
                id: nextRoundId
              }
            ]
          },
          raw: true,
          order: 'createdAt ASC'
        })
    })
    .then(function (rounds) {
      if (rounds.length < 2) return Promise.reject();
      prevRound = rounds[0];
      nextRound = rounds[1];
      if (prevRound.numPlayer < numPlayer * prevRound.numGroup) {
        return Promise.reject();
      }
      return TourDao.getTourGroup({
        where: {
          roundId: prevRound.id
        },
        raw: true
      })
    })
    .map(function (group) {
      console.log('group : ', group);
      return TourDao.getTourProfile({
        where: {
          groupId: group.id
        },
        order: 'point DESC, rank DESC',
        raw: true,
        limit: numPlayer
      })
    })
    .then(function (data) {
      console.log('map data : ', data);
      var profiles = [];
      for (var i = 0, len = data.length; i < len; i++) {
        profiles = profiles.concat(data[i]);
      }
      return [
        Promise.resolve(profiles),
        TourDao.getTourGroup({
          where: {
            roundId: nextRound.id
          },
          raw: true,
          attributes: ['id', 'numPlayer']
        }),
        Promise.resolve(nextRound)
      ]
    })
    .spread(function (profiles, groups, round) {
      // cho người chơi vào bảng
      var groupId;
      return Promise.mapSeries(profiles, function (profile) {
        var minNumPlayer = 10000;
        for (var i = 0, len = groups.length; i < len; i++) {
          var group = groups[i];
          if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE && group.numPlayer >= 8) {
            continue
          }
          if (group.numPlayer < minNumPlayer) {
            minNumPlayer = group.numPlayer;
            groupId = group.id
          }
        }
        if (groupId) {
          return pomelo.app.get('mysqlClient')
            .sequelize
            .transaction(function (t) {
              return pomelo.app.get('mysqlClient')
                .TourProfile
                .create({
                  uid: profile.uid,
                  tourId: tour.tourId,
                  groupId: groupId,
                  roundId: nextRoundId,
                  rank: minNumPlayer + 1
                }, {transaction: t})
                .then(function () {
                  var updateData = {
                    numPlayer: pomelo.app.get('mysqlClient').sequelize.literal('numPlayer + ' + 1)
                  };
                  if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE) {
                    updateData['player' + (minNumPlayer + 1)] = profile.uid;
                  }
                  return pomelo.app.get('mysqlClient')
                    .TourGroup
                    .update(updateData, {
                      where: {
                        tourId: tourId,
                        roundId: tour.roundId,
                        id: groupId
                      },
                      transaction: t
                    })
                })
                .then(function () {
                  var index = lodash.findIndex(groups, function (group) {
                    return group.id === groupId;
                  });
                  if (index > -1) {
                    group = groups[index];
                    group.numPlayer += 1;
                  }
                })
            })
        }
        else {
          return Promise.reject({ec: Code.FAIL, msg: 'Không còn bảng đấu nào phù hợp với bạn.'})
        }
      })
        .finally(function () {
          groups = null;
        })
    })
    .catch(function (err) {
      // cộng lại tiền cho người dùng
      console.error('pickUser err : ', err);
    })
};


pro.finishTour = function (msg) {
  var tourId = msg.tourId;
  var top = lodash.isArray(msg.top) ? msg.top : [];
  var tour;
  pomelo.app.get('mysqlClient')
    .Tournament
    .findOne({
      where: {
        tourId: tourId
      },
      raw: true
    })
    .then(function (t) {
      tour = t;
      if (!tour) return;
      return Promise.props({
        first: pomelo.app.get('mysqlClient').TourProfile.findOne({
          where: {uid: top.pop()}, raw: true,
          include: [{model: pomelo.app.get('mysqlClient').User, attributes: ['avatar', 'sex', 'fullname']}]
        }),
        second: pomelo.app.get('mysqlClient').TourProfile.findOne({
          where: {uid: top.pop()}, raw: true,
          include: [{model: pomelo.app.get('mysqlClient').User, attributes: ['avatar', 'sex', 'fullname']}]
        }),
        third: pomelo.app.get('mysqlClient').TourProfile.findOne({
          where: {uid: top.pop()}, raw: true,
          include: [{model: pomelo.app.get('mysqlClient').User, attributes: ['avatar', 'sex', 'fullname']}]
        }),
        four: pomelo.app.get('mysqlClient').TourProfile.findOne({
          where: {uid: top.pop()}, raw: true,
          include: [{model: pomelo.app.get('mysqlClient').User, attributes: ['avatar', 'sex', 'fullname']}]
        }),
        prize: pomelo.app.get('mysqlClient')
          .TourPrize
          .findAll({
            where: {
              tourId: tour.tourId
            },
            attributes: ['gold', ['content', 'text'], ['type', 'stt']],
            order: 'type ASC',
            raw: true
          })
      });
    })
    .then(function (data) {
      console.log('data : ', data);
      var champion = [];
      var prizes = data.prize;
      var prize, prizeIndex;
      if (data.first) {
        prizeIndex = lodash.findIndex(prizes, function (p) {
          if (p.stt === 1) {
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        } else {
          prize = {};
        }
        Notify.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: "Đấu trường",
          msg: util.format('Xin chúc mừng!! Tài khoản "%s" đã đạt giải nhất tại giải đấu "%s". Vui lòng truy cập đấu trường để xem thông tin chi tiết', data.first['User.fullname'], tour.name),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [data.first.uid],
          image: consts.NOTIFY.IMAGE.NORMAL
        });
        champion.push({
          uid: data.first.uid,
          fullname: data.first['User.fullname'],
          avatar: utils.JSONParse(data.first['User.avatar'], {id: 0, version: 0}),
          sex: data.first['User.sex'],
          stt: 1,
          text: prize.text || '',
          gold: prize.gold || 0
        });
        pomelo.app.get('mysqlClient')
          .GuildMember
          .findOne({
            where: {
              uid: data.first.uid,
              role: {
                $lte: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
              }
            },
            include: [
              {
                model: pomelo.app.get('mysqlClient').Guild,
                attributes: ['id']
              }
            ]
          })
          .then(function (member) {
            if (!member) return;
            GuildDao.addEvent({
              guildId: member['Guild.id'],
              uid: data.first.uid,
              fullname: data.first['User.fullname'],
              content: util.format('Chúc mừng %s [%s] đã vô địch giải đấu "%s" ', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.first['User.fullname'], tour.name),
              type: consts.GUILD_EVENT_TYPE.WIN_TOUR
            })
          })
      }
      if (data.second) {
        prizeIndex = lodash.findIndex(prizes, function (p) {
          if (p.stt === 2) {
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        } else {
          prize = {};
        }
        Notify.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: "Đấu trường",
          msg: util.format('Xin chúc mừng!! Tài khoản "%s" đã đạt giải nhì tại giải đấu "%s". Vui lòng vào đấu trường để xem thông tin chi tiết', data.second['User.fullname'], tour.name),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [data.second.uid],
          image: consts.NOTIFY.IMAGE.NORMAL
        });
        champion.push({
          uid: data.second.uid,
          fullname: data.second['User.fullname'],
          avatar: utils.JSONParse(data.second['User.avatar'], {id: 0, version: 0}),
          sex: data.second['User.sex'],
          stt: 2,
          text: prize.text || '',
          gold: prize.gold || 0
        });
        pomelo.app.get('mysqlClient')
          .GuildMember
          .findOne({
            where: {
              uid: data.second.uid,
              role: {
                $lte: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
              }
            },
            include: [
              {
                model: pomelo.app.get('mysqlClient').Guild,
                attributes: ['id']
              }
            ]
          })
          .then(function (member) {
            if (!member) return;
            GuildDao.addEvent({
              guildId: member['Guild.id'],
              uid: data.second.uid,
              fullname: data.second['User.fullname'],
              content: util.format('Chúc mừng %s [%s] đã về nhì giải đấu "%s" ', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.second['User.fullname'], tour.name),
              type: consts.GUILD_EVENT_TYPE.WIN_TOUR
            })
          })
      }
      if (data.third) {
        prizeIndex = lodash.findIndex(prizes, function (p) {
          if (p.stt === 3) {
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        } else {
          prize = {};
        }
        Notify.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: "Đấu trường",
          msg: util.format('Xin chúc mừng!! Tài khoản "%s" đã đạt giải ba tại giải đấu "%s". Vui lòng vào đấu trường để xem thông tin chi tiết', data.third['User.fullname'], tour.name),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [data.third.uid],
          image: consts.NOTIFY.IMAGE.NORMAL
        });
        champion.push({
          uid: data.third.uid,
          fullname: data.third['User.fullname'],
          avatar: utils.JSONParse(data.third['User.avatar'], {id: 0, version: 0}),
          sex: data.third['User.sex'],
          stt: 3,
          text: prize.text || '',
          gold: prize.gold || 0
        });
        pomelo.app.get('mysqlClient')
          .GuildMember
          .findOne({
            where: {
              uid: data.third.uid,
              role: {
                $lte: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
              }
            },
            include: [
              {
                model: pomelo.app.get('mysqlClient').Guild,
                attributes: ['id']
              }
            ]
          })
          .then(function (member) {
            if (!member) return;
            GuildDao.addEvent({
              guildId: member['Guild.id'],
              uid: data.third.uid,
              fullname: data.third['User.fullname'],
              content: util.format('Chúc mừng %s [%s] đã về ba giải đấu "%s" ', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.third['User.fullname'], tour.name),
              type: consts.GUILD_EVENT_TYPE.WIN_TOUR
            })
          })
      }
      if (data.four) {
        prizeIndex = lodash.findIndex(prizes, function (p) {
          if (p.stt === 3) {
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        } else {
          prize = {};
        }
        Notify.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: "Đấu trường",
          msg: util.format('Xin chúc mừng!! Tài khoản "%s" đã đạt giải ba tại giải đấu "%s". Vui lòng vào đấu trường để xem thông tin chi tiết', data.four['User.fullname'], tour.name),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [data.four.uid],
          image: consts.NOTIFY.IMAGE.NORMAL
        });
        champion.push({
          uid: data.four.uid,
          fullname: data.four['User.fullname'],
          avatar: utils.JSONParse(data.four['User.avatar'], {id: 0, version: 0}),
          sex: data.four['User.sex'],
          stt: 3,
          text: prize.text || '',
          gold: prize.gold || 0
        });
        pomelo.app.get('mysqlClient')
          .GuildMember
          .findOne({
            where: {
              uid: data.four.uid,
              role: {
                $lte: consts.GUILD_MEMBER_STATUS.NORMAL_MEMBER
              }
            },
            include: [
              {
                model: pomelo.app.get('mysqlClient').Guild,
                attributes: ['id']
              }
            ]
          })
          .then(function (member) {
            if (!member) return;
            GuildDao.addEvent({
              guildId: member['Guild.id'],
              uid: data.four.uid,
              fullname: data.four['User.fullname'],
              content: util.format('Chúc mừng %s [%s] đã về ba giải đấu "%s" ', consts.GUILD_MEMBER_STATUS_UMAP[member.role], data.four['User.fullname'], tour.name),
              type: consts.GUILD_EVENT_TYPE.WIN_TOUR
            })
          })
      }
      pomelo.app.get('mysqlClient')
        .Tournament
        .update({
          champion: JSON.stringify(champion),
          status: consts.TOUR_STATUS.FINISHED
        }, {
          where: {
            tourId: tour.tourId
          }
        })
    })
    .finally(function () {
      tour = null;
    })
};

/**
 * Chia lại bảng đấu, tăng thêm hoặc giảm đi số lượng bảng đấu
 *
 * @param tourId
 * @param numGroup
 */
pro.splitGroup = function (tourId, numGroup) {
  if (!lodash.isNumber(numGroup) || !numGroup) {
    return
  }
  var tour;
  return TourDao.getTour({
    where: {
      tourId: tourId
    },
    raw: true
  })
    .then(function (t) {
      tour = t;
      if (tour) {
        return pomelo.app.get('mysqlClient')
          .TourGroup
          .destroy({
            where: {
              roundId: tour.roundId
            }
          })
      } else {
        return Promise.reject()
      }
    })
    .then(function () {
      var res = [];
      for (var i = 0; i < numGroup; i++) {
        res.push({
          tourId: tourId,
          index: i + 1,
          roundId: tour.roundId,
          numPlayer: 0
        })
      }
      return [pomelo.app.get('mysqlClient')
        .TourGroup
        .bulkCreate(res),
        TourDao.getTourProfile({
          where: {
            tourId: tourId,
            roundId: tour.roundId
          }
        }),
        pomelo.app.get('mysqlClient')
          .TourRound
          .update({
            numGroup: numGroup
          }, {
            where: {
              id: tour.roundId
            }
          })
      ]
    })
    .spread(function (created, profiles) {
      return [
        TourDao.getTourGroup({
          where: {
            roundId: tour.roundId
          },
          attributes: ['numPlayer', 'id', 'index']
        }),
        Promise.resolve(profiles)
      ]
    })
    .spread(function (groups, profiles) {
      var groupId;
      return Promise.mapSeries(profiles, function (profile) {
        var minNumPlayer = 10000;
        for (var i = 0, len = groups.length; i < len; i++) {
          var group = groups[i];
          if (group.numPlayer < minNumPlayer) {
            minNumPlayer = group.numPlayer;
            groupId = group.id
          }
        }
        if (groupId) {
          return pomelo.app.get('mysqlClient')
            .sequelize
            .transaction(function (t) {
              return pomelo.app.get('mysqlClient')
                .TourProfile
                .update({
                  groupId: groupId
                }, {
                  where: {
                    uid: profile.uid,
                    roundId: tour.roundId
                  },
                  transaction: t
                })
                .then(function () {
                  var updateData = {
                    numPlayer: pomelo.app.get('mysqlClient').sequelize.literal('numPlayer + ' + 1)
                  };
                  return pomelo.app.get('mysqlClient')
                    .TourGroup
                    .update(updateData, {
                      where: {
                        tourId: tourId,
                        roundId: tour.roundId,
                        id: groupId
                      },
                      transaction: t
                    })
                })
                .then(function () {
                  var index = lodash.findIndex(groups, function (group) {
                    return group.id === groupId;
                  });
                  if (index > -1) {
                    group = groups[index];
                    group.numPlayer += 1;
                  }
                })
            })
        }
        else {
          return Promise.reject({ec: Code.FAIL, msg: 'Không còn bảng đấu nào phù hợp với bạn.'})
        }
      })
        .finally(function () {
          groups = null;
        })
    })
};

pro.createTable = function (opts) {
  console.error('tourManager createTable : ', opts);
  var hallConfigs = pomelo.app.get('dataService').get('hallConfig').data;
  var params = utils.clone(opts.tc);
  var hallConfig = hallConfigs['' + params.gameId + consts.HALL_ID.CAO_THU];
  params.username = opts.username;
  params.fullname = opts.fullname;
  params.guildName = opts.guildName;
  params.uid = opts.uid;
  params.guildId = opts.guildId;
  params.timePlay = opts.matchTime * 1000;
  params.index = opts.index;
  params.boardId = opts.boardId;
  params.tourId = opts.tourId;
  params.matchPlay = opts.matchPlay || 3;
  params.battleType = opts.battleType;
  params.tourType = opts.tourType;
  params.mustWin = opts.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE ? 1 : params.mustWin;
  params.lockMode = typeof params.lockMode === 'string' ? lodash.map(lodash.compact((params.lockMode || '').split(',')), function (lock) {
    return parseInt(lock)
  }) : params.lockMode;
  if (params.lockMode.length >= 1) {
    params.hallId = consts.HALL_ID.LIET_CHAP
  }
  params.roomId = 1000;
  console.log('params Matchmaking: ', params);
  return Promise.delay(0)
    .then(function () {
      var curServer = pomelo.app.curServer;
      if (curServer.gameId === opts.gameId) {
        return pomelo.app.game.boardManager.createRoomTournament(hallConfig, null, params);
      } else {
        return Promise.promisify(pomelo.app.rpc.game.gameRemote.createRoomTournament.toServer)(utils.getServerIdFromServerIndex(opts.gameId * 10), hallConfig, null, params);
      }
    })
    .then(function (data) {
      console.log('createRoomTournament : ', data);
      var createTableData = {
        boardId: data.boardId,
        serverId: data.serverId,
        gameId: opts.tc.gameId,
        index: opts.index,
        bet: opts.tc.bet,
        numPlayer: 2,
        status: consts.BOARD_STATUS.NOT_STARTED,
        groupId: opts.groupId,
        scheduleId: opts.scheduleId,
        tourId: opts.tourId,
        roundId: opts.roundId,
        matchTime: moment(opts.matchTime * 1000).toDate(),
        player1: opts.tourType === consts.TOUR_TYPE.FRIENDLY ? opts.guildId[0] : opts.uid[0],
        player2: opts.tourType === consts.TOUR_TYPE.FRIENDLY ? opts.guildId[1] : opts.uid[1],
        player: opts.player || JSON.stringify([{}, {}])
      };
      console.log('createTourTable opts : ', createTableData);
      return TourDao.createTable(createTableData);
    })
};

pro.reFillTable = function (tourId, boardId) {
  var board;
  pomelo.app.get('mysqlClient')
    .TourTable
    .findOne({
      where: {
        boardId: boardId
      },
      raw: true
    })
    .then(function (b) {
      board = b;
      if (!board) return Promise.reject();
      if (board.stt === consts.BOARD_STATUS.FINISH) {
        return Promise.reject();
      }
      return [
        pomelo.app.get('mysqlClient')
          .User
          .findOne({
            where: {
              uid: board.player1
            },
            attributes: ['uid', 'username', 'fullname'],
            raw: true
          }),
        pomelo.app.get('mysqlClient')
          .User
          .findOne({
            where: {
              uid: board.player2
            },
            attributes: ['uid', 'username', 'fullname'],
            raw: true
          })
      ]
    })
    .spread(function (player1, player2) {
      if (moment().isAfter(board.matchTime)) {
        // push lại cho người dùng về cặp đấu;
        Notify.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: "Đấu trường",
          msg: util.format('Bạn được sắp xếp lại cặp đấu với kỳ thủ "%s" tại bàn số %s', player2['fullname'], board.index),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [player1.uid],
          image: consts.NOTIFY.IMAGE.NORMAL
        });
        Notify.push({
          type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
          title: "Đấu trường",
          msg: util.format('Bạn được sắp xếp lại cặp đấu với kỳ thủ "%s" tại bàn số %s', player1['fullname'], board.index),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
          users: [player2.uid],
          image: consts.NOTIFY.IMAGE.NORMAL
        });
      }
      return pomelo.app.rpc.game.gameRemote.setBoard.toServer(board.serverId, board.boardId, {
        username: [player1.username, player2.username],
        fullname: [player1.fullname, player2.fullname],
        matchTime: moment(board.matchTime).unix() * 1000
      }, function () {
      })
    })
    .finally(function () {
      board = null;
    })
};

pro.showTable = function (tourId, scheduleId) {
  var tour;
  return TourDao.getTour({
    where: {
      tourId: tourId
    },
    attributes: ['name'],
    raw: true
  })
    .then(function (t) {
      tour = t;
      if (!tour) return Promise.reject({msg: "không có tour nào phù hợp"});
      return TourDao.getTourTable({
        where: {
          tourId: tourId,
          scheduleId: scheduleId
        }
      })
    })
    .each(function (table) {
      Promise.map([table.player1, table.player2], function (uid) {
        return UserDao.getUserProperties(uid, ['username', 'fullname', 'avatar', 'sex', 'uid'])
      })
        .then(function (players) {
          var player1 = players[0];
          var player2 = players[1];
          Notify.push({
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường",
            msg: util.format('Bạn được sắp cặp đấu trong đấu trường "%s" với kỳ thủ "%s" tại bàn số %s. Vui lòng truy cập đấu trường để xem thông tin chi tiết', tour.name, player2['fullname'], table.index),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
            scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
            users: [player1.uid],
            image: consts.NOTIFY.IMAGE.NORMAL
          });
          Notify.push({
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường",
            msg: util.format('Bạn được sắp cặp đấu trong đấu trường "%s" với kỳ thủ "%s" tại bàn số %s. Vui lòng truy cập đấu trường để xem thông tin chi tiết', tour.name, player1['fullname'], table.index),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
            scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
            users: [player2.uid],
            image: consts.NOTIFY.IMAGE.NORMAL
          });
        });
    })
    .then(function () {
      return pomelo.app.get('mysqlClient')
        .TourSchedule
        .update({
          show: 1
        }, {
          where: {
            id: scheduleId
          }
        })
    })
};


pro.finishTourFriendLy = function (tourId) {
  var totalPoint = 0
  return pomelo.app.get('mysqlClient').Tournament.update({
    status : consts.TOUR_STATUS.FINISHED
  },{
    where : {
      tourId : tourId
    }
  })
    .then(function () {
      return pomelo.app.get('mysqlClient').TourTable.findAll({
        where : {
          tourId : tourId
        },
        raw : true
      })
    })
    .then(function (tables) {
      var point = [0,0];
      for (var i = 0, len = tables.length; i < len; i++){
        var table = tables[i];
        var score = table.score.split('-');
        score = lodash.map(score, function (s) {
          return parseFloat(s.trim());
        });
        point[0] += score[0];
        point[1] += score[1];
      }
      totalPoint = point;
      // tính toán kết quả
      return [
        pomelo.app.get('mysqlClient').Guild.findOne({
          where: {
            id : table.player1
          },
          raw : true
        }),
        pomelo.app.get('mysqlClient').Guild.findOne({
          where :{
            id : table.player2
          },
          raw : true
        })
      ]
    })
    .spread(function (guild1, guild2) {
      var guild1Exp = 0;
      var guild2Exp = 0;
      if (totalPoint[0] > totalPoint[1]){
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành chiến thắng hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild2.name, totalPoint[0],totalPoint[1], 50),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Exp= 50;
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Thua hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild1.name, totalPoint[1],totalPoint[0], 30),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Exp = 30;
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild1.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã giành chiến thắng trước hội quán "%s" với tỷ số %s - %s', guild2.name, totalPoint[0],totalPoint[1]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild2.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Hội quán",
            msg: util.format('Hội quán của bạn đã để thua hội quán "%s" với tỷ số: %s - %s', guild1.name, totalPoint[1],totalPoint[0]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.MARQUEE,
          title: "Đấu trường",
          msg: util.format('Chúc mừng hội quán "%s" đã giành chiến thắng trước hội quán "%s" với tỷ số %s - %s', guild1.name, guild2.name, totalPoint[0], totalPoint[1]),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
          scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
          image: consts.NOTIFY.IMAGE.NORMAL
        })
      }else if (totalPoint[0] < totalPoint[1]){
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành chiến thắng hội quán "%s" với tỷ số: %s - %s, giành được %s điểm danh vọng', guild1.name, totalPoint[1],totalPoint[0], 50),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Exp = 30;
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Thua hội quán "%s" với tỷ số: %s - %s, giành được %s điểm danh vọng', guild2.name, totalPoint[0],totalPoint[1], 30),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Exp = 50;
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild2.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã giành chiến thắng trước hội quán "%s" với tỷ số: %s - %s', guild1.name, totalPoint[1],totalPoint[0]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild1.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã để thua hội quán "%s" với tỷ số: %s - %s', guild2.name, totalPoint[0],totalPoint[1]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.MARQUEE,
          title: "Đấu trường",
          msg: util.format('Chúc mừng hội quán "%s" đã giành chiến thắng trước hội quán "%s" với tỷ số %s-%s', guild2.name, guild1.name, totalPoint[1], totalPoint[0]),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
          scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
          image: consts.NOTIFY.IMAGE.NORMAL
        })
      }else {
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số %s-%s, giành được %s điểm', guild1.name, totalPoint[0],totalPoint[1], 40),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Exp = 40;
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số: %s - %s, giành được %s điểm', guild2.name, totalPoint[0],totalPoint[1], 40),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Exp = 40;
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild1.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã hoà hội quán "%s" với tỷ số: %s - %s', guild2.name, totalPoint[0],totalPoint[1]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild2.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã hoà hội quán "%s" với tỷ số : %s - %s', guild1.name, totalPoint[0],totalPoint[1]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.MARQUEE,
          title: "Đấu trường",
          msg: util.format('Sau màn rượt đuổi tỷ số 2 hội quán "%s" và "%s" đã chấp nhận hoà nhau với tỷ số: %s - %s', guild1.name, guild2.name, totalPoint[0], totalPoint[1]),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
          scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
          image: consts.NOTIFY.IMAGE.NORMAL
        })
      }
      guild1.exp += guild1Exp;
      guild2.exp += guild2Exp;
      var promises = [];
      var guildLevel = pomelo.app.get('dataService').get('guildLevel').data;
      var values = lodash.values(guildLevel);
      for (var i = 0, len = values.length; i < len; i++) {
        var valueNext = values[i].nextLevel;
        if (i) {
          var value = values[i-1].nextLevel;
        }else {
          value = 0;
        }
        if (guild1.exp >= value && guild1.exp < valueNext && guild1.level !== i) {
          promises.push(
            pomelo.app.get('mysqlClient').Guild.update({
              level : i
            },{
              where : {
                id: guild1.id
              }
            })
          );
          // lên level
        }
        if (guild2.exp >= value && guild2.exp < valueNext && guild1.level !== i) {
          // lên level
          promises.push(
            pomelo.app.get('mysqlClient').Guild.update({
              level : i
            },{
              where : {
                id: guild2.id
              }
            })
          );
        }
      }
      promises.push(pomelo.app.get('mysqlClient')
        .Guild
        .update({
          exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild1Exp)
        }, {
          where: {
            id : guild1.id
          }
        }));
      promises.push(pomelo.app.get('mysqlClient')
        .Guild
        .update({
          exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild2Exp)
        }, {
          where: {
            id : guild2.id
          }
        }));
      return promises;
    })
    .catch(function (error) {
      console.error('events tournament friendly err : ', error);
    })
    .finally(function () {
      pomelo.app.get('mysqlClient').TourTable.update({
        status : consts.BOARD_STATUS.FINISH
      },{
        where : {
          tourId : tourId
        }
      })
    })
}