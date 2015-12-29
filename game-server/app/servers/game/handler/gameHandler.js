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
var Loader = require('pomelo-loader');
var fs = require('fs');
var path = require('path');

module.exports = function (app) {
  if (!app.game) {
    return new Handler(app);
  }
  var gameId = app.game.gameId;
  var p = getHandlerPath(app.getBase(), app.get('gameConfig')[gameId]);
  if (!!p) {
    var handler = new Handler(app);
    var handlerMap = Loader.load(p, app);
    return utils.merge_options(handler, handlerMap['gameHandler']);
  } else {
    return new Handler(app);
  }
};

var Handler = function (app) {
  this.app = app;
};

var pro = Handler.prototype;

pro.reloadBoard = function (msg, session, next) {
  var board = session.board;
  var uid = session.uid;
  if (!board) {
    next(null, {ec: Code.FA_HOME, msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)});
    return
  }
  var data = board.getBoardState(uid);
  next(null, data);
};

pro.changeBoardProperties = function (msg, session, next) {
  var board = session.board;
  var uid = session.uid;
  msg.uid = uid;
  next();
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, {
      ec: Code.FA_HOME,
      msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)
    });
    return
  }
  if (board.owner !== uid) {
    messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, utils.getError(Code.ON_GAME.FA_NOT_OWNER));
    return
  }

  if (board.status !== consts.BOARD_STATUS.NOT_STARTED) {
    messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED));
    return
  }

  board.changeBoardProperties(parseInt(session.uid), msg, [], function (err, res) {
    if (err) {
      console.error(err);
      messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, {ec : err.ec || Code.FAIL, msg : err.msg || [Code.FAIL]});
    } else if (res.ec) {
      messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, res);
    }
  })
};

pro.standUp = function (msg, session, next) {
  var board = session.board;
  next();
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, {
      ec: Code.FA_HOME,
      msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)
    });
    return
  }

  var res = board.standUp(session.uid);
  if (res && res.ec) {
    messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, res);
  }
};

pro.setOwner = function (msg, session, next) {
  var uid = session.uid;
  var board = session.board;
  if (!board) {
    next(null, {ec: Code.FA_HOME, msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)});
    return
  }
  if (board.owner !== uid) {
    next(null, utils.getError(Code.ON_GAME.FA_NOT_OWNER));
    return
  }
  board.setOwner(msg.uid, function (err, owner) {
    if (owner) {
      next(null, {uid: owner});
      board.pushMessageWithOutUid(uid, 'game.gameHandler.setOwner', {uid: owner});
    } else {
      next(null, {uid: board.owner});
    }
  })
};


pro.continue = function (msg, session, next) {
  var board = session.board;
  var uid = session.uid;
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, {
      ec: Code.FA_HOME,
      msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)
    });
    next(null);
    return
  }
  var player = board.players.getPlayer(uid);
  if (player) {
    next(null, {menu: player.menu})
  } else {
    next(null, {ec: Code.FAIL});
  }
};


/**
 * Tư động mời người chơi vào bàn chơi
 *
 * @param msg
 * @param session
 * @param next
 */
pro.invitePlayer = function (msg, session, next) {
  var game = session.game;
  var board = session.board;
  var uid = session.uid;
  var slotId = msg.slotId;
  var id = 1;
  var statusPlugin = this.app.get('statusService');
  if (!board) {
    next(null, {ec: Code.FA_HOME, msg: utils.getMessage(Code.ON_GAME.FA_NOT_ON_BOARD)});
    return
  }
  if (board.private && board.owner !== uid) {
    logger.warn('Bàn private không có quyền mời');
    next(null, utils.getError(Code.ON_GAME.FA_NOT_OWNER));
    return
  }
  var bet = board.bet;
  var boardId = board.tableId;
  var gameId = board.gameId;
  var districtId = board.districtId;
  var fullname = session.get('fullname');
  var avatar = session.get('avatar');
  var sex = session.get('sex');
  var level = session.get('level');
  var player = board.players.getPlayer(session.uid);
  var gold = player ? player.gold : 0;
  /** TODO tournament not play game **/
  if (msg.uid) {
    statusPlugin.pushByUids([msg.uid], "game.gameHandler.invitePlayer", {
      bet: bet,
      id: id,
      player1: {current: 1},
      tableId: boardId,
      player2: {
        fname: fullname,
        avatar: avatar,
        gold: gold,
        sex: sex,
        level: level
      },
      gameId: gameId,
      districtId: districtId,
      slotId: slotId
    });
    next(null, {
      ec : Code.FAIL,
      msg: "Đã gửi lời mời thành công đến người chơi khác"
    });
    return
  }
  pomelo.app.get('waitingService').getRandomUser({
    gold: board.bet,
    limit: 2,
    gameId: board.gameId
  })
    .then(function (users) {
      console.log('invite User : ', users);
      if (lodash.isArray(users)) {
        if (users.length > 0) {
          var uids = [];
          for (var i = 0, len = users.length; i < len; i++) {
            uids.push(users[i].userId);
          }
          statusPlugin.pushByUids(uids, "game.gameHandler.invitePlayer", {
            bet: bet,
            id: id,
            player1: {current: 1},
            tableId: boardId,
            player2: {
              fname: fullname,
              avatar: avatar,
              gold: gold,
              sex: sex,
              level: level
            },
            boardId: boardId,
            gameId: gameId,
            districtId: districtId,
            slotId: slotId
          });
          next(null, {
            notifyMsg: "Đã gửi lời mời thành công đến người chơi khác"
          });
        }
        else {
          next(null, {
            ec : Code.FAIL,
            msg: 'Không có người chơi nào để mời'
          })
        }
      }
    })
    .catch(function (err) {
      console.error(err);
      next(null, {
        ec : Code.FAIL,
        msg: "Gửi lời mời chơi thất bại"
      });
    })
    .finally(function () {
      session = null;
    })
};


