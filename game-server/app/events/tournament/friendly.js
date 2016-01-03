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

module.exports.type = Config.TYPE.TOPUP;

/**
 * Event Gửi về khi phát sinh 1 giao dịch
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 * * boardId:
 * * tourId :
 * * gameId :
 * * type : type của tour
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
    .TourTable
    .count({
      where: {
        stt: {
          $ne: consts.BOARD_STATUS.FINISH
        },
        tourId: param.tourId
      }
    })
    .then(function (count) {
      if (count) return Promise.reject();
      return pomelo.app.get('mysqlClient')
        .TourTable
        .findAll({
          where : {
            tourId : param.tourId
          },
          raw : true
        });
      // kết thúc giải giao hữu rồi tính toán kết quả
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
          guildId: guild1.id,
          uid: 1,
          fullname: '1',
          content: util.format('Thua hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild1.name, totalPoint[1],totalPoint[0], 30),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Fame = 30
      }else if (point[0] < point[1]){
        GuildDao.addEvent({
          guildId: guild1.id,
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
          content: util.format('Thua hội quán "%s" với tỷ số %s-%s, giành được %s điểm danh vọng', guild2.name, totalPoint[0],totalPoint[1], 50),
          type: consts.GUILD_EVENT_TYPE.CHALLENGE_GUILD
        });
        guild2Fame = 50
      }else {
        GuildDao.addEvent({
          guildId: guild1.id,
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
        guild2Fame = 40
      }
      return [
        pomelo.app.get('mysqlClient')
          .Guild
          .update({
            fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + guild1Fame)
          }, {
            where: {
              id : guild1.id
            }
          }),
        pomelo.app.get('mysqlClient')
          .Guild
          .update({
            fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + guild2Fame)
          }, {
            where: {
              id : guild2.id
            }
          })
      ]
    })
    .spread(function () {
      
    })
};