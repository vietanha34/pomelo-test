/**
 * Created by vietanha34 on 6/11/14.
 */

var Board = require('./board');
var channelUtil = require('../../util/channelUtil');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('game', __filename);
var utils = require('../../util/utils');
var async = require('async');
var lodash = require('lodash');
var consts = require('../../consts/consts');
var Promise = require('bluebird');


var MAX_PLAYER_IN_ROOM = 100;
var maps = {};

/**
 * BoardPool quản lý các bàn chơi, khởi tạo, xóa .. trong game process
 *
 * @module Game
 * @class BoardPool
 * @param opts
 */

var BoardPool = function (opts) {
  this.boards = {};
  this.rooms = {};
  this.serverId = opts.serverId;
  this.gameId = opts.gameId;
  this.intervel = opts.interval || 2 * 60 * 1000;
  this.check();
};

module.exports = BoardPool;

var exp = BoardPool.prototype;

exp.createRoomTournament = function (hallConfig, roomId, tableOpts, cb) {
  tableOpts = tableOpts || {};
  var self = this;
  if (roomId) {
    var roomOpts = {
      serverId: this.serverId,
      gameId: this.gameId,
      roomId: roomId,
      hallId: parseInt(hallConfig.hallId)
    };
    return pomelo.app.get('boardService')
      .addRoom(roomOpts)
      .then(function () {
        if (lodash.isArray(tableOpts.players)) {
          listPlayers = tableOpts.players;
        } else {
          var data = pomelo.app.get('dataService').get('' + roomId).data;
          var listPlayers = lodash.values(data);
        }
        for (var i = 0, len = listPlayers.length; i < len; i++) {
          var listPlayer = listPlayers[i];
          var opts = utils.clone(hallConfig);
          if (opts.hallId === consts.HALL_ID.LIET_CHAP) {
            opts.lockMode = tableOpts.lockMode || [3]; // liệt tốt 5;
            opts.removeMode = [];
            opts.optional = JSON.stringify({lock: opts.lockMode, remove: opts.removeMode});
          }
          opts.username = [listPlayer[0], listPlayer[1]];
          opts.fullname = [listPlayer[0], listPlayer[1]];
          opts.timeWait = tableOpts.timeWait * 1000 || 120000; // thời gian chờ là 1 phút
          opts.matchPlay = tableOpts.matchPlay || 3;
          opts.guildName = tableOpts.guildName;
          opts.timePlay = tableOpts.timePlay || Date.now() + 30 * 1000;
          opts.configBet = [tableOpts.bet || 5000, tableOpts.bet || 5000];
          opts.turnTime = tableOpts.turnTime || 30;
          opts.boardId = tableOpts.boardId;
          opts.totalTime = tableOpts.totalTime || 10 * 60;
          opts.showKill = tableOpts.showKill;
          opts.tourType = tableOpts.tourType;
          opts.faceOffMode = tableOpts.faceOffMode;
          opts.guildId = tableOpts.guildId;
          opts.mustWin = tableOpts.mustWin ;
          opts.caroOpen = tableOpts.caroOpen || 0;
          opts.bet = tableOpts.bet || 5000;
          opts.configTurnTime = [opts.turnTime * 1000];
          opts.configTotalTime = [opts.totalTime * 1000];
          opts.base = true;
          opts.tourTimeWait = tableOpts.tourTimeWait * 1000 || 10 * 60 * 1000;
          opts.level = tableOpts.level || 0;
          opts.roomId = roomOpts.roomId;
          opts.gameType = consts.GAME_TYPE.TOURNAMENT;
          opts.index = listPlayer['id'] || i + 1;
          self.createBoard(opts);
        }
      })
  }
  else {
    var hallId = tableOpts.hallId || hallConfig.hallId;
    var opts = utils.clone(hallConfig);
    if (hallId === consts.HALL_ID.LIET_CHAP) {
      opts.lockMode = tableOpts.lockMode || [3]; // liệt tốt 5;
      opts.removeMode = [];
      opts.optional = JSON.stringify({lock: opts.lockMode, remove: opts.removeMode});
    }
    opts.username = tableOpts.username;
    opts.boardId = tableOpts.boardId;
    opts.fullname = tableOpts.fullname;
    opts.guildName = tableOpts.guildName;
    opts.timeWait = tableOpts.timeWait || 120000; // thời gian chờ là 1 phút
    opts.matchPlay = tableOpts.matchPlay || 3;
    opts.timePlay = tableOpts.timePlay || Date.now() + 30 * 1000;
    opts.configBet = [tableOpts.bet || 5000, tableOpts.bet || 5000];
    opts.turnTime = tableOpts.turnTime || 30;
    opts.tourType = tableOpts.tourType;
    opts.guildId = tableOpts.guildId;
    opts.faceOffMode = tableOpts.faceOffMode;
    opts.totalTime = tableOpts.totalTime || 10 * 60;
    opts.showKill = tableOpts.showKill || false;
    opts.caroOpen = tableOpts.caroOpen || 0;
    opts.mustWin = tableOpts.mustWin || false;
    opts.bet = tableOpts.bet || 5000;
    opts.configTurnTime = [opts.turnTime * 1000];
    opts.configTotalTime = [opts.totalTime * 1000];
    opts.base = true;
    opts.tourTimeWait = tableOpts.tourTimeWait || 10 * 60 * 1000;
    opts.level = tableOpts.level || 0;
    opts.roomId = tableOpts.roomId;
    opts.gameType = consts.GAME_TYPE.TOURNAMENT;
    opts.index = tableOpts.index;
    opts.tourId = tableOpts.tourId;
    console.log('createBoard : ', opts);
    return self.createBoard(opts, cb);
  }
};

