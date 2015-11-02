/**
 * Created by vietanha34 on 6/12/14.
 **/

var messageService = require('../../../../services/messageService');
var Code = require('../../../../consts/code');
var consts = require('../../../../consts/consts');
var lodash = require('lodash');
var utils = require('../../../../util/utils');
var pokerConsts = require('../../../../domain/game/poker/consts');
var async = require('async');
var userDao = require('../../../../dao/userDao');

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
  this.app.get('mysqlClient')
    .XiangqiFormation
    .findAll({
      where : {
        status : 1
      },
      offset : offset,
      limit : length,
      attributes : ['id','fen', 'rank', 'name', 'win', 'turn', 'numMove'],
      order : 'rank INCR'
    })
    .then(function (formations) {
      return next(null, { formations : formations});
    })
    .catch(function (err) {
      logger.error('err : ', err);
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
      where : {
        id : id,
        status : 1
      }
    })
    .then(function (formation) {
      if(formation){
        var result = board.changeFormation(formation);
        return next(null, result)
      }else {
        return next(null, { ec : Code.FAIL, msg : ''})
      }
    })
    .catch(function (err) {
      logger.error('err : ', err);
    })
  .finally(function () {
      board = null;
    })
};

module.export = Handler;
