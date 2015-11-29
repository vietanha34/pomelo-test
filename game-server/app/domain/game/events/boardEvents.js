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
var Formula = require('../../../consts/formula');
var messageService = require('../../../services/messageService');
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
    }else {
      pomelo.app.get('globalChannelService').add(board.guestChannelName, player.uid, player.userInfo.frontendId);
      board.pushMessage('onUpdateGuest', { numGuest : board.players.guestIds.length});
    }
    pomelo.app.get('waitingService').leave(player.uid);
    // TODO setonTurn
    if (!player.guest && board.status === consts.BOARD_STATUS.NOT_STARTED && board.owner !== player.uid){
      board.addJobReady(player.uid)
    }
  });

  board.on('sitIn', function (player) {
    if (!player.guest && board.status === consts.BOARD_STATUS.NOT_STARTED && board.owner !== player.uid){
      setTimeout(function (uid) {
        board.addJobReady(uid)
      }, 100, player.uid)
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
    console.log('event leaveBoard : ');
    board.score = [0,0]; // restart scorec
    if (!userInfo.uid) {
      logger.error('LeaveBoard error, userInfo.uid is null : %j', userInfo);
      return
    }
    if (board.jobId){
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
    userInfo.userId = userInfo.uid;
    pomelo.app.get('waitingService').add(userInfo);
    if (!userInfo.guest){
      board.looseUser = null;
      board.timer.stop()
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
    //board.timer.stop();
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
  board.on('finishGame', function (data, disableLooseUser) {
    var player;
    for (var i = 0, len = data.length; i < len; i ++){
      var user = data[i];
      player = board.players.getPlayer(user.uid);
      console.log('player.gold finishGame : ', player.gold, board.bet);
      if (player.gold < board.bet){
        // standUp
        board.standUp(user.uid);
      }
      if (user.result.type === consts.WIN_TYPE.WIN){
        board.score[user.color === consts.COLOR.WHITE ? 0 : 1] += 1
      }else if (user.result.type === consts.WIN_TYPE.LOSE && !disableLooseUser){
        board.looseUser = user.uid;
      }
    }
    var otherPlayerUid = board.players.getOtherPlayer();
    if (otherPlayerUid && board.players.getPlayer(otherPlayerUid)){
      board.addJobReady(otherPlayerUid);
    }
    var logsData = {
      boardInfo : board.getBoardInfo(true),
      users : data,
      tax : 0,
      gameType : board.gameType,
      timeShow : consts.TIME.LAYER_TIME * board.winLayer + consts.TIME.TIMEOUT_LEAVE_BOARD
    };
    pomelo.app.rpc.manager.resultRemote.management(null, logsData, function () {
    });
    return data;
  });

  /**
   * onEvent standUp
   *
   *
   */
  board.on('standUp', function (player) {
    board.score = [0,0]; // restart score;
    if (board.jobId){
      board.timer.cancelJob(board.jobId);
    }
    else if (player.gold < board.bet){
      // TODO add msg on charge money button
      player.pushMenu(board.genMenu(consts.ACTION.CHARGE_MONEY))
    }
    if (board.players.length === 0) {
      board.resetDefault()
    }
    pomelo.app.get('globalChannelService').add(board.guestChannelName, player.uid, player.userInfo.frontendId);
    board.pushMessage('onUpdateGuest', { numGuest : board.players.guestIds.length});
    //if (board.players.length < 2 && board.startTimeout) {
    //  board.clearTimeoutStart()
    //}
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer : board.players.length,
      isFull : board.players.length >= board.maxPlayer ? 1 : 0
    });
    if (!player.guest){
      if (board.jobId) {
        board.timer.cancelJob(board.jobId)
      }
    }
    var state = board.getBoardState(player.uid);
    messageService.pushMessageToPlayer({ uid : player.uid, sid: player.userInfo.frontendId}, 'game.gameHandler.reloadBoard', state);
    board.pushMessageWithOutUid(player.uid, 'district.districtHandler.leaveBoard', {
      uid: player.uid
    })
  });

  board.on('sitIn', function (player) {
    pomelo.app.get('boardService').updateBoard(board.tableId, {
      numPlayer : board.players.length,
      isFull : board.players.length >= board.maxPlayer ? 1 : 0
    });
    pomelo.app.get('globalChannelService').leave(board.guestChannelName, player.uid, player.userInfo.frontendId);
    board.pushMessage('onUpdateGuest', { numGuest : board.players.guestIds.length});
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
    console.log('updateBoard is : ', opts);
    pomelo.app.get('boardService').updateBoard(board.tableId, opts)
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
  })
};