exp.createRoom = function (hallConfig, roomId, show) {
  var hallId = parseInt(hallConfig.hallId);
  var self = this;
  var roomOpts = {
    serverId: this.serverId,
    gameId: this.gameId,
    roomId: roomId,
    show : show,
    hallId: parseInt(hallConfig.hallId)
  };
  return pomelo.app.get('boardService')
    .addRoom(roomOpts)
    .then(function () {
      var opts;
      for (var i = 1; i <= 51; i++) {
        opts = utils.clone(hallConfig);
        if (hallId === consts.HALL_ID.LIET_CHAP) {
          opts.lockMode = [consts.LOCK_MODE[Math.floor(Math.random() * consts.LOCK_MODE.length)]];
          opts.removeMode = [];
          opts.optional = JSON.stringify({lock: opts.lockMode, remove: opts.removeMode});
        }
        opts.turnTime = 30;
        if (hallId === consts.HALL_ID.MIEN_PHI) {
          opts.totalTime = 30 * 60;
          opts.configTurnTime = [3 * 60 * 1000];
          opts.configTotalTime = [30 * 60 * 1000];
        } else {
          opts.totalTime = 10 * 60;
          opts.configTurnTime = [30 * 1000, 60 * 1000, 130 * 1000, 180 * 1000];
          opts.configTotalTime = [5 * 60 * 1000, 10 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000];
        }
        if (self.gameId === consts.GAME_ID.CO_UP && hallId === consts.HALL_ID.CAO_THU && roomId === 403) {
          opts.faceOffMode = consts.FACE_OFF_MODE.CANNON
        }
        var betConfig = hallConfig.betConfig;
        opts.configBet = [hallConfig.goldMin, hallConfig.goldMax];
        opts.bet = (betConfig[Math.floor((i - 1) / 6)] ? betConfig[Math.floor((i - 1) / 6)] : betConfig.length > 0 ? betConfig[betConfig.length - 1] : 0) || 0;
        opts.base = true;
        opts.level = hallConfig.level;
        opts.roomId = roomId;
        opts.index = i;
        self.createBoard(opts);
      }
    })
    .then(function () {})
};


exp.createBoard = function (params, cb) {
  var self = this;
  return this.create(params)
    .then(function (res) {
      return utils.invokeCallback(cb, null, {boardId: res, serverId: self.serverId, roomId: params.roomId})
    })
    .catch(function (err) {
      console.error('BoardPool error : ', err);
      return utils.invokeCallback(cb, err)
    });
};

/**
 * Tạo mới bàn chơi từ tham số
 *
 * @method create
 * @param params include gameId, districtId,
 * @param cb callback function
 * @returns {boolean}
 */
exp.create = function (params, cb) {
  var boardService = pomelo.app.get('boardService');
  var self = this;
  return Promise.delay(0)
    .then(function () {
      if(params.boardId){
        boardService.saveBoardId(params.boardId, utils.getServerIndexFromServerId(self.serverId));
        return Promise.resolve(params.boardId);
      }else {
        return boardService.genBoardId({
          serverId: self.serverId,
          gameId: self.gameId,
          gameType: params.gameType || consts.GAME_TYPE.NORMAL,
          roomId: params.roomId,
          hallId: params.hallId
        })
      }
    })
    .then(function (boardId) {
      if (self.boards[boardId]) {
        utils.invokeCallback(cb, null, boardId);
      }
      params.serverId = self.serverId;
      params.boardId = boardId;
      return Promise.resolve([Board(params, boardId), boardId]);
    })
    .spread(function (board, boardId) {
      if (board) {
        self.boards[boardId] = board;
        if (!self.rooms[board.roomId]) {
          self.rooms[board.roomId] = {};
        }
        return utils.invokeCallback(cb, null, board.tableId);
      } else {
        return utils.invokeCallback(cb, null, null);
      }
    })
    .catch(function (err) {
      console.error('BoardPool create error : ', err);
      return utils.invokeCallback(cb, err);
    })
};

