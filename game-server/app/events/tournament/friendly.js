"use strict"
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
  var tour;
  var totalTable = 0;
  var fameDelta = [0,0]
  var bonusFame = [0,0]
  var textEvent = ['','']
  var textChat = ['','']
  var marqueeText = ''
  return pomelo.app.get('mysqlClient').Tournament.findOne({
      where :{
        tourId : param.tourId
      },
      raw : true,
      attributes : ['status', 'guildId1', 'guildId2']
    })
    .then(function (t) {
      tour = t
      if (tour.status === consts.TOUR_STATUS.FINISHED){
        return Promise.reject()
      }
      if (param.missingMatch > 0) {
        updateFamePunish(tour, param)
      }
      return [ pomelo.app.get('mysqlClient').TourTable.update({
        stt: consts.BOARD_STATUS.FINISH
      }, {
        where: {
          boardId: param.boardId
        }
      }),
        pomelo.app.get('mysqlClient').TourTable.count({
          where:{
            tourId: param.tourId
          }
        })
      ]
    })
    .spread((updateData, tableCount) => {
      // count numFinishTable
      var numTableFinish = 0
      return pomelo.app.get('mysqlClient')
        .sequelize
        .transaction(function (t) {
          return pomelo.app.get('mysqlClient').Tournament.findOne({
            where :{
              tourId : param.tourId
            },
            raw : true,
            attributes : ['status', 'guildId1', 'guildId2', 'numTableFinish'],
            transaction: t,
            lock: t.LOCK.UPDATE
          })
            .then((tour) => {
              numTableFinish = tour.numTableFinish
              return pomelo.app.get('mysqlClient').Tournament.update({
                numTableFinish: pomelo.app.get('mysqlClient').sequelize.literal('numTableFinish + ' + 1),
              }, {
                where :{
                  tourId : param.tourId
                },
                transaction: t
              })
            })
            .then(() => {
              return Promise.resolve(tableCount - numTableFinish)
            })
        })
    })
    .then(function (count) {
      if (count !== 1) return Promise.reject();
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
        guild1Exp = 50;
        guild2Exp = 30;
        textEvent[0] = util.format('Giành chiến thắng hội quán "%s" với tỷ số %s-%s, giành được %s điểm kinh nghiệm', guild2.name, totalPoint[0],totalPoint[1], guild1Exp)
        textEvent[1] = util.format('Thua hội quán "%s" với tỷ số %s-%s, giành được %s điểm kinh nghiệm', guild1.name, totalPoint[1],totalPoint[0], guild2Exp)
        textChat[0] = util.format('Hội quán của bạn đã giành chiến thắng trước hội quán "%s" với tỷ số %s - %s', guild2.name, totalPoint[0],totalPoint[1])
        textChat[1] = util.format('Hội quán của bạn đã để thua hội quán "%s" với tỷ số: %s - %s', guild1.name, totalPoint[1],totalPoint[0])
        marqueeText = util.format('Chúc mừng hội quán "%s" đã giành chiến thắng trước hội quán "%s" với tỷ số %s - %s', guild1.name, guild2.name, totalPoint[0], totalPoint[1])
      }
      else if (totalPoint[0] < totalPoint[1]){
        bonusFame[1] += 5
        guild1Exp = 30;
        guild2Exp = 50;
        textEvent[0] = util.format('Thua hội quán "%s" với tỷ số: %s - %s, giành được %s điểm kinh nghiệm ', guild2.name, totalPoint[0],totalPoint[1], 30)
        textEvent[1] = util.format('Giành chiến thắng hội quán "%s" với tỷ số: %s - %s, giành được %s điểm kinh nghiệm', guild1.name, totalPoint[1],totalPoint[0], 50)
        textChat[0] = util.format('Hội quán của bạn đã để thua hội quán "%s" với tỷ số: %s - %s', guild2.name, totalPoint[0],totalPoint[1])
        textChat[1] = util.format('Hội quán của bạn đã giành chiến thắng trước hội quán "%s" với tỷ số: %s - %s', guild1.name, totalPoint[1],totalPoint[0])
        marqueeText = util.format('Chúc mừng hội quán "%s" đã giành chiến thắng trước hội quán "%s" với tỷ số %s-%s', guild2.name, guild1.name, totalPoint[1], totalPoint[0])
      }
      else {
        bonusFame[0] += 3
        bonusFame[1] += 3
        guild1Exp = 40;
        guild2Exp = 40;
        textEvent[0] = util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số: %s - %s, giành được %s điểm kinh nghiệm', guild2.name, totalPoint[0],totalPoint[1], 40)
        textEvent[1] = util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số %s - %s, giành được %s điểm kinh nghiệm', guild1.name, totalPoint[0],totalPoint[1], 40)
        textChat[0] = util.format('Hội quán của bạn đã hoà hội quán "%s" với tỷ số: %s - %s', guild2.name, totalPoint[0],totalPoint[1])
        textChat[1] = util.format('Hội quán của bạn đã hoà hội quán "%s" với tỷ số : %s - %s', guild1.name, totalPoint[0],totalPoint[1])
        marqueeText = util.format('Sau màn rượt đuổi tỷ số 2 hội quán "%s" và "%s" đã chấp nhận hoà nhau với tỷ số: %s - %s', guild1.name, guild2.name, totalPoint[0], totalPoint[1])
      }
      guild1.exp += guild1Exp;
      guild2.exp += guild2Exp;
      var promises = [];
      console.error(util.format('Guild %s giành được %s danh vọng với fame trước là %s với tourId: %s', guild1.name, (Math.round(fameDelta[0] / totalTable) ), guild1.fame, param.tourId));
      console.error(util.format('Guild %s giành được %s danh vọng với fame trước là %s với tourId: %s', guild2.name, (Math.round(fameDelta[1] / totalTable) ), guild2.fame, param.tourId));
      if (guild1.fame + (Math.round(fameDelta[0] / totalTable) + bonusFame[0]) > 0) {
        promises.push(pomelo.app.get('mysqlClient').Guild.update({
          exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild1Exp),
          fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + (Math.round(fameDelta[0] / totalTable)))
        }, {
          where: {
            id : guild1.id
          }
        }));
      }

      if (guild2.fame + (Math.round(fameDelta[1] / totalTable) + bonusFame[1])) {
        promises.push(pomelo.app.get('mysqlClient').Guild.update({
          exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild2Exp),
          fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + (Math.round(fameDelta[1] / totalTable)))
        }, {
          where: {
            id : guild2.id
          }
        }));
      }

      updateGuildLevel(guild1, guild2)
      notifyGuild(param.tourId, guild1, guild2, textEvent, textChat, marqueeText)
      return promises;
    })
    .catch(function (error) {
      console.error('events tournament friendly err : ', error);
    })
};

