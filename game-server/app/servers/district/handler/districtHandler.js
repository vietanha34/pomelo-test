/**
 * Created by vietanha34 on 11/20/14.
 */
var Code = require('../../../consts/code');
var userDao = require('../../../dao/userDao');
var async = require('async');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('poker', __filename);
var messageService = require('../../../services/messageService');
var consts = require('../../../consts/consts');
var lodash = require('lodash');
var pomelo = require('pomelo');

var LAYER_NUM_BOARD = 20;

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.quickPlay = function (msg, session, next) {
  var uid = session.uid;
  var self = this;
  var gameId = msg.gameId;
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    return next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
  }
  if (!gameId){
    return next(null, utils.getError(Code.FAIL))
  }
  var user;
  var whereClause = {
    numPlayer : {
      $lt : 2
    },
    gameId : gameId
  };
  if (msg.hallId) whereClause['hallId'] = msg.hallId;
  var tableId;
  async.waterfall([
    // get userInfo,
    function (done) {
      userDao.getUserProperties(uid, consts.JOIN_BOARD_PROPERTIES, done)
    },
    function (userInfo, done) {
      if (userInfo) {
        user = {
          gold: userInfo.gold,
          username: userInfo.username,
          uid: userInfo.id,
          fullname: userInfo.fullname,
          sex: userInfo.sex,
          avatar: userInfo.avatar,
          frontendId: session.frontendId
        };
        self.app.get('boardService').getBoard({
          where : whereClause,
          limit : 1
        },done)
      } else {
        next(null, {ec: Code.FAIL});
      }
    }, function (boardIds, done) {
      var boardId = boardIds[0];
      if (boardId) {
        tableId = boardId.tableId;
        self.app.rpc.game.gameRemote.joinBoard(session, boardId.tableId , {userInfo: user}, done)
      } else {
        var err = new Error('Không tìm thấy bàn chơi phù hợp');
        err.ec = Code.ON_QUICK_PLAY.FA_NOT_AVAILABLE_BOARD;
        done(err);
      }
    }, function (result, done) {
      if (!result.data.ec) {
        session.set('tableId', result.tableId);
        session.set('serverId', result.serverId);
        session.set('roomId', result.roomId);
        session.set('onBoard', true);
        session.pushAll();
        // TODO handle
      }
      next(null, result.data);
    }
  ], function (err) {
    if (err) {
      console.trace(err);
      next(null, utils.getError(err.ec || Code.FAIL));
    }
    user = null;
  })
};

Handler.prototype.joinBoard = function (msg, session, next) {
  var uid = session.uid;
  var tableId = msg.tableId;
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    return next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
  }
  var self = this;
  var type = msg.type;
  if (type == 1) {
    this.quickPlay(msg, session, next);
    return
  }
  if (!tableId) {
    next(null, {ec: Code.FAIL, msg: Code.FAIL});
    return
  }
  async.waterfall([
    function (done) {
      // TODO get userInfo
      userDao.getUserProperties(uid, consts.JOIN_BOARD_PROPERTIES, done);
    },
    function (userInfo, done) {
      if (userInfo) {
        var user = {
          gold: userInfo.gold,
          username: userInfo.username,
          uid: userInfo.id,
          fullname: userInfo.fullname,
          sex: userInfo.sex,
          avatar: userInfo.avatar,
          frontendId: session.frontendId
        };
        self.app.rpc.game.gameRemote.joinBoard(session, tableId, {userInfo: user}, done)
      } else {
        next(null, utils.getError(Code.ON_QUICK_PLAY.FA_NOT_ENOUGH_MONEY));
      }
    }, function (result, done) {
      if (!result.data.ec) {
        session.set('tableId', result.tableId);
        session.set('serverId', result.serverId);
        session.set('roomId', result.roomId);
        session.set('onBoard', true);
        session.pushAll();
        done();
        // TODO handle
      }
      next(null, result.data);
    }
  ], function (err) {
    if (err) {
      console.log(err);
      next(null, {ec: err.ec || Code.FAIL})
    }
  })
};

