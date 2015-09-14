/**
 * Created by vietanha34 on 1/4/15.
 */

var consts = require('../../../consts/consts');
var mongoose = require('mongoose');
var utils = require('../../../util/utils');
var async = require('async');
var logger = require('pomelo-logger').getLogger('payment', __filename);
var messageService = require('../../../services/messageService');
var userDao = require('../../../dao/userDao');
var request = require('request');
var querystring = require('querystring');
var Code = require('../../../consts/code');
var lodash = require('lodash');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var pomelo = require('pomelo');

module.exports = function (app) {
  return new PaymentRemote(app);
};

var PaymentRemote = function (app) {
  this.app = app
};

pro = PaymentRemote.prototype;

/**
 * Lấy thông tin tiền bạc của người chơi
 *
 * @param opts
 * @param cb
 */
pro.getBalance = function (opts , cb) {
  pomelo.app.get('paymentService').getBalance(opts.uid ,cb );
};

/**
 * Trừ tiền của người chơi
 *
 * @param opts
 * @param cb
 */
pro.subBalance = function (opts, cb) {
  pomelo.app.get('paymentService').subBalance(opts)
    .then(function (result) {
      utils.invokeCallback(cb, null, result)
    })
    .then(function (err) {
      utils.invokeCallback(cb, err);
    })
};

/**
 * Cộng tiền cho người chơi
 *
 * @param opts
 * @param cb
 */
pro.addBalance = function(opts, cb){
  pomelo.app.get('paymentService').addBalance(opts)
    .then(function (result) {
      utils.invokeCallback(cb, null, result)
    })
    .catch(function (err) {
      utils.invokeCallback(cb, err);
    })
};

/**
 * Đồng bộ tiền bạc trong bàn game và ngoài bàn chơi
 *
 * @param opts
 * @param cb
 */
pro.syncBalance = function (opts, cb) {
  if (!opts) { return }
  var curServer = this.app.curServer;
  logger.info('SYNC in %s : ', curServer.id, opts);
  if (opts.gameType === consts.GAME_TYPE.TOURNAMENT) {
    return utils.invokeCallback(cb, null, { ec :Code.OK})
  }
  if (lodash.isArray(opts.syncData)) {
    for (var i = 0, len = opts.syncData.length; i < len; i++) {
      var item = opts.syncData[i];
      item.gameType = opts.gameType;
      item.matchId = opts.matchId;
      item.tableId = opts.tableId;
      item.type = opts.type;
      item.time = Date.now();
      pomelo.app.get('paymentService').syncBalance(item);
    }
    utils.invokeCallback(cb, null, { ec : Code.OK});
  }else {
    pomelo.app.get('paymentService').syncBalance(opts.syncData, cb);
  }
};