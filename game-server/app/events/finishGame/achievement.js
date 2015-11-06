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
var formula = require('../../consts/formula');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var lodash = require('lodash');
var utils = require('../../util/utils');
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
  if (!param.users || param.users!=2 || !param.boardInfo || !param.boardInfo.gameId) {
   console.error('wrong param finish game: ', param);
   return;
  }

  var gameName = (consts.UMAP_GAME_NAME[param.boardInfo.gameId] || 'tuong');
  var attr = gameName + 'Elo';
  var Achievement = pomelo.app.get('mysqlClient').Achievement;

  var user1Elo, user2Elo;
  var user1Index, user2Index;
  Achievement
    .findAll({
      where: {uid: {$in: [param.users[0].uid, param.users[1].uid]}},
      attributes: ['uid', attr]
    })
    .then(function(achievements) {
      achievements = achievements || [{uid: param.users[0].uid}, {uid: param.users[1].uid}];
      user1Index = achievements[0].uid == param.users[0].uid ? 0 : 1;
      user2Index = user1Index ? 0 : 1;

      user1Elo = achievements[user1Index][attr] || consts.MIN_ELO;
      user2Elo = achievements[user2Index][attr] || consts.MIN_ELO;

      var newElo = formula.calElo(param.users[0].result.type, user1Elo, user2Elo);

      user1Elo = newElo[0];
      user2Elo = newElo[1];

      achievements[user1Index][attr] = user1Elo;
      achievements[user2Index][attr] = user2Elo;
      achievements[0].save().then(function(e) {
        if (e) console.error(e.stack || e);
      });
      achievements[1].save().then(function(e) {
        if (e) console.error(e.stack || e);
      });

      var mongoClient = pomelo.app.get('mongoClient');
      var Top = mongoClient.model('Top');

      var update1 = {};
      update1[gameName] = user1Elo;
      if (param.users[0].result.remain || param.users[0].result.remain === 0)
        update1.gold = Number(param.users[0].result.remain);
      Top.update({uid: param.users[0].uid}, update1, {upsert: false}, function(e) {
        if (e) console.error(e.stack || e);
      });

      var update2 = {};
      update2[gameName] = user2Elo;
      if (param.users[1].result.remain || param.users[1].result.remain === 0)
        update2.gold = Number(param.users[1].result.remain);
      Top.update({uid: param.users[1].uid}, update2, {upsert: false}, function(e) {
        if (e) console.error(e.stack || e);
      });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });
};
