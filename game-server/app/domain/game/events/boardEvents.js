/**
 * Created by vietanha34 on 6/16/14.
 */

var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('game', __filename, process.pid);
var pomelo = require('pomelo');
var userDao = require('../../../dao/userDao');
var async = require('async');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var lodash = require('lodash');
var exp = module.exports;

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
    if (!player.guest){
      pomelo.app.get('boardService').updateBoard(board.tableId, {
        numPlayer : board.players.length,
        isFull : board.players.length >= board.maxPlayer ? 1 : 0
      });
      board.pushOnJoinBoard(player.uid);
    }
    //pomelo.app.get('waitingService').leave(player.uid);
    // TODO setonTurn
    if (!player.guest && board.status === consts.BOARD_STATUS.NOT_STARTED && board.owner !== player.uid){
      board.addJobReady(player.uid)
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
  });

  /**
   * emit khi có người chơi rời bàn
   * @event leaveBoard
   * @param {Object} userInfo Đối tượng lưu trữ thông tin người chơi
   * @for BoardBase
   */
  board.on('leaveBoard', function (userInfo) {
    if (!userInfo.uid) {
      logger.error('LeaveBoard error, userInfo.uid is null : %j', userInfo);
      return
    }
    var channel = board.getChannel();
    if (channel) {
      var member = channel.getMember(userInfo.uid);
      if (member) {
        channel.leave(member.uid, member.sid);
      }
    }
    pomelo.app.get('globalChannelService').leave(board.channelName, userInfo.uid, userInfo.frontendId);
    //pomelo.app.get('chatService').clearBanUser(board.channelName, userInfo.uid);
    pomelo.app.get('statusService').leaveBoard(userInfo.uid, null);
    // restart to default value
    if (board.players.length === 0) {
      board.resetDefault()
    }
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer : board.players.length,
      isFull : board.players.length >= board.maxPlayer ? 1 : 0
    });
    //pomelo.app.get('waitingService').add(userInfo, true);
    if (!userInfo.guest){
      if (board.jobIdReady) {
        board.timer.cancelJob(board.jobIdReady)
      }
      if (board.jobIdStart) {
        board.timer.cancelJob(board.jobIdStart)
      }
    }
  });


  /**
   *  Được bàn chơi emit khi bàn chơi được xoá
   *  @event close
   *  @for BoardBase
   */
  board.on('close', function () {
    pomelo.app.get('boardService').delBoard(board.tableId, function (err, res) {
      if (err) {
        logger.error('error : ', err);
      }
    });
    pomelo.app.get('globalChannelService').destroyChannel(board.channelName);
  });


  board.on('startGame', function (userPlaying) {
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
   *       * eventType : loại thằng event
   *       * hand : Array : mảng bài thắng
   *       * handValue : Giá trị của mảng bài
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
  board.on('finishGame', function (data, cb) {

  });

  /**
   * onEvent standUp
   *
   *
   */
  board.on('standUp', function (player) {
    if (player.gold > board.bet) {
      player.menu = [board.genMenu(consts.ACTION.SIT_BACK_IN)]
    }
    else if (player.gold === 0){
      // TODO add msg on charge money button
      player.menu = [board.genMenu(consts.ACTION.CHARGE_MONEY)]
    }
    if (board.players.length === 0) {
      board.resetDefault()
    }
    //if (board.players.length < 2 && board.startTimeout) {
    //  board.clearTimeoutStart()
    //}
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer : board.players.length,
      isFull : board.players.length >= board.maxPlayer ? 1 : 0
    });
    if (!player.guest){
      if (board.jobIdReady) {
        board.timer.cancelJob(board.jobIdReady)
      }
      if (board.jobIdStart) {
        board.timer.cancelJob(board.jobIdStart)
      }
    }
  });

  board.on('sitIn', function (player) {
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer : board.players.length,
      isFull : board.players.length >= board.maxPlayer ? 1 : 0
    });
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
  board.on('setBoard', function (opts) {
    if (board.players.length >= board.maxPlayer) {
      opts.isFull = 1;
    }
    else {
      opts.isFull = 0;
    }
    pomelo.app.get('boardService').updateBoard(board.tableId, opts)
  });

  /**
   * On Event giveUp
   * @event giveUp
   * @for BoardBase
   */

  board.on('changeOwner', function (owner) {
    if (owner && board.owner && board.players.getPlayer(board.owner)) {
      if (board.status == consts.BOARD_STATUS.NOT_STARTED) {
        board.pushMessageToPlayer(board.owner, 'game.gameHandler.setOwner', {
          uid: board.owner,
          menu: board.players.getPlayer(board.owner).menu
        });
        board.pushMessageWithOutUid(board.owner, 'game.gameHandler.setOwner', {uid: board.owner})
      } else {
        board.pushMessage('game.gameHandler.setOwner', {uid: board.owner});
      }
    }
  })
};

