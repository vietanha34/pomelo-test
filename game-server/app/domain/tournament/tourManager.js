/**
 * Created by vietanha34 on 1/9/15.
 */

var channelUtil = require('../../util/channelUtil');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../../util/utils');
var async = require('async');
var lodash = require('lodash');
var Tour = require('./tour');
var TourDao = require('../../dao/tourDao');
var Promise = require('bluebird');
var consts = require('../../consts/consts');
var UserDao = require('../../dao/userDao');
var Code = require('../../consts/code');


var TourManager = function (opts) {
  opts = opts || {};
  this.tours = {};
  this.app = opts.app;
  this.status = false;
};

module.exports = TourManager;

pro = TourManager.prototype;

pro.init = function () {
  if (this.status) return;
  return pomelo.app.get('mysqlClient')
    .Tournament
    .findAll({
      where : {
        status : {
          $ne : consts.TOUR_STATUS.FINISHED
        }
      },
      raw : true
    })
    .each(function (tour) {
      return TourDao.getTourRound({
        where: {
          id : tour.roundId
        },
        include: [{
          model: pomelo.app.get('mysqlClient').TourTableConfig
        }]
      })
      .then(function (round) {
          if (!round || round.length < 1) return;
          round = round[0];
        })
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
      console.log('tc, groups, schedule : ', arguments);
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
                  groupId: group.id
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
            if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE){
              var matchUid = [];
              var updateRound = {};
              switch(round.numRound){
                case 0: // vòng loại đầu tiên 1/8
                  if (!group.player1 || !group.player2){
                    if (!group.player1 && group.player2){
                      updateRound['player9'] = group.player2;
                    }else if (group.player1 && !group.player2){
                      updateRound['player9'] = group.player1;
                    }
                  }
                  if (!group.player3 || !group.player4){
                    if (!group.player3 && group.player4){
                      updateRound['player10'] = group.player4;
                    }else if (group.player3 && !group.player4){
                      updateRound['player10'] = group.player3;
                    }
                  }
                  if (!group.player5 || !group.player6){
                    if (!group.player5 && group.player6){
                      updateRound['player11'] = group.player6;
                    }else if (group.player5 && !group.player6){
                      updateRound['player11'] = group.player5;
                    }
                  }
                  if (!group.player7 || !group.player8){
                    if (!group.player7 && group.player8){
                      updateRound['player12'] = group.player8;
                    }else if (group.player7 && !group.player8){
                      updateRound['player12'] = group.player7;
                    }
                  }
                  matchUid.push([group.player1,group.player2]);
                  matchUid.push([group.player3,group.player4]);
                  matchUid.push([group.player5,group.player6]);
                  matchUid.push([group.player7,group.player8]);
                  break;
                case 1: // vòng bán kết 1/4
                  if (!group.player9 || !group.player10){
                    if (!group.player9 && group.player10){
                      updateRound['player13'] = group.player10;
                    }else if (group.player9 && !group.player10){
                      updateRound['player13'] = group.player9;
                    }
                  }
                  if (!group.player11 || !group.player12){
                    if (!group.player11 && group.player12){
                      updateRound['player14'] = group.player12;
                    }else if (group.player11 && !group.player12){
                      updateRound['player14'] = group.player11;
                    }
                  }
                  matchUid.push([group.player9,group.player10]);
                  matchUid.push([group.player11,group.player12]);
                  break;
                case 2: // trận chung kết 1/2
                  if (!group.player13 || !group.player14){
                    if (!group.player13 && group.player14){
                      updateRound['player15'] = group.player14;
                    }else if (group.player13 && !group.player14){
                      updateRound['player15'] = group.player13;
                    }
                    var championUid = updateRound['player15'];
                    // tính toán người chơi vô địch
                    var uids = [group.player9, group.player10, group.player11, group.player12];
                    var secondUid = group.player14 === championUid ? group.player13 : group.player14;
                    var thirdUid, fourUid;
                    for (i = 0, len = uids.length; i < len ; i++){
                      var uid = uids[i];
                      if (!thirdUid){
                        if (uid !== championUid && secondUid !== uid){
                          thirdUid = uid;
                        }
                      } else {
                        if (uid !== championUid && secondUid !== uid && thirdUid !== uid){
                          fourUid = uid;
                        }
                      }
                    }
                    self.finishTour({
                      tourId : tourId,
                      first : championUid,
                      second : secondUid,
                      third : thirdUid,
                      four : fourUid
                    });
                    console.log('first second third four : ', championUid, secondUid, thirdUid, fourUid);
                  }
                  matchUid.push([group.player13,group.player14]);
                  break;
              }
              if (Object.keys(updateRound).length > 0){
                pomelo.app.get('mysqlClient')
                  .TourGroup
                  .update(updateRound, {
                    where : {
                      id : group.id
                    }
                  })
              }
              return Promise.each(matchUid, function (match) {
                var index = 0;
                if (!match[0] || !match[1]) return Promise.resolve({});
                console.log('match : ', match);
                return Promise.map(match, function (uid, index) {
                  return UserDao.getUserProperties(uid, ['username', 'fullname', 'avatar', 'sex', 'uid'])
                })
                  .then(function (players) {
                    console.log('players : ', players);
                    var player1 = players[0];
                    var player2 = players[1];
                    var params = utils.clone(tc);
                    params.username = [player1['username'], player2['username']];
                    params.fullname = [player1['fullname'], player2['fullname']];
                    params.timePlay = schedule.matchTime * 1000;
                    params.index = index + 1;
                    params.tourId = tour.tourId;
                    params.lockMode = lodash.map(lodash.compact((params.lockMode || '').split(',')), function (lock) {
                      return parseInt(lock)
                    });
                    if (params.lockMode.length >= 1){
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
                          index: index + 1,
                          bet: tc.bet,
                          numPlayer: 2,
                          status: consts.BOARD_STATUS.NOT_STARTED,
                          groupId: group.id,
                          scheduleId: schedule.id,
                          matchTime : schedule.matchTime,
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
              var enemyIndex = 0, numMatchPlay = 10000;
              for (i = 0, len = profilesClone.length; i < len; i++) {
                if (Math.abs(profilesClone[i].point - profile.point) <= 4) {
                  if (!mapEnemy[profile.uid] || (mapEnemy[profile.uid][profilesClone[i]] || 0) < numMatchPlay) {
                    enemyIndex = i;
                  }
                }
              }
              console.log('enemyIndex :', enemyIndex, mapEnemy);
              var enemy = profilesClone.splice(enemyIndex, 1)[0];
              matchs.push([profile, enemy]);
            }
            if (profilesClone.length === 1) {
              pomelo.app.get('mysqlClient')
                .TourProfile
                .update({
                  point: pomelo.app.get('mysqlClient').sequelize.literal('point + ' + 2)
                }, {
                  where : {
                    uid : profilesClone[0].uid,
                    tourId : tour.tourId,
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
              if (params.lockMode.length >= 1){
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
                    matchTime : schedule.matchTime,
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
                  TourDao.createTable(opts);
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
            where : {
              id : round.id
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
  var tour, round;
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
          stt : consts.BOARD_STATUS.FINISH
        }, {
          where: {
            boardId: table.boardId
          }
        });
      if (round.battleType === consts.TOUR_BATTLE_TYPE.THUY_SY) {
        var score = table.score.split(' - ');
        score = lodash.map(score, function (s) {
          return parseFloat(s);
        });
        var win = lodash.map(table.win.split(' - '), function (s) {
          return parseInt(s);
        });
        var draw = lodash.map(table.draw.split(' - '), function (s) {
          return parseInt(s);
        });
        var lose = lodash.map(table.lose.split(' - '), function (s) {
          return parseInt(s);
        });
        Promise.delay(0)
          .then(function () {
            var result = [];
            for (var i = 1, len = win.length; i<= len; i ++){
              var winWithoutEnemy = score[i - 1] - (win[i-1] + draw[i-1] * 0.5);
              var loseWithoutEnemy = score[!(i-1 )? 1 : 0] - (lose[i-1] + draw[i-1] * 0.5);
              var updateData = {
                point: pomelo.app.get('mysqlClient').sequelize.literal('point + ' + score[i-1]),
                win: pomelo.app.get('mysqlClient').sequelize.literal('win + ' + win[i-1]),
                draw: pomelo.app.get('mysqlClient').sequelize.literal('draw + ' + draw[i-1]),
                lose: pomelo.app.get('mysqlClient').sequelize.literal('lose + ' + lose[i-1])
              };
              if (winWithoutEnemy) updateData['winWithoutEnemy'] = pomelo.app.get('mysqlClient').sequelize.literal('winWithoutEnemy + ' + winWithoutEnemy);
              if (loseWithoutEnemy) updateData['loseWithoutEnemy'] = pomelo.app.get('mysqlClient').sequelize.literal('loseWithoutEnemy + ' + loseWithoutEnemy);
              result.push(pomelo.app.get('mysqlClient')
                .TourProfile
                .update(updateData, {
                  where : {
                    uid : table['player'+i],
                    roundId : table.roundId
                  }
                }))
            }
            return result
          })
          .spread(function () {
            return pomelo.app.get('mysqlClient')
              .TourProfile
              .findOne({
                where : {
                  groupId : table.groupId
                },
                include: [
                  {
                    model : pomelo.app.get('mysqlClient').User,
                    attributes : ['avatar']
                  }
                ],
                raw : true,
                order : 'point DESC'
              })
              .then(function (profile) {
                if (profile && profile['User.avatar']){
                  pomelo.app.get('mysqlClient')
                    .TourGroup
                    .update({
                      avatar : profile['User.avatar']
                    },{
                      where : {
                        id : table.groupId
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
                  groupId : table.groupId
                },
                include : [
                  {
                    model : pomelo.app.get('mysqlClient').User,
                    attributes : ['fullname', 'uid']
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
                    groupId : table.groupId
                  },
                  include : [
                    {
                      model : pomelo.app.get('mysqlClient').User,
                      attributes : ['fullname', 'uid']
                    }
                  ],
                  raw: true
                })
            ]
          })
          .spread(function (player1, player2) {
            console.log('player1, player2 : ', arguments);
            if (round.type === consts.TOUR_ROUND_TYPE.FINAL){
              pomelo.app.get('mysqlClient')
                .TourHistory
                .create({
                  firstPlayerName: player1['User.fullname'],
                  firstPlayerUid : player1['uid'],
                  secondPlayerName : player2['User.fullname'],
                  secondPlayerUid : player2['uid'],
                  result : table.score,
                  tourId : tour.tourId,
                  match: table.match,
                  round : round.numRound
                });
            }
            if (table.winner){
              if (table.player1 === table.winner){
                profile = player1
              }else {
                profile = player2
              }
            }else {
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
            if (round.type === consts.TOUR_ROUND_TYPE.FINAL && newRank === 15){
              // finish Tour
              pomelo.app.get('mysqlClient')
                .TourGroup
                .findOne({
                  where : {
                    id : table.groupId
                  },
                  raw : true
                })
                .then(function (group) {
                  if (!group) return;
                  var top = [];
                  var uids = [group.player9, group.player10, group.player11, group.player12];
                  var secondUid = group.player14 === profile.uid ? group.player13 : group.player14;
                  top.push(profile.uid);
                  top.push(secondUid);
                  var thirdUid, fourUid;
                  for (var i = 0, len = uids.length; i < len ; i++){
                    var uid = uids[i];
                    if (!thirdUid){
                      if (uid !== profile.uid && secondUid !== uid){
                        thirdUid = uid;
                        top.push(thirdUid);
                      }
                    } else {
                      if (uid !== profile.uid && secondUid !== uid && thirdUid !== uid){
                        fourUid = uid;
                        top.push(fourUid);
                      }
                    }
                  }
                  top = top.reverse();
                  top = lodash.compact(top);
                  console.log('first second third four : ', profile.uid, secondUid, thirdUid, fourUid);
                  return Promise.props({
                    first : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : top.pop()},raw : true,
                      include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
                    second : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : top.pop()},raw : true,
                      include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
                    third : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : top.pop()},raw : true,
                      include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
                    four : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : top.pop()},raw : true,
                      include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
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
                      if (p.stt === 1){
                        return true
                      }
                    });
                    if (prizeIndex > -1) {
                      prize = prizes[prizeIndex]
                    }else {
                      prize = {};
                    }
                    champion.push({
                      uid : data.first.uid,
                      fullname : data.first['User.fullname'],
                      stt : 1,
                      text : prize.text,
                      gold : prize.gold
                    })
                  }
                  if(data.second){
                    prizeIndex = lodash.findIndex(prizes, function (p) {
                      if (p.stt === 2){
                        return true
                      }
                    });
                    if (prizeIndex > -1) {
                      prize = prizes[prizeIndex]
                    }else {
                      prize = {};
                    }
                    champion.push({
                      uid : data.second.uid,
                      fullname : data.second['User.fullname'],
                      stt : 2,
                      text : prize.text,
                      gold : prize.gold
                    })
                  }
                  if(data.third){
                    prizeIndex = lodash.findIndex(prizes, function (p) {
                      if (p.stt === 3){
                        return true
                      }
                    });
                    if (prizeIndex > -1) {
                      prize = prizes[prizeIndex]
                    }else {
                      prize = {};
                    }
                    champion.push({
                      uid : data.third.uid,
                      fullname : data.third['User.fullname'],
                      stt : 3,
                      text : prize.text,
                      gold : prize.gold
                    })
                  }
                  if(data.four){
                    prizeIndex = lodash.findIndex(prizes, function (p) {
                      if (p.stt === 3){
                        return true
                      }
                    });
                    if (prizeIndex > -1) {
                      prize = prizes[prizeIndex]
                    }else {
                      prize = {};
                    }
                    champion.push({
                      uid : data.four.uid,
                      fullname : data.four['User.fullname'],
                      stt : 3,
                      text : prize.text,
                      gold : prize.gold
                    })
                  }
                  pomelo.app.get('mysqlClient')
                    .Tournament
                    .update({
                      champion : JSON.stringify(champion),
                      status : consts.TOUR_STATUS.FINISHED
                    }, {
                      where : {
                        tourId : tour.tourId
                      }
                    })
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
                    groupId : table.groupId,
                    uid: table.winner
                  }
                }),
              pomelo.app.get('mysqlClient')
                .TourGroup
                .update(updateField, {where: {id: profile.groupId}})
            ]
          })
      }
    }) table
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
      if (prevRound.numPlayer < numPlayer * prevRound.numGroup){
        return Promise.reject();
      }
      return TourDao.getTourGroup({
        where : {
          roundId : prevRound.id
        },
        raw: true
      })
    })
    .map(function (group) {
      console.log('group : ', group);
      return TourDao.getTourProfile({
        where : {
          groupId : group.id
        },
        order : 'point DESC, rank DESC',
        raw : true,
        limit: numPlayer
      })
    })
    .then(function (data) {
      console.log('map data : ', data);
      var profiles = [];
      for (var i = 0, len = data.length; i < len; i++){
        profiles = profiles.concat(data[i]);
      }
      return [
        Promise.resolve(profiles),
        TourDao.getTourGroup({
          where :{
            roundId : nextRound.id
          },
          raw : true,
          attributes : ['id','numPlayer']
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
          if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE && group.numPlayer >= 8){
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
                  roundId : nextRoundId,
                  rank : minNumPlayer + 1
                }, {transaction: t})
                .then(function () {
                  var updateData = {
                    numPlayer: pomelo.app.get('mysqlClient').sequelize.literal('numPlayer + ' + 1)
                  };
                  if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE) {
                    updateData['player'+(minNumPlayer+1)] = profile.uid;
                  }
                  return pomelo.app.get('mysqlClient')
                    .TourGroup
                    .update(updateData,{
                      where: {
                        tourId: tourId,
                        roundId: tour.roundId,
                        id : groupId
                      },
                      transaction: t
                    })
                })
                .then(function () {
                  var index=  lodash.findIndex(groups, function (group) {
                    return group.id === groupId;
                  });
                  if (index > -1){
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
      console.error('err : ',err);
    })
};


pro.finishTour = function (msg) {
  var tourId = msg.tourId;
  var tour;
  pomelo.app.get('mysqlClient')
    .Tournament
    .findOne({
      where : {
        tourId :tourId
      },
      raw : true
    })
    .then(function (t) {
      tour = t;
      if (!tour) return;
      return Promise.props({
        first : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : msg.first},raw : true,
          include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
        second : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : msg.second},raw : true,
          include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
        third : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : msg.third},raw : true,
          include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
        four : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : msg.four},raw : true,
          include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
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
          if (p.stt === 1){
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        }else {
          prize = {};
        }
        champion.push({
          uid : data.first.uid,
          fullname : data.first['User.fullname'],
          stt : 1,
          text : prize.text,
          gold : prize.gold
        })
      }
      if(data.second){
        prizeIndex = lodash.findIndex(prizes, function (p) {
          if (p.stt === 2){
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        }else {
          prize = {};
        }
        champion.push({
          uid : data.second.uid,
          fullname : data.second['User.fullname'],
          stt : 2,
          text : prize.text,
          gold : prize.gold
        })
      }
      if(data.third){
        prizeIndex = lodash.findIndex(prizes, function (p) {
          if (p.stt === 3){
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        }else {
          prize = {};
        }
        champion.push({
          uid : data.third.uid,
          fullname : data.third['User.fullname'],
          stt : 3,
          text : prize.text,
          gold : prize.gold
        })
      }
      if(data.four){
        prizeIndex = lodash.findIndex(prizes, function (p) {
          if (p.stt === 3){
            return true
          }
        });
        if (prizeIndex > -1) {
          prize = prizes[prizeIndex]
        }else {
          prize = {};
        }
        champion.push({
          uid : data.four.uid,
          fullname : data.four['User.fullname'],
          stt : 3,
          text : prize.text,
          gold : prize.gold
        })
      }
      pomelo.app.get('mysqlClient')
        .Tournament
        .update({
          champion : JSON.stringify(champion),
          status : consts.TOUR_STATUS.FINISHED
        }, {
          where : {
            tourId : tour.tourId
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
pro.spitGroup = function (tourId, numGroup) {

};