pro.sitIn = function (msg, session, next) {
  var board = session.board;
  var slotId = msg.slotId;
  var uid = session.uid;
  var route = msg.__route__;
  next();
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), route, {
      ec: Code.FA_HOME,
      msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)
    });
    return
  }
  board.sitIn(uid, slotId)
    .then(function (res) {
      if (!res.ec) {
        messageService.pushMessageToPlayer(utils.getUids(session), 'game.gameHandler.reloadBoard', res);
      } else {
        messageService.pushMessageToPlayer(utils.getUids(session), route, res);
      }
    })
};

pro.kick = function (msg, session, next) {
  var uid = session.uid;
  var cuid = msg.uid;
  var route = msg.__route__;
  var board = session.board;
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), route, {
      ec: Code.FA_HOME,
      msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)
    });
    return
  }
  if (board.owner !== uid) {
    next(null, utils.getError(Code.ON_GAME.FA_NOT_OWNER));
  }
  board.kick(cuid, function (err, res) {
    if (err) {
      next(null, {ec: Code.FAIL});
    }
    else if (!res.ec) {
      next(null, {});
    } else {
      next(null, res);
    }
  })
};

pro.muteChat = function (msg, session, next) {
  var uid = session.uid;
  var cuid = msg.uid;
  var route = msg.__route__;
  var board = session.board;
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), route, {
      ec: Code.FA_HOME,
      msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)
    });
    return
  }
  if (board.owner !== uid) {
    next(null, utils.getError(Code.ON_GAME.FA_NOT_OWNER));
  }
  board.muteChat(cuid, function (err, res) {
    if (err) {
      next(null, {ec: Code.FAIL});
    }
    else if (!res.ec) {
      next(null, {});
    } else {
      next(null, res);
    }
  })
};

pro.startGame = function (msg, session, next) {
  var uid = session.uid;
  var board = session.board;
  var route = msg.__route__;
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), route, utils.getError(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST));
    next(null);
    return;
  }
  if (uid != board.owner) {
    messageService.pushMessageToPlayer(utils.getUids(session), route,
      utils.merge_options(utils.getError(Code.ON_GAME.FA_WRONG_ARGUMENT), {
        menu: board.players.getPlayer(uid).menu
      }));
    next(null);
    return;
  }

  next(null);
  return board.startGame(uid, function (err, res) {
    if (res && res.ec) {
      board.pushMessageToPlayer(uid, route, res);
    } else {
      var ownerPlayer = board.players.getPlayer(uid);
      ownerPlayer.removeMenu(consts.ACTION.START_GAME);
    }
    route = null
  });
};

pro.action = function (msg, session, next) {
  var uid = session.uid;
  var board = session.board;
  var route = msg.__route__;
  if (!board) {
    messageService.pushMessageToPlayer(utils.getUids(session), route, utils.getError(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST));
    next(null);
    return
  }
  console.log('turnUid : ', board.turnUid, uid);
  if (board.turnUid !== uid || board.status === consts.BOARD_STATUS.NOT_STARTED) {
    messageService.pushMessageToPlayer(utils.getUids(session), route, {ec: 500, msg: 'Không phải lượt của bạn'});
    return next(null);
  }
  return board.action(uid, msg, function (err, res) {
    console.log('boardAction : ', res);
    if (err) {
      console.log(err);
      board.pushMessageToPlayer(uid, route, utils.getError(Code.FAIL));
      next(null);
    } else {
      board.pushMessageToPlayer(uid, route, res);
      next(null);
    }
    route = null;
  })
};

pro.ready = function (msg, session, next) {
  var board = session.board;
  var uid = session.uid;
  if (!board) {
    next(null, {ec: Code.FA_HOME, msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)});
    return
  }
  next(null, board.ready(uid))
};

pro.demand = function (msg, session, next) {
  var board = session.board;
  var uid = session.uid;
  if (!board) {
    next(null, {ec: Code.FA_HOME, msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)});
    return
  }
  msg.uid = uid;
  next(null, board.demand(msg));
};

pro.getGuest = function (msg, session, next) {
  var board = session.board;
  if (!board) {
    next(null, {ec: Code.FA_HOME, msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)});
    return
  }
  next(null, {guest: board.getGuest()});
};

/**
 * Get handler path
 *
 * @param  {String} appBase    application base path
 * @param  {String} serverType server type
 * @return {String}            path string if the path exist else null
 */
var getHandlerPath = function (appBase, serverType) {
  var p = path.join(appBase, '/app/domain/game/', serverType, consts.DIR.HANDLER);
  return fs.existsSync(p) ? p : null;
};
