/**
 * Created by vietanha34 on 1/8/15.
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
var logger = require('pomelo-logger').getLogger('game');
var Promise = require('bluebird');


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
 * * logs :{Object} Lưu log bàn chơi
 *
 * @param {Object} app
 * @param {Number} type
 * @param {Object} param
 */
module.exports.process = function (app, type, param) {
  console.error(JSON.stringify(param.logs));
  var users = param.users || [];
  for (var i = 0; i < users.length; i++) {
    processAchievement(users[i], users[i].result.type);
  }
  if (param.boardInfo.gameType !== consts.GAME_TYPE.TOURNAMENT) {
    pomelo
      .app
      .get('redisCache')
      .RPUSH(redisKeyUtil.getLogMoneyIngameKey(), JSON.stringify({
        boardInfo: param.boardInfo,
        users: users,
        tax : param.tax,
        time: new Date().getTime()
      }), function (err, res) {
        if (err) logger.error(err, res);
      });
	}
};

var processAchievement = function processAchievement(user, winType) {
  console.log('user : ', user);
  if (!user || !user.result) return;
  Promise.delay(0)
    .then(function () {
      return [pomelo.app.get('mysqlClient')
        .AccUser
        .findOne({
          where: {
            id: user.uid
          },
          attributes: ['id', 'bestHand', 'bestValue', 'win', 'lose', 'bigWin']
        }), pomelo.app.get('mysqlClient')
        .AccUserDetail
        .findOne({
          where: {
            uid: user.uid
          }
        })]
    })
    .spread(function (profile, detail) {
      if (!profile || !detail) return;
      var win = profile.win;
      var lose = profile.lose;
      var bestHand, bigWin, bestValue;
      var winChip = user.result.money > 0 ? user.result.money : 0;
      var loseChip = user.result.money < 0 ? Math.abs(user.result.money) : 0;
      if (winType == consts.WIN_TYPE.WIN || winType == consts.WIN_TYPE.BIG_WIN) {
        win++;
      }
      else if (winType == consts.WIN_TYPE.DRAW)
        win++;
      else if (winType == consts.WIN_TYPE.GIVE_UP) {
        lose++;
      }
      else {
        lose++;
      }
      if (profile.bestValue < user.result.handValue) {
        bestHand = utils.getBestHand(user.result.hand, user.result.handType);
        bestHand = bestHand.join(',');
        bestValue = user.result.handValue
      }
      if (profile.bigWin < user.result.money) bigWin = user.result.money;
      return [profile.updateAttributes({
        win: win,
        lose: lose,
        bestHand: bestHand ? bestHand : profile.bestHand,
        bigWin: bigWin,
        bestValue: bestHand ? bestValue : profile.bestValue
      }),
        detail.updateAttributes({
          tax : detail.tax + (user.result.tax || 0),
          winChip : detail.winChip + winChip,
          loseChip : detail.loseChip + loseChip
        })]
    })
    .catch(function (err) {
      console.error('error : ', err)
    });
};
