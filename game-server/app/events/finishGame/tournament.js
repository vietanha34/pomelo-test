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
      var guild1 = data.guild1;
      var guild2 = data.guild2;
      var player1 = data.player1;
      var player2 = data.player2;
      var battle = data.battle;
      var fame = 0
      if (param.users[0].result.type === consts.WIN_TYPE.WIN) {
        fame = Math.round(player2.fame / 100)
        fame = fame > 1000 ? 1000 : fame
        fame = guild2.fame < fame ? guild2.fame : fame;
        var field = battle.guildId1 === param.users[0].guildId ? 'guildScore1' : 'guildScore2';
        var updateData = {};
        updateData[field] = pomelo.app.get('mysqlClient').sequelize.literal(field + ' + ' + 1);
        pomelo.app.get('mysqlClient').GuildBattle.update(updateData, {
            where : {
              tourId : param.boardInfo.tourId
            }
          });
        pomelo.app.get('mysqlClient').TourTable.update({
          fameDelta1: pomelo.app.get('mysqlClient').sequelize.literal('fameDelta1 + ' + fame),
          fameDelta2: pomelo.app.get('mysqlClient').sequelize.literal('fameDelta2 - ' + fame)
        }, {
          where: {
            boardId: boardId
          }
        })
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
        field = battle.guildId2 === param.users[1].guildId ? 'guildScore2' : 'guildScore1';
        updateData = {};
        updateData[field] = pomelo.app.get('mysqlClient').sequelize.literal(field + ' + ' + 1);
        pomelo.app.get('mysqlClient').GuildBattle.update(updateData, {
            where : {
              tourId : param.boardInfo.tourId
            }
          });
        fame = Math.round(player1.fame / 100)
        fame = guild1.fame < fame ? guild1.fame : fame;
        pomelo.app.get('mysqlClient').TourTable.update({
          fameDelta1: pomelo.app.get('mysqlClient').sequelize.literal('fameDelta1 - ' + fame),
          fameDelta2: pomelo.app.get('mysqlClient').sequelize.literal('fameDelta2 + ' + fame)
        }, {
          where: {
            boardId: boardId
          }
        })
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
        // if (player1.fame === player2.fame){
        //   return
        // }
        // fame = Math.round(fame / 2);
        // fame = fame < 5 ? 5 : fame;
        // var plusGuildIndex = player1.fame > player2.fame ? 0 : 1;
        // var minusGuildIndex = plusGuildIndex === 0 ? 1 : 0;
        // pomelo.app.get('mysqlClient').Guild.update({
        //     fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + fame)
        //   }, {
        //     where: {
        //       id: param.users[plusGuildIndex].guildId
        //     }
        //   });
        // pomelo.app.get('mysqlClient').Guild.update({
        //     fame: pomelo.app.get('mysqlClient').sequelize.literal('fame - ' + fame)
        //   }, {
        //     where: {
        //       id: param.users[minusGuildIndex].guildId
        //     }
        //   });
        // pomelo.app.get('mysqlClient').GuildMember.update({
        //     fame: pomelo.app.get('mysqlClient').sequelize.literal('fame + ' + fame)
        //   }, {
        //     where: {
        //       uid : param.users[plusGuildIndex].uid,
        //       guildId : param.users[plusGuildIndex].guildId
        //     }
        //   });
        // pomelo.app.get('mysqlClient').GuildMember.update({
        //     fame: pomelo.app.get('mysqlClient').sequelize.literal('fame - ' + fame)
        //   }, {
        //     where: {
        //       uid : param.users[minusGuildIndex].uid,
        //       guildId : param.users[minusGuildIndex].guildId
        //     }
        //   });
      }
    })
};
