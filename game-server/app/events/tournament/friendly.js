/**
 * Created by bi on 5/8/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
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
  return pomelo.app.get('mysqlClient')
    .Tournament
    .findOne({
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
      return pomelo.app.get('mysqlClient')
        .TourTable
        .count({
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
      return [pomelo.app.get('mysqlClient')
        .TourTable
        .findAll({
          where : {
            tourId : param.tourId
          },
          raw : true
        }),
        pomelo.app.get('mysqlClient')
          .Tournament
          .update({
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
        pomelo.app.get('mysqlClient')
          .Guild
          .findOne({
            where: {
              id : table.player1
            },
            raw : true
          }),
        pomelo.app.get('mysqlClient')
          .Guild
          .findOne({
            where :{
              id : table.player2
            },
            raw : true
          })
      ]
    })
    .spread(function (guild1, guild2) {
      var guild1Fame = 0;
      var guild2Fame = 0;
      if (totalPoint[0] > totalPoint[1]){
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành chiến thắng hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild2.name, totalPoint[0],totalPoint[1], 50),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Fame = 50;
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Thua hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild1.name, totalPoint[1],totalPoint[0], 30),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Fame = 30;
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild1.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã giành chiến thắng trước hội quán "%s"  với tỷ số', guild2.name, totalPoint[0],totalPoint[1]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild2.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Hội quán",
            msg: util.format('Hội quán của bạn đã để thua hội quán "%s" với tỷ số', guild1.name, totalPoint[1],totalPoint[0]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.MARQUEE,
          title: "Đấu trường",
          msg: util.format('Chúc mừng hội quán "%s" đã giành chiến thắng trước hội quán "%s" với tỷ số %s-%s', guild1.name, guild2.name, totalPoint[0], totalPoint[1]),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: param.tourId},
          scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
          image: consts.NOTIFY.IMAGE.NORMAL
        })
      }else if (totalPoint[0] < totalPoint[1]){
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành chiến thắng hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild1.name, totalPoint[1],totalPoint[0], 50),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Fame = 30;
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Thua hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild2.name, totalPoint[0],totalPoint[1], 30),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Fame = 50;
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild2.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã giành chiến thắng trước hội quán "%s"  với tỷ số', guild1.name, totalPoint[1],totalPoint[0]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild1.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã để thua hội quán "%s" với tỷ số', guild2.name, totalPoint[0],totalPoint[1]),
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
      }else {
        GuildDao.addEvent({
          guildId: guild2.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số %s-%s, giành được %s điểm', guild1.name, totalPoint[0],totalPoint[1], 40),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild1Fame = 40;
        GuildDao.addEvent({
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Giành kết quả hoà trước hội quán "%s" với tỷ số %s-%s, giành được %s điểm', guild2.name, totalPoint[0],totalPoint[1], 40),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Fame = 40;
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild1.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã hoà hội quán "%s" với tỷ số', guild1.name, totalPoint[0],totalPoint[1]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        pomelo.app.get('chatService')
          .sendMessageToGroup(redisKeyUtil.getChatGuildName(guild2.id), {
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: "Đấu trường giao hữu",
            msg: util.format('Hội quán của bạn đã hoà hội quán "%s" với tỷ số', guild2.name, totalPoint[0],totalPoint[1]),
            buttonLabel: "Ok",
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image: consts.NOTIFY.IMAGE.NORMAL
          }, 'onNotify');
        NotifyDao.push({
          type: consts.NOTIFY.TYPE.MARQUEE,
          title: "Đấu trường",
          msg: util.format('Sau màn rượt đuổi tỷ số 2 hội quán "%s" và "%s" đã chấp nhận hoà nhau với tỷ số %s-%s', guild1.name, guild2.name, totalPoint[0], totalPoint[1]),
          buttonLabel: "Ok",
          command: {target: consts.NOTIFY.TARGET.GO_TOURNAMENT, tourId: param.tourId},
          scope: consts.NOTIFY.SCOPE.ALL, // gửi cho user
          image: consts.NOTIFY.IMAGE.NORMAL
        })
      }
      return [
        pomelo.app.get('mysqlClient')
          .Guild
          .update({
            exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild1Fame)
          }, {
            where: {
              id : guild1.id
            }
          }),
        pomelo.app.get('mysqlClient')
          .Guild
          .update({
            exp: pomelo.app.get('mysqlClient').sequelize.literal('exp + ' + guild2Fame)
          }, {
            where: {
              id : guild2.id
            }
          })
      ]
    })
    .catch(function (error) {
      console.error('events tournament friendly err : ', error);
    })
};