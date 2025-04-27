/**
 *
 * @param {Number} type
 * @param {Object} param
 */

var Config = require('../config');
var consts = require('../../consts/consts');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var utils = require('../../util/utils');
var moment = require('moment');

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
 * * users : Array : mảng các phần tử gồm có các tham số như sau
 *    * uid: Định danh người chơi
 *    * result :
 *       * type : thắng hoà thua : xem thêm tại **consts.WIN_TYPE**
 *       * hand : Array : mảng bài thắng
 *       * handValue : Giá trị của mảng bài
 *       * money : số tiền thắng (+) , thua (-)
 *       * remain : Số tiền còn lại thực sự
 *       * tax : phế người chơi mất
 *       * elo : số elo thay đổi (+/-)
 *       * eloAfter : số elo sau (+/-)
 *       * exp : số exp thay đổi
 * * logs :{Object} Lưu log bàn chơi
 *
 * @param {Object} app
 * @param {Number} type
 * @param {Object} param
 */

module.exports.process = function (app, type, param) {
  if (!param.users || param.users.length !== 2 || !param.boardInfo || !param.boardInfo.gameId || !param.boardInfo.matchId) {
   console.error('wrong param finish game: ', param);
   return;
  }
  for (var i = 0, len = param.users.length; i < len ; i++){
    var user = param.users[i];
    if (user && user.result.type === consts.WIN_TYPE.WIN){
      param.tax = param.boardInfo.bet - user.result.money
    }
  }

  setTimeout(function() {
    delete param.logs;
    pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyIngameKey(), JSON.stringify(param));
  }, 1000);

  var mongoClient = pomelo.app.get('mongoClient');
  var GameHistory = mongoClient.model('GameHistory');
  GameHistory.create({
    matchId: param.boardInfo.matchId,
    gameId: param.boardInfo.gameId,
    uids: [param.users[0].uid, param.users[1].uid],
    status: (param.users[0].result.type === consts.WIN_TYPE.GIVE_UP ? consts.WIN_TYPE.LOSE : param.users[0].result.type),
    date: Number(moment().format('YYYYMMDD')),
    bet: param.boardInfo.bet || 0
  }, function(e, r) {
    if (e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    }
  });
};
