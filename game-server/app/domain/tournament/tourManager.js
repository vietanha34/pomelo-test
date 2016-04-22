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


var TourManager = function (opts) {
  this.tours = {}
};

module.exports = TourManager;

pro = TourManager.prototype;

pro.matchMaking = function (tourId) {
  var tour, tableConfig, round;
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
            console.log('profiles, tables : ', profiles, tables, group);
            if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE){
              var matchUid = [];
              switch(round.numRound){
                case 0: // vòng loại đầu tiên 1/8
                  matchUid.push([group.player1,group.player2]);
                  matchUid.push([group.player3,group.player4]);
                  matchUid.push([group.player5,group.player6]);
                  matchUid.push([group.player7,group.player8]);
                  break;
                case 1: // vòng bán kết 1/4
                  matchUid.push([group.player9,group.player10]);
                  matchUid.push([group.player11,group.player12]);
                  break;
                case 2: // trận chung kết 1/2
                  matchUid.push([group.player13,group.player14]);
                  break;
              }
              return Promise.each(matchUid, function (match) {
                var index = 0;
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
                    params.timePlay = schedule.matchTime * 1000;
                    params.index = index + 1;
                    params.tourId = tour.tourId;
                    params.lockMode = lodash.compact((params.lockMode || '').split(','));
                    params.roomId = 1000;
                    console.log('params : ', params);
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
                          tourId: tour.tourId,
                          roundId: round.id,
                          player1: player1.uid,
                          player2: player2.uid,
                          player: JSON.stringify([
                            {
                              fullname: player1['username'],
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
            console.log('matchs : ', matchs);
            return Promise.map(matchs, function (match, i) {
              var player1 = match[0];
              var player2 = match[1];
              var params = utils.clone(tc);
              params.username = [player1['User.username'], player2['User.username']];
              params.timePlay = schedule.matchTime * 1000;
              params.index = i + 1;
              params.tourId = tour.tourId;
              params.lockMode = lodash.compact((params.lockMode || '').split(','));
              params.roomId = 1000;
              console.log('params : ', params);
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
      if (table.stt !== consts.BOARD_STATUS.FINISH) return;
      if (table.calPoint) return;
      pomelo.app.get('mysqlClient')
        .TourTable
        .update({
          calPoint: 1
        }, {
          where: {
            boardId: table.boardId
          }
        });
      if (round.battleType === consts.TOUR_BATTLE_TYPE.THUY_SY) {
        if (table.winner) {
          var loseUser = table.player1 === table.winner ? table.player2 : table.player1;
          // có người thắng cuộc
          return Promise.delay(0)
            .then(function () {
              return [pomelo.app.get('mysqlClient')
                .TourProfile
                .update({
                  point: pomelo.app.get('mysqlClient').sequelize.literal('point + ' + 1),
                  win: pomelo.app.get('mysqlClient').sequelize.literal('win + ' + 1)
                }, {
                  where: {
                    tourId: tourId,
                    uid: table.winner,
                    groupId: table.groupId
                  }
                }),
                pomelo.app.get('mysqlClient')
                  .TourProfile
                  .update({
                    lose: pomelo.app.get('mysqlClient').sequelize.literal('lose + ' + 1)
                  }, {
                    where: {
                      tourId: tourId,
                      uid: loseUser,
                      groupId: table.groupId
                    }
                  })
              ]
            })
            .spread(function () {
              // tinh hạng
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
        } else {
          return [pomelo.app.get('mysqlClient')
            .TourProfile
            .update({
              point: pomelo.app.get('mysqlClient').sequelize.literal('point + ' + 0.5),
              draw: pomelo.app.get('mysqlClient').sequelize.literal('draw + ' + 1)
            }, {
              where: {
                tourId: tourId,
                groupId : table.groupId,
                uid: table.player1
              }
            }),
            pomelo.app.get('mysqlClient')
              .TourProfile
              .update({
                point: pomelo.app.get('mysqlClient').sequelize.literal('point + ' + 0.5),
                draw: pomelo.app.get('mysqlClient').sequelize.literal('draw + ' + 1)
              }, {
                where: {
                  tourId: tourId,
                  groupId : table.groupId,
                  uid: table.player2
                }
              })
          ]
        }
      }
      else {
        // tính toán đấu trường loại trực tiếp
        return pomelo.app.get('mysqlClient')
          .TourProfile
          .findOne({
            where: {
              tourId: tourId,
              uid: table.winner,
              groupId : table.groupId
            },
            raw: true
          })
          .then(function (profile) {
            if (!profile) return;
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
                  var uids = [group.player9, group.player10, group.player11, group.player12];
                  var secondUid = group.player14 === profile.uid ? group.player13 : group.player14;
                  var thirdUid, fourUid;
                  for (var i = 0, len = uids.length; i < len ; i++){
                    var uid = uids[i];
                    if (!thirdUid){
                      if (uid !== profile.uid && secondUid !== uid){
                        thirdUid = uid;
                      }
                    } else {
                      if (uid !== profile.uid && secondUid !== uid && thirdUid !== uid){
                        fourUid = uid;
                      }
                    }
                  }
                  console.log('first second third four : ', profile.uid, secondUid, thirdUid, fourUid);
                  return Promise.props({
                    first : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : profile.uid},raw : true,
                      include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
                    second : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : secondUid},raw : true,
                      include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
                    third : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : thirdUid},raw : true,
                      include: [{model:pomelo.app.get('mysqlClient').User, attributes : ['avatar', 'sex', 'fullname']}]}),
                    four : pomelo.app.get('mysqlClient').TourProfile.findOne({where: {uid : fourUid},raw : true,
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
                      stt : 1,
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
                      uid : data.second.uid,
                      fullname : data.second['User.fullname'],
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
                      uid : data.second.uid,
                      fullname : data.second['User.fullname'],
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
      var minNumPlayer = 10000;
      Promise.mapSeries(profiles, function (profile) {
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
                  rank : minNumPlayer + 1
                }, {transaction: t})
                .then(function () {
                  var updateData = {
                    numPlayer: pomelo.app.get('mysqlClient').sequelize.literal('numPlayer + ' + 1)
                  };
                  if (round.battleType === consts.TOUR_BATTLE_TYPE){
                    updateData['player'+(minNumPlayer+1)] = uid;
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
            })
        }
        else {
          return Promise.reject({ec: Code.FAIL, msg: 'Không còn bảng đấu nào phù hợp với bạn.'})
        }
      });
    })
    .catch(function (err) {
      // cộng lại tiền cho người dùng
      console.error('err : ',err);
    })
};