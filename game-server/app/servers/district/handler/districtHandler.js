/**
 * Created by vietanha34 on 11/20/14.
 */
var Code = require('../../../consts/code');
var userDao = require('../../../dao/userDao');
var friendDao = require('../../../dao/friendDao');
var async = require('async');
var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('poker', __filename);
var messageService = require('../../../services/messageService');
var consts = require('../../../consts/consts');
var lodash = require('lodash');
var pomelo = require('pomelo');
var Formula = require('../../../consts/formula');

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
    if (maintenance.type === consts.MAINTENANCE_TYPE.ALL) {
      next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
      return
    }else if(maintenance.type === consts.MAINTENANCE_TYPE.GAME && lodash.isArray(maintenance.game) && maintenance.game.indexOf(gameId) > -1){
      next(null, { ec : Code.GATE.FA_MAINTENANCE_GAME, msg : [Code.GATE.FA_MAINTENANCE_GAME, gameId]});
      return
    }
  }
  if (!gameId) {
    return next(null, utils.getError(Code.FAIL))
  }
  var user;
  var whereClause = {
    numPlayer: {
      $lt: 2
    },
    gameId: gameId,
    password : {
      $eq : null
    }
  };
  if(msg.roomId){
    whereClause['roomId'] = msg.roomId
  }
  var excludeBoardId = session.get('excludeBoardId');
  excludeBoardId = lodash.isArray(excludeBoardId) ? excludeBoardId : [];
  var eloKey = consts.ELO_MAP[gameId] ? consts.ELO_MAP[gameId] : 'tuongElo';
  if (msg.hallId) whereClause['hallId'] = msg.hallId;
  var tableId;
  async.waterfall([
    // get userInfo,
    function (done) {
      userDao.getUserAchievementProperties(uid, consts.JOIN_BOARD_PROPERTIES,[[eloKey, 'elo']], done);
    },
    function (userInfo, done) {
      if (userInfo) {
        user = userInfo;
        user.elo = user['Achievement.elo'];
        user.level = Formula.calLevel(user.exp) || 0;
        user.frontendId = session.frontendId;
        user.version = session.get('version');
          whereClause['level'] = {
          $lte : user.level
        };
        whereClause['bet'] = {
          $and : {
            $lte : user.gold,
            $gt : 0
          }
        };
        self.app.get('boardService').getBoard({
          where: whereClause,
          limit: 6,
          raw : true,
          order: 'numPlayer DESC, bet DESC'
        }, done)
      } else {
        next(null, {ec: Code.FAIL});
      }
    }, function (boardIds, done) {
      for (var i = 0, len = boardIds.length; i < len; i++){
        var board = boardIds[i];
        if (excludeBoardId.indexOf(board.boardId) < 0) {
          var boardId = boardIds[i];
          break;
        }
      }
      if (boardId) {
        tableId = boardId.boardId;
        self.app.rpc.game.gameRemote.joinBoard(session, boardId.boardId, {userInfo: user}, done)
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
      done();
      next(null, result.data);
    }
  ], function (err) {
    if (err) {
      if (err.ec !== Code.ON_QUICK_PLAY.FA_NOT_AVAILABLE_BOARD){
        console.error("quickPlay err : ", err);
      }
      next(null, utils.getError(err.ec || Code.FAIL));
    }
    user = null;
  })
};

