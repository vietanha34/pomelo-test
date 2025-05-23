/**
 * Created by vietanha34 on 6/16/14.
 */

var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('game', __filename, process.pid);
var pomelo = require('pomelo');
var userDao = require('../../../dao/userDao');
var itemDao = require('../../../dao/itemDao');
var async = require('async');
var consts = require('../../../consts/consts');
var lodash = require('lodash');
var messageService = require('../../../services/messageService');
var util = require('util');
var moment = require('moment');
var exp = module.exports;
var TourDao = require('../../../dao/tourDao');
var dictionary = require('../../../../config/dictionary.json');

exp.addEventFromBoard = function (board) {
  /**
   * emit event khi người chơi vào bàn
   * @event joinBoard
   * @param {Object} userInfo Đối tượng lưu trữ thông tin người chơi
   * @for BoardBase
   */
  board.on('joinBoard', function (player) {
    pomelo.app.get('globalChannelService').add(board.channelName, player.uid, player.userInfo.frontendId);
    pomelo.app.get('statusService').addBoard(player.uid, board.tableId);
    var channel = board.getChannel();
    if (channel) {
      var member = channel.getMember(player.uid);
      if (!member) {
        channel.add(player.uid, player.userInfo.frontendId);
      }
      else {
        channel.leave(member.uid, member.sid);
        channel.add(player.uid, player.userInfo.frontendId);
      }
    }
    if (!player.guest) {
      pomelo.app.get('boardService').updateBoard(board.tableId, {
        numPlayer: board.players.length,
        isFull: board.players.length >= board.maxPlayer ? 1 : 0
      });
      board.pushOnJoinBoard(player.uid);
      if (player.uid === board.owner) {
        // change bet
        if (board.bet > player.gold && board.gameType !== consts.GAME_TYPE.TOURNAMENT) {
          board.bet = player.gold;
          board.emit('setBoard', {bet: player.gold});
          board.pushMessage("game.gameHandler.changeBoardProperties", {
            bet: board.bet,
            notifyMsg: 'Bàn chơi đc thay đổi mức cược thành ' + player.gold + ' gold'
          })
        }
        board.timeStart = Date.now();
      }
    } else {
      pomelo.app.get('globalChannelService').add(board.guestChannelName, player.uid, player.userInfo.frontendId);
      board.pushMessage('onUpdateGuest', {numGuest: board.players.guestIds.length});
    }
    pomelo.app.get('waitingService').leave(player.uid);
    // TODO setonTurn
    if (!player.guest && board.status === consts.BOARD_STATUS.NOT_STARTED && board.owner !== player.uid) {
      setTimeout(function (player) {
        if (board.gameId === consts.GAME_ID.CO_THE) {
          if (!board.formationMode) {
            board.addJobReady(player.uid, 60000);
          } else if (board.owner !== player.uid && !player.guest) {
            board.addJobSelectFormation(board.owner);
          }
        } else {
          if (board.gameType === consts.GAME_TYPE.TOURNAMENT && board.timePlay > Date.now()){
          }else {
            board.addJobReady(player.uid)
          }
        }
      }, 100, player);
    }
    if (board.gameType === consts.GAME_TYPE.TOURNAMENT && !player.guest){
      if(board.tourType === consts.TOUR_TYPE.NORMAL){
        TourDao.getTourTable({
          where : {
            boardId : board.tableId
          },
          attributes: ['player'],
          raw : true
        })
          .then(function (tables) {
            if (tables.length < 1) return;
            var table = tables[0];
            var players = utils.JSONParse(table.player,[]);
            var index = lodash.findIndex(players, function (p) {
              return p.uid === player.uid
            });
            console.log('index : ', index);
            if (index > -1){
              players[index].inBoard = 1;
              return pomelo.app.get('mysqlClient')
                .TourTable
                .update({
                  player : JSON.stringify(players)
                }, {
                  where: {
                    boardId : board.tableId
                  }
                })
            }
          })
      }else {
        TourDao.getTourTable({
          where : {
            boardId : board.tableId
          },
          attributes: ['player'],
          raw : true
        })
          .then(function (tables) {
            if (tables.length < 1) return;
            var table = tables[0];
            var players = utils.JSONParse(table.player,[]);
            var index = lodash.findIndex(players, function (p) {
              return p.guildId === player.userInfo.guildId
            });
            console.log('index : ', index);
            if (index > -1){
              if (!players[index] || !players[index].uid){
                board.tourGuildDefault[index] = players[index];
              }
              players[index] = {
                sIcon : player.userInfo.sIcon,
                fullname: player.userInfo.fullname,
                avatar: player.userInfo.avatar,
                inBoard: 1,
                uid: player.uid
              };
              return pomelo.app.get('mysqlClient')
                .TourTable
                .update({
                  player : JSON.stringify(players)
                }, {
                  where: {
                    boardId : board.tableId
                  }
                })
            }
          })
      }
    }
  });

  board.on('sitIn', function (player) {
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer: board.players.length,
      isFull: board.players.length >= board.maxPlayer ? 1 : 0
    });
    pomelo.app.get('globalChannelService').leave(board.guestChannelName, player.uid, player.userInfo.frontendId);
    board.pushMessage('onUpdateGuest', {numGuest: board.players.guestIds.length});
    if (!player.guest && board.status === consts.BOARD_STATUS.NOT_STARTED && board.owner !== player.uid) {
      setTimeout(function (player) {
        if (board.gameId === consts.GAME_ID.CO_THE) {
          if (!board.formationMode) {
            board.addJobReady(player.uid, 60000);
          } else if (board.owner !== player.uid && !player.guest) {
            board.addJobSelectFormation(board.owner);
          }
        } else {
          if (board.gameType === consts.GAME_TYPE.TOURNAMENT && board.timePlay > Date.now()){
          } else {
            board.addJobReady(player.uid)
          }
        }
      }, 100, player)
    }
    if (player.uid === board.owner){
      if (board.bet > player.gold && board.gameType !== consts.GAME_TYPE.TOURNAMENT) {
        board.bet = player.gold;
        board.emit('setBoard', {bet: player.gold});
        board.pushMessage("game.gameHandler.changeBoardProperties", {
          bet: board.bet,
          notifyMsg: 'Bàn chơi đc thay đổi mức cược thành ' + player.gold + ' gold'
        })
      }
    }
    if (board.tourType === consts.TOUR_TYPE.FRIENDLY) {
      TourDao.getTourTable({
        where : {
          boardId : board.tableId
        },
        attributes: ['player'],
        raw : true
      })
        .then(function (tables) {
          if (tables.length < 1) return;
          var table = tables[0];
          var players = utils.JSONParse(table.player,[]);
          var index = lodash.findIndex(players, function (p) {
            return p.guildId === player.userInfo.guildId
          });
          if (index > -1){
            players[index] = {
              sIcon : player.userInfo.sIcon,
              fullname: player.userInfo.fullname,
              avatar: player.userInfo.avatar,
              inBoard: 1,
              uid: player.uid
            };
            return pomelo.app.get('mysqlClient')
              .TourTable
              .update({
                player : JSON.stringify(players)
              }, {
                where: {
                  boardId : board.tableId
                }
              })
          }
        })
    }
  });


  board.on('updateInfo', function (userInfo) {
    var channel = board.getChannel();
    if (channel) {
      var member = channel.getMember(userInfo.uid);
      if (!member) {
        channel.add(userInfo.uid, userInfo.frontendId);
      }
      else {
        channel.leave(member.uid, member.sid);
        channel.add(userInfo.uid, userInfo.frontendId);
      }
    }
    pomelo.app.get('globalChannelService').add(board.guestChannelName, userInfo.uid, userInfo.frontendId);
    // resume lại bàn chơi
    if (board.status !== consts.BOARD_STATUS.NOT_STARTED){
      board.game.stringLog.push(util.format('%s --- Người chơi %s resume lại bàn chơi', moment().format('LTS'), userInfo.username))
    }
  });

  /**
   * emit khi có người chơi rời bàn
   * @event leaveBoard
   * @param {Object} userInfo Đối tượng lưu trữ thông tin người chơi
   * @for BoardBase
   */
  board.on('leaveBoard', function (userInfo, kick) {
    if (!userInfo.uid) {
      console.error('LeaveBoard error, userInfo.uid is null : %j', userInfo);
      return
    }
    if (board.jobId && board.timer) {
      board.timer.cancelJob(board.jobId);
    }
    var channel = board.getChannel();
    if (channel) {
      var member = channel.getMember(userInfo.uid);
      if (member) {
        channel.leave(member.uid, member.sid);
      }
    }
    pomelo.app.get('globalChannelService').leave(board.channelName, userInfo.uid, userInfo.frontendId);
    pomelo.app.get('globalChannelService').leave(board.guestChannelName, userInfo.uid, userInfo.frontendId);
    pomelo.app.get('statusService').leaveBoard(userInfo.uid, null); 
    if (userInfo.guest) {
      board.pushMessage('onUpdateGuest', {numGuest: board.players.guestIds.length});
    } else if (board.tourType !== consts.TOUR_TYPE.FRIENDLY){
      board.score = [0, 0]; // restart score
    }
    // restart to default value
    if (board.players.length === 0) {
      board.resetDefault()
    }
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer: board.players.length,
      isFull: board.players.length >= board.maxPlayer ? 1 : 0 
    });
    userInfo.userId = userInfo.uid;
    userInfo.avatar = JSON.stringify(userInfo.avatar || {});
    userInfo.gameId = board.gameId;
    if (kick) {
      pomelo.app.get('statusService').getStatusByUid(userInfo.uid, false, function (err, status) {
        if (status && status.online) {
          pomelo.app.get('waitingService').add(userInfo);
        }
      });
    } else {
      pomelo.app.get('waitingService').add(userInfo);
    }
    if (!userInfo.guest) {
      board.looseUser = null;
      if (board.timer) board.timer.stop()
    }
    if (board.gameType === consts.GAME_TYPE.TOURNAMENT) {
      if (board.tourType === consts.TOUR_TYPE.NORMAL) {
        if (board.numMatchPlay > 0 && board.username && board.username.indexOf(userInfo.username) > -1 && !board.tableTourFinish) {
          // finish;
          board.tournamentLog.push(util.format(moment().format() + ' --- Người chơi %s rời bàn', userInfo.username));
          var tourWinUid = board.owner;
          var winPlayer = board.players.getPlayer(tourWinUid);
          var index = board.getTourScoreIndex(winPlayer.userInfo);
          board.tourScore[index] += Math.abs(board.matchPlay - board.numMatchPlay);
          board.emit('setBoard', {score: board.tourScore ? board.tourScore.join(' - ') : null}, true);
          board.tableTourFinish = true;
          if (winPlayer) {
            board.tourWinUser = {
              guildId : winPlayer.userInfo.guildId,
              username: winPlayer.userInfo.username,
              uid: winPlayer.uid,
              fullname: winPlayer.userInfo.fullname
            };
            board.emit('tourFinish', board.tourWinUser, 'Đối thủ rời bàn chơi');
          }
        }
        if (board.username.indexOf(userInfo.username) > -1) {
          TourDao.getTourTable({
            where: {
              boardId: board.tableId
            },
            attributes: ['player'],
            raw: true
          })
            .then(function (tables) {
              if (tables.length < 1) return;
              var table = tables[0];
              var players = utils.JSONParse(table.player, []);
              var index = lodash.findIndex(players, function (p) {
                return p.uid === userInfo.uid
              });
              if (index > -1) {
                players[index].inBoard = 0;
                return pomelo.app.get('mysqlClient')
                  .TourTable
                  .update({
                    player: JSON.stringify(players)
                  }, {
                    where: {
                      boardId: board.tableId
                    }
                  })
              }
            })
        }
      }
      else {
        TourDao.getTourTable({
          where: {
            boardId: board.tableId
          },
          attributes: ['player'],
          raw: true
        })
          .then(function (tables) {
            if (tables.length < 1) return;
            var table = tables[0];
            var players = utils.JSONParse(table.player, []);
            var index = lodash.findIndex(players, function (p) {
              return p.uid === userInfo.uid
            });
            if (index > -1) {
              players[index] = board.tourGuildDefault[index] || {};
              return pomelo.app.get('mysqlClient')
                .TourTable
                .update({
                  player: JSON.stringify(players)
                }, {
                  where: {
                    boardId: board.tableId
                  }
                })
            }
          })
      }
    }
  });


  /**
   *  Được bàn chơi emit khi bàn chơi được xoá
   *  @event close
   *  @for BoardBase
   */
  board.on('close', function () {
    console.error('handler emit close');
    pomelo.app.get('boardService').delBoard(board.tableId, function (err, res) {
      if (err) {
        logger.error('error : ', err);
      }
    });
    pomelo.app.get('globalChannelService').destroyChannel(board.channelName);
  });

  board.on('startGame', function () {
    if (board.jobId) {
      board.timer.cancelJob(board.jobId);
      board.jobId = null;
    }
    board.emit('setBoard',{stt: consts.BOARD_STATUS.PLAY},true);
    var reserve = board.players.getPlayer(board.game.playerPlayingId[0]).color === consts.COLOR.BLACK;
    var status = board.getStatus();
    board.timeStart = Date.now();
    delete status['turn'];
    board.game.logs = {
      matchId: board.game.matchId,
      info: {
        index: board.index,
        gameId: board.gameId,
        hallId: board.hallId,
        roomId: board.roomId,
        turnTime: board.turnTime,
        totalTime: board.totalTime,
        bet: board.bet
      },
      status: status,
      players: reserve ? board.game.playerPlayingId.reverse() : board.game.playerPlayingId,
      timeStart: new Date(),
      result: {}
    };
    board.game.actionLog = [];
    board.game.stringLog = [];
    board.game.detailLog = [];
    for (var i =0, len = board.players.playerSeat.length; i< len; i ++){
      var playerUid = board.players.playerSeat[i];
      var player = board.players.getPlayer(playerUid);
      if (i === 1) {
        var joinPlayerState = player.getState();
        joinPlayerState.sid = board.players.getSlotId(player.uid);
        board.game.detailLog.push({
          r : dictionary['onPlayerJoin'],
          d : joinPlayerState,
          t : Date.now() - 2 * 1000
        })
      }
      else {
        joinPlayerState = board.getBoardState(playerUid);
        delete joinPlayerState.menu;
        board.game.detailLog.push({
          r : dictionary['district.districtHandler.joinBoard'],
          d : joinPlayerState,
          t : Date.now() - 4 * 1000
        })
      }
    }
  });


  /**
   * On Event endGame
   *
   * Bàn chơi emit sự kiện này khi kết thúc ván chơi
   *
   * * users [{Object}] : Mảng người chơi tương ứng trong ván đấu
   *    * uid: Định danh người chơi
   *    * result :
   *       * type : thắng hoà thua : xem thêm tại **consts.WIN_TYPE**
   *       * color : màu của người chơi
   *       * money : số tiền thắng (+) , thua (-)
   * * boardInfo : tình trạng bàn chơi :
   *    * bet : Tiền cược của bàn
   *    * tax : Số tiền phế có được của ván đấu
   *    * matchId : Định danh của ván chơi
   *    * tableId : định danh của bàn chơi
   *    * roomId : Định danh của khu vực
   *    * gameId : Định danh của game đang chơi
   *    * timeStart : thời gian bắt đầu ván
   *
   * * logs :{Object} Lưu log bàn chơi
   *
   * @event endGame
   * @param {Object} data dữ liệu thắng thua của ván đấu , bao gồm
   * @for BoardBase
   */
  board.on('finishGame', function (data, disableLooseUser, losingReason) {
    losingReason = losingReason || "Ván đầu kết thúc bình thường";
    board.timeStart = Date.now();
    var player, winUid, loseUid, winUser, loseUser;
    for (var i = 0, len = data.length; i < len; i++) {
      var user = data[i];
      player = board.players.getPlayer(user.uid);
      if (player.gold < board.bet && board.tourType !== consts.TOUR_TYPE.FRIENDLY) {
        // standUp
        setTimeout(function (user) {
          board.standUp(user.uid);
        }, 1000, user)
      }
      if (user.result.type === consts.WIN_TYPE.WIN) {
        winUid = user.uid;
        winUser = player;
        board.score[user.result.color === consts.COLOR.WHITE ? 0 : 1] += 1;
        if (board.tourScore) {
          var scoreIndex = board.getTourScoreIndex(player.userInfo);
          board.tourScore[scoreIndex] += 1;
          board.tourWin[scoreIndex] += 1;
        }
      } else if (user.result.type === consts.WIN_TYPE.LOSE || user.result.type === consts.WIN_TYPE.GIVE_UP) {
        if (!disableLooseUser) {
          board.looseUser = user.uid;
        }
        loseUid = user.uid;
        loseUser = player;
        if (board.tourLose){
          scoreIndex = board.getTourScoreIndex(player.userInfo);
          board.tourLose[scoreIndex] += 1;
        }
      }else if (user.result.type === consts.WIN_TYPE.DRAW) {
        if (board.tourScore) {
          scoreIndex = board.getTourScoreIndex(player.userInfo);
          board.tourScore[scoreIndex] += 0.5;
          board.tourDraw = lodash.map(board.tourDraw, function (score) {
            return score + 0.5;
          })
        }
      }
    }
    var stringLog = util.format('%s --- Ván đấu kết thúc do "%s"', moment().format('LTS'), losingReason);
    if (winUser){
      stringLog = stringLog + util.format(' ,Người thắng cuộc là "%s"', winUser.userInfo.username);
    }else {
      stringLog = stringLog + util.format(' ,Ván đấu kết thúc hoà');
    }
    var otherPlayerUid = board.players.getOtherPlayer();
    if (otherPlayerUid && board.players.getPlayer(otherPlayerUid) && !board.tableTourFinish) {
      board.addJobReady(otherPlayerUid);
    }
    if (board.game.logs){
      if (board.game.actionLog && board.game.actionLog.length > 0) {
        board.game.actionLog[board.game.actionLog.length -1]['notifyMsg'] = losingReason;
        board.game.logs['logs'] = JSON.stringify(board.game.actionLog);
      }
      if (board.game.stringLog && board.game.stringLog.length > 0){
        board.game.stringLog.push(stringLog);
        board.game.logs['stringLogs'] = JSON.stringify(board.game.stringLog);
      }
      if (board.game.detailLog && board.game.detailLog.length > 0){
        board.game.logs['detailLog'] = JSON.stringify(board.game.detailLog);
      }
      if (board.firstUid !== data[0].uid) {
        data.reverse();
      }
      board.game.logs.result['type'] = user.result.type === consts.WIN_TYPE.DRAW ? consts.WIN_TYPE.DRAW : consts.WIN_TYPE.WIN;
      if (winUid) board.game.logs.result['winner'] = winUid;
      if (loseUid) board.game.logs.result['looser'] = loseUid;
    }
    var logsData = {
      boardInfo: board.getBoardInfo(true),
      users: data,
      tax: 0,
      gameType: board.gameType,
      timeShow: consts.TIME.LAYER_TIME * board.winLayer + consts.TIME.TIMEOUT_LEAVE_BOARD,
      logs: board.game.logs
    };
    pomelo.app.rpc.manager.resultRemote.management(null, logsData, function () {
    });
    board.emit('setBoard', {stt: consts.BOARD_STATUS.NOT_STARTED}, true);
    board.numMatchPlay += 1;
    if (board.gameType === consts.GAME_TYPE.TOURNAMENT && !board.tableTourFinish){
      if (board.tourType === consts.TOUR_TYPE.FRIENDLY){
        setTimeout(function () {
          board.pushMessage('game.gameHandler.demand', {
            id: consts.ACTION.TOURNAMENT,
            msg: "Ván đấu sẽ bắt đầu tiếp trong 5 phút.\n Nếu 1 bên không có người đấu sẽ bị xử thua",
            time: 5 * 60 * 1000,
            btLabel: 'Ok'
          });
        }, 10000);
        // push gói tin yêu cầu đấu tiếp
      }
      board.emit('setBoard', {score : board.tourScore ? board.tourScore.join(' - ') : null}, true);
      if (winUid) {
        winPlayer = board.players.getPlayer(winUid);
        if (winPlayer) board.tournamentLog.push(util.format(moment().format() + ' --- Người chơi %s giành chiến thắng', winPlayer.userInfo.username));
      }else {
        board.tournamentLog.push(util.format(moment().format() + ' --- Ván đấu hoà'));
      }
      console.log('tournament : ', board.matchPlay, board.numMatchPlay, board.score, (Math.abs(board.score[0] - board.score[1]) > board.matchPlay / 2 && board.tourType !== consts.TOUR_TYPE.FRIENDLY) || (board.numMatchPlay >= board.matchPlay && (board.score[0] > board.score[1] || board.score[0] < board.score[1])));
      if ((Math.abs(board.score[0] - board.score[1]) > board.matchPlay / 2 && board.tourType !== consts.TOUR_TYPE.FRIENDLY) || (board.numMatchPlay >= board.matchPlay && (board.score[0] > board.score[1] || board.score[0] < board.score[1]))){
        // finish;
        var winPlayer;
        if (board.score[0] > board.score[1]){
            // đỏ win
          winPlayer = board.players.findPlayerByColor(consts.COLOR.WHITE);
        }else {
          winPlayer = board.players.findPlayerByColor(consts.COLOR.BLACK);
        }
        board.tableTourFinish = true;
        if (winPlayer){
          board.tourWinUser = {
            guildId : winPlayer.userInfo.guildId,
            username : winPlayer.userInfo.username,
            uid : winPlayer.uid,
            fullname : winPlayer.userInfo.fullname
          };
          board.emit('tourFinish', board.tourWinUser, 'Kết thúc đầy đủ các ván chơi');
        }
        return
      }

      if (board.mustWin){
        if (board.numMatchPlay >= board.matchPlay + 3){
          // random 1 người vào vòng trong
          var indexWinner = Math.round(Math.random());
          winPlayer = board.players.getPlayerByUsername(board.username[indexWinner]);
          board.tableTourFinish = true;
          if (winPlayer){
            board.tourWinUser = {
              guildId : winPlayer.userInfo.guildId,
              username : winPlayer.userInfo.username,
              uid : winPlayer.uid,
              fullname : winPlayer.userInfo.fullname
            };
            board.emit('tourFinish', board.tourWinUser, 'Người chơi "%s" được chọn thắng cuộc do cuộc đấu không kết thúc trong 5 ván');
          }
        } else if (board.numMatchPlay >= board.matchPlay + 2){
          // chuyển trận đấu về đấu cờ chớp
          board.totalTime = 5 * 60 * 1000;
          board.turnTime = 30 * 1000;
          board.pushMessage('undefined', {
            ec : 500,
            msg : "Ván đấu cuối cùng (thứ 5) sẽ được đấu với thể loại cờ chớp"
          });
        }
      }
      else if (board.numMatchPlay >= board.matchPlay && board.score[0] === board.score[1]){
          // hoà rồi
          board.tableTourFinish = true;
          board.emit('tourFinish', null, 'Hoà tất cả các ván chơi', true);
      }
    }
    return data;
  });

  /**
   * onEvent standUp
   *
   */
  board.on('standUp', function (player) {
    if (board.jobId) {
      board.timer.cancelJob(board.jobId);
    }
    else if ( player.gold < board.bet) {
      // TODO add msg on charge money button
      player.pushMenu(board.genMenu(consts.ACTION.CHARGE_MONEY))
    }
    if (board.players.length === 0) {
      board.resetDefault()
    }
    board.pushMessage('onUpdateGuest', {numGuest: board.players.guestIds.length});
    //if (board.players.length < 2 && board.startTimeout) {
    //  board.clearTimeoutStart()
    //}
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer: board.players.length,
      isFull: board.players.length >= board.maxPlayer ? 1 : 0
    });
    if (!player.guest) {
      if (board.jobId) {
        board.timer.cancelJob(board.jobId)
      }
    }
    var state = board.getBoardState(player.uid);
    messageService.pushMessageToPlayer({
      uid: player.uid,
      sid: player.userInfo.frontendId
    }, 'game.gameHandler.reloadBoard', state);
    board.pushMessageWithOutUid(player.uid, 'district.districtHandler.leaveBoard', {
      uid: player.uid
    });
    if (board.gameType === consts.GAME_TYPE.TOURNAMENT && !board.tableTourFinish){
      if (board.tourType === consts.TOUR_TYPE.NORMAL){
        if (board.numMatchPlay > 0){
          // finish;
          board.tournamentLog.push(util.format(moment().format() + ' --- Người chơi %s rời bàn', player.userInfo.username));
          var tourWinUid = board.owner;
          var winPlayer = board.players.getPlayer(tourWinUid);
          var index = board.getTourScoreIndex(player.userInfo);
          board.tourScore[index ? 0 : 1] += Math.abs(board.matchPlay - board.numMatchPlay);
          board.emit('setBoard', {score : board.tourScore ? board.tourScore.join(' - ') : null}, true);
          board.tableTourFinish = true;
          if (winPlayer){
            board.tourWinUser = {
              guildId: winPlayer.userInfo.guildId,
              username : winPlayer.userInfo.username,
              uid : winPlayer.uid,
              fullname : winPlayer.userInfo.fullname
            };
            board.emit('tourFinish', board.tourWinUser, 'Đối thủ đứng lên');
          }
        }
      }
    }
    if (board.tourType === consts.TOUR_TYPE.FRIENDLY) {
      TourDao.getTourTable({
        where: {
          boardId: board.tableId
        },
        attributes: ['player'],
        raw: true
      })
        .then(function (tables) {
          if (tables.length < 1) return;
          var table = tables[0];
          var players = utils.JSONParse(table.player, []);
          var index = lodash.findIndex(players, function (p) {
            return p.uid === player.uid
          });
          if (index > -1) {
            players[index] = board.tourGuildDefault[index] || {};
            return pomelo.app.get('mysqlClient')
              .TourTable
              .update({
                player: JSON.stringify(players)
              }, {
                where: {
                  boardId: board.tableId
                }
              })
          }
        })
    }
    else {
      board.score = [0, 0]; // restart score;
    }
    pomelo.app.get('globalChannelService').add(board.guestChannelName, player.uid, player.userInfo.frontendId);

  });


  board.on('kick', function (player) {
    var boardId = board.boardId;
    var goldAfter = player.goldAfter + player.gold;
    pomelo.app.get('backendSessionService').getByUid(player.userInfo.frontendId, player.uid, function (err, sessions) {
      var session;
      if (err) {
        logger.error('error : ', err);
        return
      }
      if (sessions && sessions.length >= 1) {
        session = sessions[0];
        session.set('tableId', null);
        session.set('excludeBoardId', [boardId]);
        session.set('serverId', null);
        session.set('gold', goldAfter);
        session.pushAll();
      }
    });
  });

  /**
   * On Event setBoard
   * Bàn chơi sẽ emit sự kiện này khi có sự kiện yêu cầu thay đổi thuộc tính của bàn chơi Như :
   *  * money - tiền bàn chơi
   *  * havePassword - password bàn chơi
   *  * maxPlayer - sô người chơi tối đa
   *
   *  @event setBoard
   *  @param {Object} opts
   *  @for BoardBase
   */
  board.on('setBoard', function (opts, tournament) {
    if (board.players.length >= board.maxPlayer) {
      opts.isFull = 1;
    }
    else {
      opts.isFull = 0;
    }
    pomelo.app.get('boardService').updateBoard(board.tableId, opts);
    if (tournament){
      pomelo.app.get('mysqlClient')
        .TourTable
        .update(opts, {
          where: {
            boardId : board.tableId
          }
        })
    }
  });

  /**
   * On Event giveUp
   * @event giveUp
   * @for BoardBase
   */
  board.on('changeOwner', function () {
    if (board.owner && board.players.getPlayer(board.owner)) {
      if (board.status === consts.BOARD_STATUS.NOT_STARTED) {
        board.pushMessageToPlayer(board.owner, 'game.gameHandler.setOwner', {
          owner: board.owner,
          menu: board.players.getPlayer(board.owner).menu
        });
        board.pushMessageWithOutUid(board.owner, 'game.gameHandler.setOwner', {owner: board.owner})
      } else {
        board.pushMessage('game.gameHandler.setOwner', {owner: board.owner});
      }
    }
  });

  board.on('resetDefault', function () {
    process.nextTick(function () {
      board.pushMessage('game.gameHandler.changeBoardProperties', {
        bet: board.bet,
        turnTime: board.turnTime,
        totalTime: board.totalTime
      })
    })
  });

  board.on('suggestBuyItem', function (uid, itemId) {
    itemDao.getItemPrice(itemId)
      .then(function (item) {
        if (item && item.length > 0){
          var player = board.players.getPlayer(uid);
          var id = Date.now();
          if (item[0] > player.gold - board.bet) return;
          player.addSuggestBuyItem({
            id : id,
            duration : 3,
            item : itemId,
            price : item[0]
          });
          board.pushMessageToPlayer(uid, 'game.gameHandler.suggestBuyItem', {
            text : consts.SUGGEST_BUY_ITEM_TEXT[itemId],
            price : item[0],
            btLabel : 'Mua luôn',
            id : id
          });
        }
      })
  });
  board.on('tourFinish', function (winner, reason , draw) {
    console.log('tourFinish : ', arguments);
    if (winner){
      var msgWinner, msgGuest;
      if(board.tourType !== consts.TOUR_TYPE.FRIENDLY){
        msgWinner = 'Chúc mừng bạn là người chiến thắng. Bạn theo dõi lịch thi đấu tiếp trong loa làng';
        msgGuest = util.format('Người chơi "%s" đã giành chiến thắng trong cặp đấu này.', winner.fullname);
        setTimeout(function () {
          board.pushMessageToPlayer(winner.uid,'onNotify',{
            type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
            title: 'Đấu trường',
            msg: msgWinner,
            buttonLabel: 'Xác nhận',
            command: {target: consts.NOTIFY.TARGET.NORMAL},
            image:  consts.NOTIFY.IMAGE.NORMAL
          });
        }, 5000)
      }else {
        msgWinner = 'Chúc mừng hội quán của bạn đã giành chiến thắng trong bàn đấu này';
        msgGuest = util.format('Hội quán "%s" đã giành chiến thắng trong cặp đấu này', board.guildName[board.guildId.indexOf(winner.guildId)]);
      }
      setTimeout(function () {
        board.pushMessageToPlayer(winner.uid, 'onNotify', {
          type: consts.NOTIFY.TYPE.POPUP,
          title: 'Đấu trường',
          msg: msgWinner,
          buttonLabel: 'Xác nhận',
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          image:  consts.NOTIFY.IMAGE.NORMAL
        });
        board.pushMessageWithOutUid(winner.uid, 'onNotify', {
          type: consts.NOTIFY.TYPE.POPUP,
          title: 'Đấu trường',
          msg: msgGuest,
          buttonLabel: 'Xác nhận',
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          image:  consts.NOTIFY.IMAGE.NORMAL
        });
      },5000);
      console.error(util.format(moment().format() + ' --- tournament -  cặp đấu : "%s" vs "%s", số phòng : %s-%s, kết thúc thắng nghiêng về : "%s" ' +
        'với lý do : %s , tỷ số : "%s", chi tiết ván chơi : %s', board.fullname[0], board.fullname[1], board.roomId, board.index, winner.fullname, reason, board.score, board.tournamentLog.join(' , ')));
    }
    else if (!board.mustWin){
      setTimeout(function () {
        board.pushMessage('onNotify', {
          type: consts.NOTIFY.TYPE.POPUP,
          title: 'Đấu trường',
          msg: 'Cặp đấu kết thúc với tỉ số hoà',
          buttonLabel: 'Xác nhận',
          command: {target: consts.NOTIFY.TARGET.NORMAL},
          image:  consts.NOTIFY.IMAGE.NORMAL
        });
      }, 5000);
      // hoà
      console.error(util.format(moment().format() + ' --- tournament - cặp đấu : "%s" vs "%s", số phòng : %s-%s, kết thúc hoà ' +
        'với lý do : %s , tỷ số : "%s", chi tiết ván chơi : %s', board.fullname[0], board.fullname[1], board.roomId, board.index, reason, board.score, board.tournamentLog.join(' , ')));
    }
    // setTimeout(function () {
    //   board.close();
    // }, 60000);

    var emitterConfig = pomelo.app.get('emitterConfig');
    setTimeout(function () {
      pomelo.app.rpc.event.eventRemote.emit(null, emitterConfig.TOURNAMENT, {
        gameId : board.gameId,
        tourId : board.tourId,
        boardId : board.tableId,
        winner: winner,
        missingMatch: board.matchPlay - board.numMatchPlay > 0 ? board.matchPlay - board.numMatchPlay : 0,
        type : board.tourType,
        player : board.players.playerSeat,
      }, function () {
      });
    }, 4000);
    // ghi log
    pomelo.app.get('mysqlClient')
      .TourTable
      .findOne({
        where: {
          boardId: board.tableId
        }
      })
      .then(function (table) {
        if (table && table.stt !== consts.BOARD_STATUS.FINISH) {
          table.updateAttributes({
            win : board.tourWin.join(' - '),
            draw : board.tourDraw.join(' - '),
            lose : board.tourLose.join(' - '),
            stt: consts.BOARD_STATUS.FINISH,
            winner: winner ? winner.uid : null
          })
        }
      })
  });

  board.on('logout', function (player) {
    if (player){
      pomelo.app.get('globalChannelService').leave(board.guestChannelName, player.uid, player.userInfo.frontendId);
      if (board.status !== consts.BOARD_STATUS.NOT_STARTED){
        board.game.stringLog.push(util.format('%s --- Người chơi %s đứt kết nối với máy chủ', moment().format('LTS'), player.userInfo.username));
      }
    }
  })
};