Handler.prototype.leaveBoard = function (msg, session, next) {
  var uid = session.uid;
  var tableId = session.get('tableId');
  if (!tableId) {
    next(null, {ec: Code.OK});
    return;
  }
  this.app.rpc.game.gameRemote.leaveBoard(session, {
    boardId: tableId,
    uid: uid,
  }, function (err, result) {
    if (err) {
      logger.error(err);
      next(null, {ec: Code.FAIL})
    }
    else {
      next(null, result);
      if (result && !result.ec && !result.confirm) {
        session.set('tableId', null);
        session.set('excludeBoardId', [tableId]);
        session.set('serverId', null);
        session.set('roomId', null);
        session.set('onBoard', false);
        session.pushAll();
      }
    }
  });
};

Handler.prototype.getWaitingPlayer = function (msg, session, next) {
  var waitingService = this.app.get('waitingService');
  var uid = session.uid;
  var waitingData = {
    type: msg.type || 1,
    offset: 0,
    length: 10
  };
  waitingService.getList(waitingData, uid, function (err, res) {
    if (err) {
      logger.error(err.message);
      next(null, {ec: Code.FAIL});
    }
    else {
      next(null, {users: res});
    }
  })
};

Handler.prototype.getNumBoard = function (msg, session, next) {
  var clause = {
    bet: msg.bet,
    game_type: msg.gameType,
    limit_pot: msg.limitPot,
    max_player: msg.maxPlayer,
    num_player: {
      type: consts.WHERE_TYPE.GREATER,
      value: 0
    },
    count: true
  };
  this.app.get('boardService').getBoard(clause, null, function (err, num) {
    if (err) {
      next(null, {ec: Code.FAIL})
    } else {
      next(null, {count: num[0]['count(*)']})
    }
  })
};

Handler.prototype.getHall = function (msg, session, next) {
  var gameId = msg.gameId;
  if (gameId < 1 && gameId > 6) {
    return next(null, {ec: Code.FAIL, msg: 'Sai Định danh game'}); // TODO change language
  }
  var boardService = this.app.get('boardService');
  boardService
    .getRoom({
      where: {
        gameId: gameId
      },
      raw : true
    })
    .then(function (rooms) {
      var hallConfigs = pomelo.app.get('dataService').get('hallConfig').data;
      var temp = {};
      for (i = 0, len = rooms.length; i < len ; i++){
        if (lodash.isArray(temp[rooms[i].hallId])){
          temp[rooms[i].hallId].push(rooms[i]);
        }else {
          temp[rooms[i].hallId] = [rooms[i]];
        }
      }
      rooms = temp;
      var keys = Object.keys(rooms);
      var results = [];
      for (var i = 0, len = keys.length; i< len; i ++){
        var hallId = keys[i];
        var hallKey = parseInt(''+gameId + hallId);
        var hallConfig = hallConfigs[hallKey] || {};
        results.push({
          hallId: hallId,
          gold: [parseInt(hallConfig.goldMin), parseInt(hallConfig.goldMax)],
          icon: utils.JSONParse(hallConfig.icon, {id : 0, version : 0}),
          hint: hallConfig.hint,
          room: lodash.map(rooms[hallId], function (n) {
            return {full : n.progress,  roomId: n.roomId}
          }),
          level: parseInt(hallConfig.level),
          exp: parseInt(hallConfig.exp)
        })
      }
      next(null, { data : results, gameId : gameId});
    })
};

/**
 * Lấy về danh sách bàn chơi
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getBoardList = function (msg, session, next) {
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    return next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
  }
  var gameId = msg.gameId;
  var roomId = msg.roomId;
  var hallId;
  var boardService = this.app.get('boardService');
  boardService
    .getBoard({
      where: {
        gameId: gameId,
        roomId : roomId
      }
    })
    .then(function (boards) {
      var data = [];
      for (var i = 0, len = boards.length; i < len; i ++){
        var board = boards[i];
        hallId = board.hallId;
        data.push({
          index : board.index,
          tableId : board.boardId,
          gameId : board.gameId,
          roomId : board.roomId,
          stt : board.stt,
          numPlayer : board.numPlayer,
          bet : board.bet,
          turnTime : board.turnTime,
          lock : board.password ? 1 : 0,
          optional : utils.JSONParse(board.optional, {})
        });
      }
      return next(null, { board : data, roomId : roomId, gameId : gameId, hallId : hallId})
    })
    .catch(function (err) {
      logger.error('err : ', err);
      return next(null, { board : [], roomId :roomId, gameId : gameId});
    })
};
