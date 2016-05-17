/**
 * Created by bi on 5/8/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var formula = require('../../consts/formula');
var consts = require('../../consts/consts');
var UserDao = require('../../dao/userDao');
var TopDao = require('../../dao/topDao');
var ItemDao = require('../../dao/itemDao');
var NotifyDao = require('../../dao/notifyDao');
var Promise = require('bluebird');

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
  pomelo.app.get('mysqlClient')
    .TourTable
    .findOne({
      where: {
        boardId: param.boardId
      }
    })
    .then(function (table) {
      if (!table) return Promise.reject();
      return pomelo.app.get('mysqlClient')
        .TourTable
        .count({
          where: {
            stt: {
              $ne: consts.BOARD_STATUS.FINISH
            },
            tourId: table.tourId,
            scheduleId: table.scheduleId
          }
        })
        .then(function (count) {
          if (!count) {
            // kết thúc giải giao hữu rồi

          } else {

          }
        })
    })
};