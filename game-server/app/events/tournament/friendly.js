/**
 * Created by bi on 5/8/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var consts = require('../../consts/consts');
var NotifyDao = require('../../dao/notifyDao');
var Promise = require('bluebird');
var GuildDao = require('../../dao/GuildDao');
var lodash = require('lodash');
var util = require('util');

module.exports.type = Config.TYPE.TOURNAMENT;

/**
 * Event Gửi về khi phát sinh 1 giao dịch
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 * * boardId:
 * * tourId :
 * * gameId :
 * * winner:
 * * missingMatch:
 * * type : type của tour
 * * player : [] mảng 2 uid của người chơi ở 2 hội quán
 *
 * @event
 * @param {Object} app
 * @param {Number} type
 * @param {Object} param
 */

module.exports.process = function (app, type, param) {
  if (param.type !== consts.TOUR_TYPE.FRIENDLY) return;
  var totalPoint;
  var totalTable = 0;
  var fameDelta = [0,0]
  var bonusFame = [0,0]
  var famePunish = [0,0]
  return pomelo.app.get('mysqlClient').Tournament.findOne({
      where :{
        tourId : param.tourId
      },
      raw : true,
      attributes : ['status']
    })
    .then(function (tour) {
      if (tour.status === consts.TOUR_STATUS.FINISHED){
        return Promise.reject()
      }
      if (param.missingMatch > 0) {
        if (param.winner) {
          var guildWin = param.winner.guildId
          if (guildWin === tour.guildId1) {
            famePunish[1] += 5 * param.missingMatch
          }else {
            famePunish[0] += 5 * param.missingMatch
          }
        }else {
          famePunish[0] += 5 * param.missingMatch
          famePunish[1] += 5 * param.missingMatch
        }
        pomelo.app.get('mysqlClient').TourTable.update({
          famePunish1: pomelo.app.get('mysqlClient').sequelize.literal('famePunish1 + ' + famePunish[0]),
          famePunish2: pomelo.app.get('mysqlClient').sequelize.literal('famePunish2 + ' + famePunish[1])
        }, {
          where: {
            boardId: param.boardId
          }
        })
      }
      return pomelo.app.get('mysqlClient').TourTable.count({
          where: {
            stt: {
              $ne: consts.BOARD_STATUS.FINISH
            },
            tourId: param.tourId
          }
        })
    })
    .then(function (count) {
      if (count) return Promise.reject();
      return [pomelo.app.get('mysqlClient').TourTable.findAll({
          where : {
            tourId : param.tourId
          },
          raw : true
        }),
        pomelo.app.get('mysqlClient').Tournament.update({
            status : consts.TOUR_STATUS.FINISHED
          },{
            where : {
              tourId : param.tourId
            }
          })
      ];
      // kết thúc giải giao hữu rồi tính toán kết quả
    })
    .spread(function (tables, update) {
      var point = [0,0];
      for (var i = 0, len = tables.length; i < len; i++){
        totalTable += 1
        var table = tables[i];
        var score = table.score.split('-');
        score = lodash.map(score, function (s) {
          return parseFloat(s.trim());
        });
        bonusFame[0] -= table.famePunish1
        bonusFame[1] -= table.famePunish2
        fameDelta[0] += table.fameDelta1
        fameDelta[1] += table.fameDelta2
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
        bonusFame[0] += 5
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành chiến thắng hội quán "%s" với tỷ số %s-%s, giành được %s điểm kinh nghiệm', guild2.name, totalPoint[0],totalPoint[1], 50),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Exp= 50;
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Thua hội quán "%s" với tỷ số %s-%s, giành được %s điểm kinh nghiệm', guild1.name, totalPoint[1],totalPoint[0], 30),
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
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: param.tourId},
          scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
          image: consts.NOTIFY.IMAGE.NORMAL
        })
      }
      else if (totalPoint[0] < totalPoint[1]){
        bonusFame[1] += 5
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành chiến thắng hội quán "%s" với tỷ số: %s - %s, giành được %s điểm kinh nghiệm', guild1.name, totalPoint[1],totalPoint[0], 50),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Exp = 30;
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Thua hội quán "%s" với tỷ số: %s - %s, giành được %s điểm kinh nghiệm ', guild2.name, totalPoint[0],totalPoint[1], 30),
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
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: param.tourId},
          scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
          image: consts.NOTIFY.IMAGE.NORMAL
        })
      }
      else {
        bonusFame[0] += 3
        bonusFame[1] += 3
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số %s-%s, giành được %s điểm kinh nghiệm', guild1.name, totalPoint[0],totalPoint[1], 40),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Exp = 40;
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số: %s - %s, giành được %s điểm kinh nghiệm', guild2.name, totalPoint[0],totalPoint[1], 40),
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
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: param.tourId},
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
            pomelo.app.get('mysqlClient')
              .Guild
              .update({
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
            pomelo.app.get('mysqlClient')
              .Guild
              .update({
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
          exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild1Exp),
          fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + (Math.round(fameDelta[0] / totalTable) + bonusFame[0]))
        }, {
          where: {
            id : guild1.id
          }
        }));
      promises.push(pomelo.app.get('mysqlClient')
        .Guild
        .update({
          exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild2Exp),
          fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + (Math.round(fameDelta[1] / totalTable) + bonusFame[1]))
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
};