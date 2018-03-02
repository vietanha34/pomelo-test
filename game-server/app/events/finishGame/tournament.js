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
var Promise = require('bluebird');
var util = require('util')

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
 *    * gameType : thể loại game
 *    * tourType : thể loại tour
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
  if (!param.users || param.users.length !== 2 || !param.boardInfo || !param.boardInfo.gameId || !param.boardInfo.matchId) {
    console.error('wrong param finish game: ', param);
    return;
  }
  var boardInfo = param.boardInfo;
  var boardId = boardInfo.boardId
  if (boardInfo.gameType !== consts.GAME_TYPE.TOURNAMENT) {
    return;
  }
  pomelo.app.get('mysqlClient').TourTable.findOne({
      where: {
        boardId: boardInfo.boardId
      },
      order: 'createdAt DESC',
      attributes: ['match'],
      raw: true
    })
    .then(function (table) {
      if (!table) return;
      if (table.stt === consts.BOARD_STATUS.FINISH) return;
      var match = table.match || '';
      match = match.split(',');
      match.push(boardInfo.matchId);
      pomelo.app.get('mysqlClient').TourTable.update({
          match: match.join(',')
        }, {
          where: {
            boardId: boardId
          }
        })
    });
  //xử lý kết quả trả về của đấu trường
  if (param.boardInfo.tourType !== consts.TOUR_TYPE.FRIENDLY) {
    return
  }

  console.error('tournament result: ', util.inspect(param, {depth: 10}))

  return Promise.props({
    guild1: pomelo.app.get('mysqlClient').Guild.findOne({
        where: {
          id: param.users[0].guildId
        },
        raw: true
      }),
    guild2: pomelo.app.get('mysqlClient').Guild.findOne({
        where: {
          id: param.users[1].guildId
        },
        raw: true
      }),
    player1 : pomelo.app.get('mysqlClient').GuildMember.findOne({
        where : {
          uid : param.users[0].uid,
          guildId : param.users[0].guildId
        },
        raw : true
      }),
    player2 : pomelo.app.get('mysqlClient').GuildMember.findOne({
        where : {
          uid : param.users[1].uid,
          guildId : param.users[1].guildId
        },
        raw : true
      }),
    battle : pomelo.app.get('mysqlClient').GuildBattle.findOne({
        where : {
          tourId : param.boardInfo.tourId
        },
        raw : true
      })
  })
    .then(function (data) {
      var player1 = data.player1;
      var player2 = data.player2;
      var battle = data.battle;
      var fame = 0
      var fameDeltaPlusField;
      var fameDeltaMinusField;
      var fieldScore;
      var updateScoreData = {}
      if (param.users[0].result.type === consts.WIN_TYPE.WIN) {
        fame = Math.round(player2.fame / 100)
        fame = fame > 1000 ? 1000 : fame
        fame = player2.fame < fame ? player2.fame : fame;
        console.error('fame delta : ', fame, player2.fame, param.users[0].guildId, param.boardInfo.tourId, boardId);
        fieldScore = battle.guildId1 === param.users[0].guildId ? 'guildScore1' : 'guildScore2';
        fameDeltaPlusField = battle.guildId1 === param.users[0].guildId ? 'fameDelta1' : 'fameDelta2';
        fameDeltaMinusField = battle.guildId1 === param.users[0].guildId ? 'fameDelta2' : 'fameDelta1'
        updateScoreData[fieldScore] = pomelo.app.get('mysqlClient').sequelize.literal(fieldScore + ' + ' + 1);
        pomelo.app.get('mysqlClient').GuildBattle.update(updateData, {
            where : {
              tourId : param.boardInfo.tourId
            }
          });
        pomelo.app.get('mysqlClient').GuildMember.update({
            fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + fame)
          }, {
            where: {
              uid : param.users[0].uid,
              guildId : param.users[0].guildId
            }
          });
        pomelo.app.get('mysqlClient').GuildMember.update({
            fame: pomelo.app.get('mysqlClient').sequelize.literal('fame - ' + fame)
          }, {
            where: {
              uid : param.users[1].uid,
              guildId : param.users[1].guildId
            }
          });
      }
      else if (param.users[0].result.type === consts.WIN_TYPE.LOSE || param.users[0].result.type === consts.WIN_TYPE.GIVE_UP){
        fieldScore = battle.guildId2 === param.users[1].guildId ? 'guildScore2' : 'guildScore1';
        fameDeltaPlusField = battle.guildId1 === param.users[0].guildId ? 'fameDelta2' : 'fameDelta1';
        fameDeltaMinusField = battle.guildId1 === param.users[0].guildId ? 'fameDelta1' : 'fameDelta2'
        updateScoreData[fieldScore] = pomelo.app.get('mysqlClient').sequelize.literal(fieldScore + ' + ' + 1);
        fame = Math.round(player1.fame / 100)
        fame = player1.fame < fame ? player1.fame : fame;
        console.error('fame delta : ', fame, player1.fame, param.users[1].guildId, param.boardInfo.tourId, boardId);
        pomelo.app.get('mysqlClient').GuildMember.update({
            fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + fame)
          }, {
            where: {
              uid : param.users[1].uid,
              guildId : param.users[1].guildId
            }
          });
        pomelo.app.get('mysqlClient').GuildMember.update({
            fame: pomelo.app.get('mysqlClient').sequelize.literal('fame - ' + fame)
          }, {
            where: {
              uid : param.users[0].uid,
              guildId : param.users[0].guildId
            }
          });
      }
      else {
        pomelo.app.get('mysqlClient').GuildBattle.update({
            guildScore1 : pomelo.app.get('mysqlClient').sequelize.literal('guildScore1 + ' + 0.5),
            guildScore2 : pomelo.app.get('mysqlClient').sequelize.literal('guildScore2 + ' + 0.5)
          }, {
            where : {
              tourId : param.boardInfo.tourId
            }
          });
      }
      // update score
      pomelo.app.get('mysqlClient').GuildBattle.update(updateScoreData, {
        where : {
          tourId : param.boardInfo.tourId
        }
      });

      if (!fame) {
        return
      }

      var dataUpdate = {}
      dataUpdate[fameDeltaPlusField] = pomelo.app.get('mysqlClient').sequelize.literal(fameDeltaPlusField + ' + ' + fame)
      dataUpdate[fameDeltaMinusField] = pomelo.app.get('mysqlClient').sequelize.literal(fameDeltaMinusField + ' - ' + fame)
      pomelo.app.get('mysqlClient').TourTable.update({
        fameDelta1: pomelo.app.get('mysqlClient').sequelize.literal(fameDeltaPlusField + ' + ' + fame),
        fameDelta2: pomelo.app.get('mysqlClient').sequelize.literal(fameDeltaMinusField + ' - ' + fame)
      }, {
        where: {
          boardId: boardId
        }
      })
    })
};
