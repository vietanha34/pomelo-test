/**
 * Created by vietanha34 on 1/28/16.
 */


var async = require('async');
var utils = require('../../../util/utils');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var TopupDao = require('../../../dao/topupDao');
var Promise = require('bluebird');
var NotifyDao = require('../../../dao/notifyDao');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var TourDao = require('../../../dao/tourDao');
var moment = require('moment');
var util = require('util');
var lodash = require('lodash');
var formula = require('../../../consts/formula');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

/**
 * Lấy danh sách của tour bao gồm: danh sách tour giao hữu và danh sách tour thường
 *
 * * args :
 *   * tourType : giao hữu or Kỳ vương
 *
 * @param msg
 * @param session
 * @param next
 * @returns {Promise.<T>}
 */
Handler.prototype.getListTour = function (msg, session, next) {
  msg.uid = session.uid;
  return TourDao.getListTour(msg)
    .then(function (tours) {
      tours.type = msg.type;
      return utils.invokeCallback(next, null, tours)
    })
    .catch(function (err) {
      console.error(err);
      return utils.invokeCallback(cb, null, {tour: [], type: msg.type});
    })
};

Handler.prototype.getTour = function (msg, session, next) {
  var uid = session.uid;
  var tourId = msg.tourId;
  var tour, round, groups;
  return TourDao.getTour({
    where: {
      tourId: tourId
    },
    raw: true
  })
    .then(function (t) {
      tour = t;
      if (!tour) {
        return Promise.reject({ec: Code.FAIL, msg: 'Không có giải đấu này'});
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
      if (!round || round.length < 1) {
        return Promise.reject({ec: Code.FAIL, msg: 'Không có vòng đấu này'})
      }
      round = round[0];
      return Promise.props({
        group: TourDao.getTourGroup({
          where: {
            roundId: round.id
          },
          raw: true,
          attributes: ['index', 'id', 'avatar']
        }),
        profile: TourDao.getTourProfile({
          where: {
            tourId: tourId,
            uid: uid
          },
          limit : 1,
          raw: true,
          order : 'createdAt DESC',
          include: {
            model: pomelo.app.get('mysqlClient').User,
            attributes: ['fullname', 'avatar']
          }
        })
      })
    })
    .then(function (data) {
      groups = data.group || [];
      var profile = data.profile.length > 0 ? data.profile[0] : {};
      if (groups.length <= 0) {
        return Promise.reject({ec: Code.FAIL, msg: 'Hiện tại không có bảng đấu nào'});
      }
      var group;
      groups = groups.map(function (group) {
        return {
          index: group.index,
          groupId: group.id,
          avatar: utils.JSONParse(group.avatar, { id : 0, version : 0})
        }
      });
      console.log('data : ', tourId, data);
      if (profile && profile.tourId === tourId) {
        return TourDao.getTourTable({
          where: {
            tourId: tourId,
            scheduleId: round.scheduleId,
            $or: {
              player1: uid,
              player2: uid
            }
          },
          raw: true,
          attributes: ['boardId']
        })
          .then(function (table) {
            var boardId;
            var groupIndex = -1;
            for (var i = 0, len = groups.length; i < len; i ++){
              if (groups[i].groupId === profile.groupId) groupIndex = i
            }
            console.log('groupIndex : ', groupIndex, profile);
            if (groupIndex > -1) {
              group = groups[groupIndex];
            }
            if (table.length > 0) {
              boardId = table[0].boardId
            }
            next(null, {
              status: tour.status,
              isRegister: 1,
              tourId: tour.tourId,
              type: tour.type,
              group: groups,
              name: tour.name + ' - ' + round.name,
              groupIndex: groupIndex,
              boardId: boardId,
              result: tour.resultString
            })
          });
      }
      else {
        return next(null, {
          status: tour.status,
          isRegister: 0,
          tourId: tour.tourId,
          type: tour.type,
          group: groups,
          name: tour.name,
          result: tour.resultString || undefined
        })
      }
    })
    .catch(function (err) {
      console.error('error : ', err);
      return utils.invokeCallback(next, null, {
        ec: err.ec || Code.FAIL,
        msg: err.msg || 'Không thể đăng kí đấu trường vào thời điểm này'
      })
    })
    .finally(function () {
      groups = null;
      tour = null;
      round = null;
    })
};

Handler.prototype.getTourRank = function (msg, session, next) {
  var tourId = msg.tourId;
  var groupId = msg.groupId;
  return TourDao.getTour({
    where: {
      tourId: tourId
    },
    raw: true
  })
    .then(function (tour) {
      if (!tour) {
        return Promise.reject({ec: Code.FAIL, msg: 'Không có giải đấu này'});
      }
      return Promise.props({
        round: TourDao.getTourRound({
          where: {
            id: tour.roundId
          },
          raw: true
        }),
        rank: TourDao.getTourProfile({
          where: {
            groupId: groupId
          },
          raw: true,
          include: {
            model: pomelo.app.get('mysqlClient').User,
            attributes: ['fullname', 'avatar', 'sex']
          },
          order : 'point DESC'
        }),
        group: TourDao.getTourGroup({
          where: {
            id: groupId
          },
          raw: true
        })
      })
    })
    .then(function (data) {
      var round = data.round;
      if (!round || round.length < 1) {
        return Promise.reject({ec: Code.FAIL, msg: 'Không có vòng đấu này'})
      }
      round = data.round[0];
      var group = data.group.length < 1 ? {} : data.group[0];
      var rank = data.rank || [];
      var position;
      switch (round.battleType) {
        case 1 : // hệ thuỵ sĩ
          var i = 1;
          rank = lodash.map(rank, function (item) {
            return {
              rank: i++ ,
              fullname: item['User.fullname'],
              avatar: utils.JSONParse(item['User.avatar'], {}),
              point: item.point,
              bh: formula.calBuchholz(item.point, item.winWithoutEnemy,item.loseWithoutEnemy),
              win: util.format('%s/%s/%s', item.win, item.draw, item.lose)
            }
          });
          break;
        case 2:
          position = [group.player1, group.player2, group.player3, group.player4, group.player5, group.player6, group.player7,
            group.player8, group.player9, group.player10, group.player11, group.player12, group.player13, group.player14, group.player15];
          position = lodash.map(position, function (item) {
            if (item) {
              return item
            } else {
              return -1;
            }
          });
          rank = lodash.map(rank, function (item) {
            return {
              rank: item.rank,
              uid: item.uid,
              sex: item['User.sex'],
              fullname: item['User.fullname'],
              avatar: utils.JSONParse(item['User.avatar'], {})
            }
          })
      }
      return next(null, {
        battleType: round.battleType,
        rank: rank,
        position: position,
        groupId: msg.groupId,
        tourId: msg.tourId
      })
    })
    .catch(function (err) {
      console.error('getTourRank err : ', err);
      return utils.invokeCallback(next, null, {
        ec: err.ec || Code.FAIL,
        msg: err.msg || 'Không thể đăng kí đấu trường vào thời điểm này'
      })
    })
};

/**
 * Lấy lịch đấu
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getTourTable = function (msg, session, next) {
  var tourId = msg.tourId;
  var tourRound;
  return TourDao.getTour({
    where: {
      tourId: tourId
    },
    raw: true
  })
    .then(function (tour) {
      if (!tour) {
        return Promise.reject({ec: Code.FAIL, msg: 'Không có đấu trường này'})
      }
      if (tour.type === consts.TOUR_TYPE.FRIENDLY) {
        return TourDao.getTourTable({
          where: {
            tourId: tour.tourId
          },
          raw: true
        })
      } else {
        return TourDao.getTourRound({
          where: {
            id: tour.roundId
          }
        })
          .then(function (round) {
            if (!round || round.length < 1) {
              return Promise.reject({ec: Code.FAIL, msg: 'Không có lượt đấu này'})
            }
            round = round[0];
            tourRound = round;
            return TourDao.getTourTable({
              where: {
                groupId: msg.groupId,
                scheduleId: round.scheduleId
              },
              order: '`TourTable`.`index` ASC',
              raw: true
            })
          })
      }
    })
    .then(function (tables) {
      tables = lodash.map(tables, function (table) {
        var match = lodash.isString(table.match) ? lodash.compact(table.match.split(',')) : undefined;
        var data = {
          index: table.index,
          status: table.stt,
          score: table.score,
          players: utils.JSONParse(table.player)
        };
        if (match && match.length > 0){
          data['match'] = match;
        }
        if (table.stt !== consts.BOARD_STATUS.FINISH){
          data.boardId = table.boardId
        }else if (!match || match.length === 0){
          if (table.win === '0 - 0' && table.lose === '0 - 0'){
            if (table.winner){
              data.log = 'Ván đấu không tồn tại do đấu thủ bỏ cuộc';
            } else {
              data.log = 'Ván đấu không tồn tại do 2 đấu thủ đều bỏ cuộc';
            }
          }
        }
        return data;
      });
      return next(null, {table: tables, groupId: msg.groupId, tourId: msg.tourId, battleType: tourRound.battleType})
    })
    .catch(function (err) {
      console.error('getTourTable err : ', err);
      return utils.invokeCallback(next, null, {
        ec: err.ec || Code.FAIL,
        msg: err.msg || 'Không thể lấy danh sách bàn vào thời điểm này'
      })
    })
};

Handler.prototype.getTourHistory = function (msg, session, next) {
  var uid = session.uid;
  var tourId = msg.tourId;
  return pomelo.app.get('mysqlClient')
    .TourHistory
    .findAll({
      where: {
        tourId : tourId
      }
    })
    .then(function (histories) {
      var list = {};
      for (var i = 0, len = histories.length; i < len ; i++) {
        var history = histories[i];
        if (!list[history.round]){
          list[history.round] = [];
        }
        var match = lodash.compact((history.match || '').split(','));
        list[history.round].push([
          history['firstPlayerName'],
          history['result'],
          history['secondPlayerName'],
          match
        ])
      }
      var keys = Object.keys(list);
      keys.sort(function (a, b) {
        return b -a;
      });
      var data = [];
      for(i = 0, len = keys.length; i < len ; i ++){
        var key = keys[i];
        var name = '';
        switch(parseInt(key)){
          case consts.TOUR_HISTORY_ROUND_TYPE.TU_KET:
            name = 'Vòng Tứ kết';
            break;
          case consts.TOUR_HISTORY_ROUND_TYPE.BAN_KET:
            name = 'Vòng Bán Kết';
            break;
          case consts.TOUR_HISTORY_ROUND_TYPE.CHUNG_KET:
            name = 'Trận Chung kết';
            break;
        }
        data.push({
          name : name,
          match : list[key]
        });
      }
      return utils.invokeCallback(next, null, { list : data, tourId : tourId});
    })
};


Handler.prototype.registerTour = function (msg, session, next) {
  var tourId = msg.tourId;
  var uid = session.uid;
  var tour;
  var currentGold = 0;
  TourDao.getTour({
    where: {
      tourId: tourId
    },
    attributes: ['registerTime', 'tourId', 'roundId', 'fee']
  })
    .then(function (t) {
      tour = t;
      if (!tour) {
        return Promise.reject({ec: Code.FAIL, msg: 'Không có đấu trường này'})
      } else if (moment(tour.registerTime).isBefore(new Date())) {
        return Promise.reject({ec: Code.FAIL, msg: 'Đã hết thời gian đăng kí đấu trường này'})
      } else {
        return pomelo.app.get('paymentService')
          .subBalance({
            uid: uid,
            gold: tour.fee,
            msg: "Đăng kí đấu trường"
          })
      }
    })
    .then(function (result) {
      if (result && !result.ec) {
        currentGold = result.gold;
        return [TourDao.getTourGroup({
          where: {
            roundId: tour.roundId
          },
          attributes: ['numPlayer', 'id', 'index']
        }),
          TourDao.getTourRound({
            where : {
              id : tour.roundId
            },
            raw : true
          })
        ]
      } else {
        return Promise.reject({
          ec: Code.FAIL,
          msg: 'Bạn không đủ tiền để đăng kí đấu trường'
        })
      }
    })
    .spread(function (groups, round) {
      // cho người chơi vào bảng
      round = round.length >= 1 ? round[0] : {};
      var groupId;
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
                uid: uid,
                tourId: tour.tourId,
                groupId: groupId,
                rank : minNumPlayer + 1,
                roundId : round.id
              }, {transaction: t})
              .then(function (create) {
                return pomelo.app.get('mysqlClient')
                  .Tournament
                  .update({
                    numPlayer: pomelo.app.get('mysqlClient').sequelize.literal('numPlayer + ' + 1)
                  }, {
                    where: {
                      tourId: tour.tourId
                    },
                    transaction: t
                  })
              })
              .then(function () {
                var updateData = {
                  numPlayer: pomelo.app.get('mysqlClient').sequelize.literal('numPlayer + ' + 1)
                };
                if (round.battleType === consts.TOUR_BATTLE_TYPE.FACE_TO_FACE){
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
              .then(function () {
                console.log('push gold về');
                pomelo.app.get('statusService').pushByUids([uid], 'service.dailyHandler.getGoldAward', {
                  gold: currentGold
                });
                return next(null,{tourId : tourId});
              })
          })
          .catch(function (err) {
            // cộng lại tiền cho người dùng
            console.error('err : ',err);
            return pomelo.app.get('paymentService')
              .addBalance({
                uid: uid,
                gold: tour.fee
              })
          })
      }
      else {
        return Promise.reject({ec: Code.FAIL, msg: 'Không còn bảng đấu nào phù hợp với bạn.'})
      }
    })
    .catch(function (err) {
      console.error('err: ', err);
      return utils.invokeCallback(next, null, {
        ec: err.ec || Code.FAIL,
        msg: err.msg || 'Không thể đăng kí đấu trường vào thời điểm này'
      })
    })
    .finally(function () {
      tour = null;
    })
};


/**
 * Lấy thông tin bảng xếp hạng
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.addFund = function (msg, session, next) {

};