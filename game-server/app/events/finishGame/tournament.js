/**
 * Created by vietanha34 on 4/13/16.
 */
/**
 *
 * @param {Number} type
 * @param {Object} param
 */

var Config = require('../config');
var consts = require('../../consts/consts');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var lodash = require('lodash');
var utils = require('../../util/utils');
var Promise = require('bluebird');
var moment = require('moment');
var TourDao = require('../../dao/tourDao');

module.exports.type = Config.TYPE.FINISH_GAME;

/**
 * Event Gửi về khi có một ván chơi kết thúc
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 *
 * * boardType : Dạng bàn chơi , normal, tour , private
 * * tax : phế ăn của bàn
 * * boardInfo : Định danh người dùng login
 *    * boardId : Định danh của bàn chơi
 *    * gameId : Định danh của game
 *    * tourId : Đinh danh của tour nếu có
 *    * districtId : Định danh của khu vực
 *    * matchId: Định danh của ván chơi
 *    * bet : mức tiền cược
 *    * owner : Định danh của người làm chủ bàn
 *    * finishTour : kết thúc tour
 *    * tourWinner : uid của người chiến thắng
 * * users : Array : mảng các phần tử gồm có các tham số như sau
 *    * uid: Định danh người chơi
 *    * result :
 *       * type : thắng hoà thua : xem thêm tại **consts.WIN_TYPE**
 *       * money : số tiền thắng (+) , thua (-)
 *       * remain : Số tiền còn lại thực sự
 *       * tax : phế người chơi mất
 *       * elo : số elo thay đổi (+/-)
 *       * eloAfter : số elo sau (+/-)
 *       * exp : số exp thay đổi
 *    * info :
 *       * platform : platform;
 * * logs :{Object} Lưu log bàn chơi
 *
 * @param {Object} app
 * @param {Number} type
 * @param {Object} param
 */

module.exports.process = function (app, type, param) {
  if (!param.users || param.users.length != 2 || !param.boardInfo || !param.boardInfo.gameId || !param.boardInfo.matchId) {
    console.error('wrong param finish game: ', param);
    return;
  }
  var boardInfo = param.boardInfo;
  if (boardInfo.gameType !== consts.GAME_TYPE.TOURNAMENT) {
    return;
  }
  pomelo.app.get('mysqlClient')
    .TourTable
    .findOne({
      where : {
        boardId : boardInfo.boardId
      },
      order : 'createdAt DESC',
      attributes : ['match'],
      raw : true
    })
    .then(function (table) {
      if (!table) return;
      if (table.stt === consts.BOARD_STATUS.FINISH) return;
      var match = table.match || '';
      match = match.split(',');
      match.push(boardInfo.matchId);
      pomelo.app.get('mysqlClient')
        .TourTable
        .update({
          match : match.join(',')
        }, {
          where : {
            boardId : boardInfo.boardId
          }
        })
    });
   //xử lý kết quả trả về của đấu trường
};