/**
 * Bảo trì hệ thống
 *
 * @method maintenance
 * @param opts
 */
exp.maintenance = function (opts) {
  var self = this;
  async.forEach(Object.keys(self.boards), function (item, done) {
    var board = self.boards[item];
    if (board) {
      board.maintenance(opts);
    }
    done();
  }, function () {

  });
};

/**
 * Xóa bàn chơi từ tham số
 *
 * @method remove
 * @param params
 * @returns {boolean}
 */
exp.remove = function (params) {
  var boardId = params.tableId;
  var board;
  if (!this.boards[boardId]) return false;
  pomelo.app.get('boardService').delBoard(boardId);
  board = this.boards[boardId];
  if (board) {
    board.close();
  }
  this.boards[boardId] = null;
  return true;
};

/**
 * Dừng game
 *
 * @method stop
 * @param {Function} cb
 */
exp.stop = function (cb) {
  var self = this;
  async.forEach(Object.keys(this.boards), function (item, done) {
    var board = self.boards[item];
    pomelo.app.get('boardService').delBoard(item, function () {
      if (board) {
        board.close();
      }
      done()
    });
  }, function () {
    utils.invokeCallback(cb);
  });
};

/**
 * xóa bàn chơi với tableId
 *
 * @method delBoard
 * @param boardId
 */
exp.delBoard = function (boardId) {
  var app = pomelo.app;
  var self = this;
  var channel = pomelo.app.get('channelService').getChannel(channelUtil.getBoardChannelName(boardId), true);
  if (channel) {
    channel.destroy();
  }
  app.get('boardService').delBoard(boardId)
    .then(function () {
      var board;
      if (!self.boards[boardId]) return false;
      board = self.boards[boardId];
      board.close();
      self.boards[boardId] = null;
    });
};

exp.delRoom = function (roomId) {
  var self = this;
  return pomelo.app.get('boardService')
    .delRoom({roomId: roomId, gameId: this.gameId})
    .then(function () {
      async.forEach(Object.keys(self.boards), function (item, done) {
        var board = self.boards[item];
        if (board.roomId === roomId) {
          self.delBoard(item);
          done()
        } else {
          done();
        }
      }, function () {
        // xoá bàn chơi
      });
    })
};


/**
 * Lấy đối tượng bàn chơi từ tableId
 *
 * @method getBoard
 * @param boardId
 * @returns {*}
 */
exp.getBoard = function (boardId) {
  return this.boards[boardId];
};

/**
 *
 * @method getBoardList
 * @returns {*}
 */
exp.getBoardList = function () {
  return this.boards
};

exp.check = function () {
  var self = this;
  try {
    utils.interval(function () {
      console.error('check board status in ' + self.serverId);
      try {
        var boardId, board;
        var rooms = {};
        for (boardId in self.boards) {
          board = self.boards[boardId];
          if (!board || !board.players) {
            delete self.boards[boardId];
            continue
          }
          var numPlayer = board.players.length;
          numPlayer = lodash.isNumber(numPlayer) ? numPlayer : 0;
          rooms[board.roomId] = !rooms[board.roomId] ? numPlayer : rooms[board.roomId] + numPlayer;
          board.isAlive();
        }
        var roomKeys = Object.keys(rooms);
        for (var i = 0, len = roomKeys.length; i < len; i++) {
          var key = roomKeys[i];
          var progress = Math.floor(rooms[key] / 100 * 10);
          if (!progress && rooms[key]) progress += 1;
          pomelo.app.get('boardService').updateRoom({
            roomId: key,
            gameId: self.gameId,
            progress: progress
          })
        }
      } catch (err) {
        console.error('error ', err)
      }
    }, 40000);
  }
  catch (err) {
    console.error("error in check : %j ", err);
  }
};


function onClose(err, boardId) {
  if (!err) {
    this.boards[boardId].close();
    this.boards[boardId] = null;
  }
  else {
    logger.warn('remove instance error! id : %j, err : %j', boardId, err);
  }
}
