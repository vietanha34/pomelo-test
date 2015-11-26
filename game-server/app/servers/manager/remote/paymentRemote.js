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

var pro = PaymentRemote.prototype;

/**
 * Trừ tiền của người chơi
 *
 * @param opts
 * @param transaction
 * @param cb
 */
pro.subBalance = function (opts, transaction, cb) {
  var self = this;
  if(typeof transaction === 'function') {
    cb = transaction;
    transaction = null;
  }
  // TODO add transaction log for rollback
  if (lodash.isArray(opts)){
    async.map(opts, this.app.get('paymentService').subBalance.bind(this.app.get('paymentService')), function (err, res) {
      utils.invokeCallback(cb, err, res);
      if (transaction){
        // save transaction
        var multi = self.app.get('redisCache').multi();
        multi.zadd(redisKeyUtil.getTransactionList(), Date.now(), transaction);
        multi.set(redisKeyUtil.getTransactionDetail(transaction), JSON.stringify({
          before : opts,
          after : res
        }));
        multi.exec();
      }
    })
  }else {
    this.app.get('paymentService')
      .subBalance(opts)
      .then(function (res) {
        return utils.invokeCallback(cb, null, res)
      })
      .catch(function (err) {
        return utils.invokeCallback(cb, null, err)
      })
  }
};

pro.transfer = function (opts, transaction, cb) {
  console.log('transfer : ', opts, transaction);
  this.app.get('paymentService').transfer(opts, cb);
};

/**
 * Cộng tiền cho người chơi
 *
 * @param opts
 * @param transaction
 * @param cb
 */
pro.addBalance = function(opts, transaction, cb){
  var self = this;
  if (typeof transaction === 'function'){
    cb = transaction;
    transaction = null;
  }
  if (lodash.isArray(opts)){
    async.map(opts, this.app.get('paymentService').addBalance.bind(this.app.get('paymentService')), function (err, res) {
      utils.invokeCallback(cb, err, res);
      if (transaction && !err){
        // remove transaction
        var multi = self.app.get('redisCache').multi();
        multi.zrem(redisKeyUtil.getTransactionList(), transaction);
        multi.del(redisKeyUtil.getTransactionDetail(transaction));
        multi.exec();
      }
    })
  }else {
    this.app.get('paymentService').addBalance(opts ,cb);
  }
};


/**
 * Đồng bộ tiền bạc trong bàn game và ngoài bàn chơi
 *
 * @param opts
 * @param cb
 */
pro.syncBalance = function (opts, cb) {
  if (!opts) { return }
  if (opts.gameType === consts.GAME_TYPE.TOURNAMENT) {
    return utils.invokeCallback(cb, null, { ec :Code.OK})
  }
  if (lodash.isArray(opts.syncData)) {
    for (var i = 0, len = opts.syncData.length; i < len; i++) {
      var item = opts.syncData[i];
      item.gameType = opts.gameType;
      item.gameId = opts.gameId;
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
