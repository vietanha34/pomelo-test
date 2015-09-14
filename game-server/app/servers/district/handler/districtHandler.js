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
var dataApi = require('../../../util/dataApi');

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
  var gameId = 3;
  //if (session.get('tableId')) {
  //  msg.tableId = session.get('tableId');
  //  return this.joinBoard(msg, session, next);
  //}
  if (!lodash.isNumber(gameId) || (gameId < 0 || gameId > 9)) {
    next(null, {ec: Code.FAIL});
    return;
  }
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    return next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
  }
  var lang = session.get('lang');
  var profileId = session.get('profileId');
  var user, clause;
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
          uid: userInfo.id.toString(),
          fullname: userInfo.fullname,
          sex: userInfo.sex,
          avatar: userInfo.avatar,
          frontendId: session.frontendId
        };
        clause = getQuickPlayclause(user, gameId, msg);
        var orderClause = {
          num_player: -1,
          max_buy_in: -1,
          bet: -1
        };
        self.app.get('boardService').getBoard(clause, orderClause, done)
      } else {
        next(null, {ec: Code.FAIL});
      }
    }, function (boardIds, done) {
      //var boardId = boardIds[Math.floor(Math.random() * boardIds.length)];
      var boardId = boardIds[0];
      if (boardId) {
        tableId = boardId.table_id;
        console.log(user);
        self.app.rpc.game.gameRemote.joinBoard(session, boardId.table_id, {userInfo: user}, done)
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
  var lang = session.get('lang');
  var tableId = msg.tableId;
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    return next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
  }
  var slotId = msg.slotId;
  var self = this;
  var type = msg.type;
  var profileId = session.get('profileId');
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
          uid: userInfo.id.toString(),
          fullname: userInfo.fullname,
          sex: userInfo.sex,
          avatar: userInfo.avatar,
          frontendId: session.frontendId
        };
        self.app.rpc.game.gameRemote.joinBoard(session, tableId, {userInfo: user, slotId: slotId}, done)
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
    confirm: msg.confirm
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
    num_player : {
      type : consts.WHERE_TYPE.GREATER,
      value : 0
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

/**
 * Lấy về danh sách bàn chơi
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getBoardList = function (msg, session, next) {
  var layer = msg.layer || 0;
  var maintenance = this.app.get('maintenance');
  if (!!maintenance) {
    return next(null, utils.getError(Code.GATE.FA_MAINTENANCE));
  }
  var self = this;
  async.waterfall([
    function (done) {
      var clause = {
        bet: msg.bet,
        game_type: msg.gameType,
        limit_pot: msg.limitPot,
        max_player: msg.maxPlayer,
        num_player : {
          type : consts.WHERE_TYPE.GREATER,
          value : 0
        },
        count: true
      };
      self.app.get('boardService').getBoard(clause, null, done)
    }, function (num) {
      num = num[0]['count(*)'];
      var clause = {
        bet: msg.bet,
        stt: msg.stt,
        game_type: msg.gameType,
        limit_pot: msg.limitPot,
        max_player: msg.maxPlayer
      };
      self.app.get('boardService').getBoard(clause, null, function (err, boards) {
        if (err) {
          logger.error(err);
          next(null, {
            ldata: [],
            layer: layer,
            numBoard: 0
          })
        }
        else {
          var numBoard =  lodash.countBy(function (board) {
            return board.num_player > 0 ? 1 : 0
          });
          numBoard = numBoard['1'];
          layer = layer % (Math.ceil(boards.length / LAYER_NUM_BOARD));
          var ldata = [];
          var boardLoad = boards.slice(layer * LAYER_NUM_BOARD, (layer + 1) * LAYER_NUM_BOARD);
          for (var i = 0, len = boardLoad.length; i < len; i++) {
            var board = boardLoad[i];
            ldata.push({
              gameType: board.game_type || 2,
              limitPot: board.limit_pot || 2,
              tableId: board.table_id,
              numPlayer: board.num_player,
              maxPlayer: board.max_player,
              bet: board.bet
            });
          }
          ldata = lodash.sortBy(ldata, function (data) {
            return -data.numPlayer
          });
          next(null, {
            numBoard: numBoard,
            ldata: ldata,
            layer: layer,
            numBoard : num
          });
        }
      })
    }
  ]);
};

var getQuickPlayclause = function (userInfo, gameId, msg) {
  var clause = {
    offset: 0,
    length: 2,
    game_type: msg.gameType,
    limit_pot: msg.limitPot,
    is_full: 0
  };
  var limitConfig = dataApi.limitConfig.findById(gameId);
  if (msg.bet) {
    clause.bet = msg.bet || 0
  } else {
    var value = Math.floor((isNaN(parseInt(userInfo.gold)) ? 0 : parseInt(userInfo.gold)) / limitConfig.limit);
    value = value > limitConfig.min ? value : limitConfig.min;
    clause.bet = {};
    clause.bet.value = value;
    clause.bet.type = consts.WHERE_TYPE.SMALLER_EQUAL;
  }
  return clause
};
