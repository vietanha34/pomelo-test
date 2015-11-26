/**
 * Created by vietanha34 on 6/12/14.
 **/

var messageService = require('../../../../services/messageService');
var Code = require('../../../../consts/code');
var consts = require('../../../../consts/consts');
var lodash = require('lodash');
var utils = require('../../../../util/utils');
var async = require('async');
var userDao = require('../../../../dao/userDao');
var util = require('util');
var Promise = require('bluebird');

/**
 * Module handler for poker game online system base on pomelo framework
 *
 * @param app
 * @returns {Handler}
 */
module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

var pro = Handler.prototype;

pro.getListFormation = function (msg, session, next) {
  var offset = msg.offset || 0;
  var length = msg.length || 10;
  var self = this;
  Promise.delay(0)
    .then(function () {
      return [
        self.app.get('mysqlClient')
          .XiangqiFormation
          .findAll({
            where: {
              status: 1
            },
            offset: offset,
            limit: length,
            raw : true,
            attributes: ['id', 'fen', 'rank', 'name', 'win', 'turn', 'numMove']
          }),
        self.app.get('mysqlClient')
          .XiangqiFormation
          .count({
            where: {
              status: 1
            }
          })
      ]
    })
    .spread(function (formations, count) {
      var result = [];
      for (var i = 0, len = formations.length; i < len; i++) {
        result.push({
          id: formations[i].id,
          fen: formations[i].fen,
          name: formations[i].name,
          turn: formations[i].turn,
          detail: util.format('%s đi tiên, phải %s trong %s nước', formations[i].turn === consts.COLOR.WHITE ? 'đỏ' : 'đen', formations[i].win === 1 ? 'thắng' : 'hoà', formations[i].numMove)
        })
      }
      return next(null, {formations: result, offset: offset, length: formations.length, total: count});
    })
    .catch(function (err) {
      console.error('err: ', err);
    })
};

pro.changeFormation = function (msg, session, next) {
  var id = msg.id;
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
  this.app.get('mysqlClient')
    .XiangqiFormation
    .findOne({
      where: {
        id: id,
        status: 1
      },
      raw : true
    })
    .then(function (formation) {
      if (formation) {
        var result = board.changeFormation(formation, msg);
        return next(null, result)
      } else {
        return next(null, {ec: Code.FAIL, msg: ''})
      }
    })
    .catch(function (err) {
      //logger.error('err : ', err);
      console.error('err: ', err);
    })
    .finally(function () {
      board = null;
    })
};


pro.changeFormationMode = function (msg, session, next) {
  var board = session.board;
  var uid = session.uid;
  if (!board) {
    return next(null,{
      ec: Code.FA_HOME,
      msg: utils.getMessage(Code.ON_QUICK_PLAY.FA_BOARD_NOT_EXIST)
    })
  }
  if (board.owner !== uid) {
    return next(null, utils.getError(Code.ON_GAME.FA_NOT_OWNER));
  }
  if (board.status !== consts.BOARD_STATUS.NOT_STARTED) {
    return next(null, utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED));
  }
  var otherPlayerUid = board.players.getOtherPlayer();
  var otherPlayer = board.players.getPlayer(otherPlayerUid);
  if(otherPlayer && otherPlayer.ready){
    return next(null, { ec : 500, msg : 'Người chơi đã sẵn sàng, không được thay đổi thế cờ'})
  }
  return next(null, board.selectFormationMode());
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
  //if (board.owner !== uid) {
  //  messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, utils.getError(Code.ON_GAME.FA_NOT_OWNER));
  //  return
  //}

  if (board.status !== consts.BOARD_STATUS.NOT_STARTED) {
    messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, utils.getError(Code.ON_GAME.FA_BOARD_ALREADY_STARTED));
    return
  }

  board.changeBoardProperties(msg, [], function (err, res) {
    if (err) {
      console.error(err);
      messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, utils.getError(err.ec || Code.FAIL));
    } else if (res.ec) {
      messageService.pushMessageToPlayer(utils.getUids(session), msg.__route__, res);
    }
  })
};

module.export = Handler;