var notifyGuild = function (tourId, guild1, guild2, textEvent, textChat, marqueeText) {
  GuildDao.addEvent({
    guildId: guild2.id,
    uid: 1,
    fullname: '1',
    content: textEvent[1],
    type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
  });
  GuildDao.addEvent({
    guildId: guild1.id,
    uid: 1,
    fullname: '1',
    content: textEvent[0],
    type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
  });
  pomelo.app.get('chatService').sendMessageToGroup(redisKeyUtil.getChatGuildName(guild1.id), {
    type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
    title: "Đấu trường giao hữu",
    msg: textChat[0],
    buttonLabel: "Ok",
    command: {target: consts.NOTIFY.TARGET.NORMAL},
    image: consts.NOTIFY.IMAGE.NORMAL
  }, 'onNotify');
  pomelo.app.get('chatService').sendMessageToGroup(redisKeyUtil.getChatGuildName(guild2.id), {
    type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
    title: "Đấu trường giao hữu",
    msg: textChat[1],
    buttonLabel: "Ok",
    command: {target: consts.NOTIFY.TARGET.NORMAL},
    image: consts.NOTIFY.IMAGE.NORMAL
  }, 'onNotify');
  NotifyDao.push({
    type: consts.NOTIFY.TYPE.MARQUEE,
    title: "Đấu trường",
    msg: marqueeText,
    buttonLabel: "Ok",
    command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: tourId},
    scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
    image: consts.NOTIFY.IMAGE.NORMAL
  })
}

var updateGuildLevel = function (guild1, guild2) {
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
      pomelo.app.get('mysqlClient').Guild.update({
          level : i
        },{
          where : {
            id: guild1.id
          }
        })
      // lên level
    }
    if (guild2.exp >= value && guild2.exp < valueNext && guild2.level !== i) {
      // lên level
      pomelo.app.get('mysqlClient').Guild.update({
          level : i
        },{
          where : {
            id: guild2.id
          }
        })
    }
  }
}

var updateFamePunish = function (tour, param) {
  var famePunish = [0,0]
  if (param.winner) {
    var guildWin = param.winner.guildId
    if (guildWin === tour.guildId1) {
      famePunish[1] += 5 * param.missingMatch
    }else if(guildWin === tour.guildId2){
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