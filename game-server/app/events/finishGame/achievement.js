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
var TopDao = require('../../dao/topDao');
var TopupDao = require('../../dao/topupDao');
var FriendDao = require('../../dao/friendDao');
var ItemDao = require('../../dao/itemDao');
var NotifyDao = require('../../dao/notifyDao');
var util = require('util');

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

var typeMap = {};
typeMap[consts.WIN_TYPE.WIN] = 'Win';
typeMap[consts.WIN_TYPE.LOSE] = 'Lose';
typeMap[consts.WIN_TYPE.DRAW] = 'Draw';
typeMap[consts.WIN_TYPE.GIVE_UP] = 'GiveUp';

module.exports.process = function (app, type, param) {
  if (!param.users || param.users.length!=2 || !param.boardInfo || !param.boardInfo.gameId) {
   console.error('wrong param finish game: ', param);
   return;
  }

  var gameName = (consts.UMAP_GAME_NAME[param.boardInfo.gameId] || 'tuong');
  var attr = gameName + 'Elo';
  var Achievement = pomelo.app.get('mysqlClient').Achievement;

  var attrs = ['uid', attr];
  var games = Object.keys(consts.UMAP_GAME_NAME);
  games.forEach(function (game) {
    var gameName = consts.UMAP_GAME_NAME[game];
    attrs = attrs.concat([gameName+'Win', gameName+'Lose', gameName+'Draw', gameName+'GiveUp']);
  });

  var user1Elo, user2Elo;
  var user1Index, user2Index;
  Achievement
    .findAll({
      where: {uid: {$in: [param.users[0].uid, param.users[1].uid]}},
      attributes: attrs
    })
    .then(function(achievements) {

      achievements = achievements || [{uid: param.users[0].uid}, {uid: param.users[1].uid}];
      user1Index = achievements[0].uid == param.users[0].uid ? 0 : 1;
      user2Index = user1Index ? 0 : 1;
      
      // check số ván chơi để tặng quà tân thủ
      [0,1].forEach(function (i) {
        var userIndex = achievements[i].uid == param.users[i].uid ? i : (i==0?1:0);

        // nếu bỏ cuộc thì bỏ qua
        if (param.users[userIndex].result.type == consts.WIN_TYPE.GIVE_UP) return;

        var gameCount = 0;
        games.forEach(function (game) {
          var gameName = consts.UMAP_GAME_NAME[game];
          gameCount += achievements[i][gameName+'Win'] || 0;
          gameCount += achievements[i][gameName+'Lose'] || 0;
          gameCount += achievements[i][gameName+'Draw'] || 0;
        });
        gameCount += 1;

        if (gameCount > 2) {
          gameCount = 0;
          games.forEach(function (game) {
            var gameName = consts.UMAP_GAME_NAME[game];
            gameCount += achievements[i][gameName+'Win'] || 0;
          });
          if (param.users[userIndex].result.type == consts.WIN_TYPE.WIN) gameCount += 1;

          if (gameCount < 3) return;
        }
        
        if (!consts.NRU[gameCount]) return;
        
        if (consts.NRU[gameCount].xp) {
          setTimeout(function() {
            TopDao.add({
              uid: achievements[i].uid,
              attr: 'exp',
              point: consts.NRU[gameCount].xp
            });
          }, 600);
        }

        if (consts.NRU[gameCount].gold) {
          TopupDao.topup({
            uid: achievements[i].uid,
            type: consts.CHANGE_GOLD_TYPE.NRU,
            gold: consts.NRU[gameCount].gold,
            msg: 'Cộng gold NRU sau khi choi '+gameCount+' ván game, cộng '+consts.NRU[gameCount].xp+' xp'
          });
        }

        if (consts.NRU[gameCount].item) {
          ItemDao.donateItem(achievements[i].uid, consts.NRU[gameCount].item.id, consts.NRU[gameCount].item.duration);
        }

        if (consts.NRU[gameCount].friend) {
          pomelo.app.get('redisCache').getAsync(redisKeyUtil.getCcuList())
            .then(function (ccu) {
              var ccuList = utils.JSONParse(ccu, []);
              if (!ccu || !ccuList.length) return;
              
              for (var j=0; j<ccuList.length && j<consts.NRU[gameCount].friend; j++) {
                FriendDao.request(achievements[i].uid, ccuList[j].uid);
              }
            });
        }

        if (consts.NRU[gameCount].msg) {
          var msg = consts.NRU[gameCount].msg;
          msg = msg.replace('${xp}', consts.NRU[gameCount].xp);
          msg = msg.replace('${gold}', consts.NRU[gameCount].gold);
          msg = msg.replace('${friend}', consts.NRU[gameCount].friend);
          msg = msg.replace('${count}', gameCount);
          NotifyDao.push({
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: 'Chúc mừng tân thủ',
            msg: msg,
            buttonLabel: 'OK',
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
            users: [achievements[i].uid],
            image:  consts.NOTIFY.IMAGE.AWARD
          });
        }
        
      });

      user1Elo = param.users[0].result['eloAfter'];
      user2Elo = param.users[1].result['eloAfter'];

      //var newElo = formula.calElo(param.users[0].result.type, achievements[user1Index][attr], achievements[user2Index][attr]);
      //
      //user1Elo = newElo[0];
      //user2Elo = newElo[1];

      achievements[user1Index][attr] = user1Elo;
      achievements[user2Index][attr] = user2Elo;

      achievements[user1Index][gameName+typeMap[param.users[0].result.type]] += 1;
      achievements[user2Index][gameName+typeMap[param.users[1].result.type]] += 1;

      achievements[0].save().then(function(e) {
      });
      achievements[1].save().then(function(e) {
      });

      var update1 = {};
      update1[gameName] = user1Elo;
      if (param.users[0].result.remain || param.users[0].result.remain === 0)
        update1.gold = Number(param.users[0].result.remain);
      TopDao.updateGame({
        uid: param.users[0].uid,
        update: update1,
        gameName: gameName
      });

      var update2 = {};
      update2[gameName] = user2Elo;
      if (param.users[1].result.remain || param.users[1].result.remain === 0)
        update2.gold = Number(param.users[1].result.remain);
      TopDao.updateGame({
        uid: param.users[1].uid,
        update: update2,
        gameName: gameName
      });
    })
    .catch(function(e) {
      console.error(e.stack || e);
      utils.log(e.stack || e);
    });

  // cộng exp
  var winIndex = false;
  if (param.users[0].result.type == consts.WIN_TYPE.WIN) {
    winIndex = 0;
  }
  else if (param.users[1].result.type == consts.WIN_TYPE.WIN) {
    winIndex = 1;
  }
  if (winIndex !== false) {
    //var exp = formula.calGameExp(param.boardInfo.gameId, param.boardInfo.hallId);
    TopDao.add({
      uid: param.users[winIndex].uid,
      attr: 'exp',
      point: param.users[winIndex].result['xp']
    });
  }
};