Handler.prototype.joinBoard = function (msg, session, next) {
  var uid = session.uid;
  var self = this;
  var type = msg.type;
  if (type == 1) {
    this.quickPlay(msg, session, next);
    return
  }
  var tableId = session.get('tableId') || msg.tableId;
  if (lodash.isString(tableId)) {
    gameId = tableId.split(':')[1];
  }
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    if (maintenance.type === consts.MAINTENANCE_TYPE.ALL) {
      next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
      return
    }else if(maintenance.type === consts.MAINTENANCE_TYPE.GAME && lodash.isArray(maintenance.game) && maintenance.game.indexOf(gameId) > -1){
      next(null, { ec : Code.GATE.FA_MAINTENANCE_GAME, msg : [Code.GATE.FA_MAINTENANCE_GAME,gameId]});
      return
    }
  }
  if (!tableId) {
    next(null, {ec: Code.FAIL, msg: Code.FAIL});
    return
  }
  var gameId = tableId.split(':')[1];
  var eloKey = consts.ELO_MAP[gameId] ? consts.ELO_MAP[gameId] : 'tuongElo';
  async.waterfall([
    function (done) {
      // TODO get userInfo
      userDao.getUserAchievementProperties(uid, consts.JOIN_BOARD_PROPERTIES,[[eloKey, 'elo']], done);
    },
    function (userInfo, done) {
      if (userInfo) {
        var user = {
          level: Formula.calLevel(userInfo.exp),
          gold: userInfo.gold,
          username: userInfo.username,
          uid: userInfo.uid,
          vipPoint : userInfo.vipPoint,
          fullname: userInfo.fullname,
          sex: userInfo.sex,
          avatar: userInfo.avatar,
          elo : userInfo['Achievement.elo'] || 0,
          version : session.get('version'),
          frontendId: session.frontendId
        };
        self.app.rpc.game.gameRemote.joinBoard(session, tableId, {userInfo: user, password: msg.password}, done)
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
      console.error(err);
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
  var excludeBoardId = session.get('excludeBoardId') || [];
  if (excludeBoardId.indexOf(tableId) > -1){
  }else {
    if (excludeBoardId.length >= 5){
      excludeBoardId[0] = tableId;
    }else {
      excludeBoardId.push(tableId);
    }
  }
  this.app.rpc.game.gameRemote.leaveBoard(session, {
    boardId: tableId,
    uid: uid
  }, function (err, result) {
    if (err) {
      logger.error(err);
      next(null, {ec: Code.FAIL})
    }
    else {
      next(null, result);
      if (result && !result.ec) {
        session.set('tableId', null);
        session.set('excludeBoardId', excludeBoardId);
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
  var tableId = session.get('tableId');
  var gameId = consts.GAME_ID.CO_TUONG;
  if (tableId) gameId = tableId.split(':')[1];
  if (msg.type === 2) {
    friendDao.getFriendList(uid, consts.MAX_FRIEND)
      .then(function (uids) {
        var waitingData = {
          where : {
            userId: {
              $in : uids || []
            }
          },
          attributes : ['fullname', 'gold', ['userId', 'uid'], 'level', 'avatar', 'elo'],
          offset: 0,
          limit: 10
        };
        return waitingService.getList(waitingData)
          .then(function (res) {
            for (var i = 0, len = res.length; i< len; i++){
              res[i].avatar = utils.JSONParse(res[i].avatar, {});
            }
            next(null, {users: res, type : msg.type});
          })
          .finally(function () {
            msg = null;
          });
      });
  } else {
    var waitingData = {
      where : { gameId : gameId},
      attributes : ['fullname', 'gold', ['userId', 'uid'], 'level', 'avatar', 'elo'],
      offset: 0,
      limit: 10
    };
    return waitingService.getList(waitingData)
      .then(function (res) {
        for (var i = 0, len = res.length; i< len; i++){
          res[i].avatar = utils.JSONParse(res[i].avatar, {});
        }
        next(null, {users: res, type : msg.type});
      })
      .finally(function () {
        msg = null;
      });
  }
};

Handler.prototype.getHall = function (msg, session, next) {
  var gameId = msg.gameId;
  if (gameId < 1 && gameId > 6) {
    return next(null, {ec: Code.FAIL, msg: 'Sai Định danh game'}); // TODO change language
  }
  this.app.get('waitingService').leave(session.uid);
  var eloKey = consts.ELO_MAP[gameId] ? consts.ELO_MAP[gameId] : 'tuongElo';
  var waitingData = {
    username: session.get('username'),
    fullname: session.get('fullname'),
    userId: session.uid,
    gold: session.get('gold'),
    level: session.get('level'),
    avatar: session.get('avatar'),
    gameId : gameId
  };
  this.app.get('mysqlClient')
    .Achievement
    .findOne({
      where : {
        uid : session.uid
      },
      attributes : [[eloKey, 'elo']],
      raw : true
    })
    .then(function (user) {
      if (user){
        waitingData['elo'] = user.elo;
        pomelo.app.get('waitingService').add(waitingData);
      }
    });
  var boardService = this.app.get('boardService');
  boardService
    .getRoom({
      where: {
        gameId: gameId
      },
      raw: true,
      order : 'roomId ASC'
    })
    .then(function (rooms) {
      var hallConfigs = pomelo.app.get('dataService').get('hallConfig').data;
      var temp = {};
      for (i = 0, len = rooms.length; i < len; i++) {
        if (lodash.isArray(temp[rooms[i].hallId])) {
          temp[rooms[i].hallId].push(rooms[i]);
        } else {
          temp[rooms[i].hallId] = [rooms[i]];
        }
      }
      rooms = temp;
      var keys = Object.keys(rooms);
      var results = [];
      for (var i = 0, len = keys.length; i < len; i++) {
        var hallId = keys[i];
        var hallKey = parseInt('' + gameId + hallId);
        var hallConfig = hallConfigs[hallKey] || {};
        results.push({
          hallId: hallId,
          gold: [parseInt(hallConfig.goldMin), parseInt(hallConfig.goldMax)],
          icon: utils.JSONParse(hallConfig.icon, {id: 0, version: 0}),
          hint: hallConfig.hint,
          room: lodash.map(rooms[hallId], function (n) {
            return {full: n.progress, roomId: n.roomId}
          }),
          level: parseInt(hallConfig.level),
          exp: parseInt(hallConfig.exp)
        })
      }
      next(null, {data: results, gameId: gameId});
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
  var gameId = msg.gameId;
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    if (maintenance.type === consts.MAINTENANCE_TYPE.ALL) {
      next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
      return
    }else if(maintenance.type === consts.MAINTENANCE_TYPE.GAME && lodash.isArray(maintenance.game) && maintenance.game.indexOf(gameId) > -1){
      next(null, { ec : Code.GATE.FA_MAINTENANCE_GAME, msg : [Code.GATE.FA_MAINTENANCE_GAME,gameId]});
      return
    }
  }
  var roomId = msg.roomId;
  var hallId;
  var boardService = this.app.get('boardService');
  boardService
    .getBoard({
      where: {
        gameId: gameId,
        roomId: roomId
      },
      raw : true,
      attributes : ['index', 'boardId', 'gameId', 'roomId', 'stt', 'numPlayer', 'bet', ['totalTime', 'turnTime'], ['password', 'lock'],'optional'],
      order: '`index` ASC'
    })
    .then(function (boards) {
      var data = [];
      for (var i = 0, len = boards.length; i < len; i++) {
        var board = boards[i];
        hallId = board.hallId;
        data.push({
          index: board.index,
          tableId: board.boardId,
          gameId: board.gameId,
          roomId: board.roomId,
          stt: board.stt,
          numPlayer: board.numPlayer,
          bet: board.bet,
          turnTime: board.turnTime,
          lock: board.lock ? 1 : 0,
          optional: utils.JSONParse(board.optional, {})
        });
      }
      return next(null, {board: data, roomId: roomId, gameId: gameId, hallId: hallId})
    })
    .catch(function (err) {
      logger.error('err : ', err);
      return next(null, {board: [], roomId: roomId, gameId: gameId});
    })
};
