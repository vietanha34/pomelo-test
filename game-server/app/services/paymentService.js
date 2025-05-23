/**
 * Created by vietanha34 on 11/16/14.
 */

var request = require('request');
var redisKeyUtil = require('../util/redisKeyUtil');
var Code = require('../consts/code');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var logger = require('pomelo-logger').getLogger('payment', __filename);
var lodash = require('lodash');
var async = require('async');
var util = require('util');
var Promises = require('bluebird');
var userDao = require('../dao/userDao');
var pomelo = require('pomelo');
var MD5 = require('MD5');

var PaymentService = function (app, opts) {
  this.app = app;
  this.opts = opts;
  this.ttl = opts.ttl | 900;
};

module.exports = PaymentService;

pro = PaymentService.prototype;

/**
 * Hàm trừ tiền trong hệ thống
 *
 * @param opts
 * @param cb
 */
pro.subBalance = function (opts) {
  logger.info('subBalance: ', opts);
  var gold = opts.gold;
  var uid = opts.uid;
  var goldAfter = 0;
  var goldSub = 0;
  if (!uid || (typeof gold != 'undefined' && gold <= 0))
    return Promises.reject({ec: Code.PAYMENT.ERROR_PARAM});
  return pomelo.app.get('mysqlClient').sequelize.transaction(function (t) {
    return pomelo.app.get('mysqlClient')
      .User
      .findOne({where: {uid: uid}, attributes: ['uid', 'gold', 'username', 'platform']}, {transaction: t})
      .then(function (user) {
        if (!user) {
          return Promises.reject({ec: Code.USER_NOT_EXIST});
        } else {
          if (opts.force) {
            gold = gold ? user.gold > gold ? gold : user.gold : user.gold;
          } else if (user.gold < gold) {
            pomelo.app.get('videoAdsService')
              .getAds({platform: user.platform})
              .then(function (data) {
                var ads;
                if (!data.ec) {
                  ads = JSON.stringify(data.data);
                }
                pomelo.app.get('statusService')
                  .pushByUids([user.uid], 'onSuggestCharge', {
                    ads: ads,
                    msg: "Bạn không đủ tiền để thực hiện thao tác này, bạn có muốn nạp thêm tiền không?"
                  })
              });
            return Promises.reject({ec: Code.PAYMENT.MONEY_LOWER});
          }
          goldSub = gold;
          goldAfter = user.gold - gold;
          var log = {
            before: user.gold
            , after: user.gold - gold
            , temp: 0
            , time: new Date().getTime()
            , opts: opts
            , cmd: 'subGold'
          };
          pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyTopupKey(), JSON.stringify(log));
          updateGoldInCache(user.username, user.gold - gold);
          return user.updateAttributes({
            gold: user.gold - gold
          }, {transaction: t});
        }
      })
  })
    .then(function (results) {
      return Promises.resolve({ec: Code.OK, gold: goldAfter, subGold: goldSub})
    })
    .catch(function (err) {
      return Promises.resolve({ec: Code.FAIL});
    })
    .finally(function () {
      goldAfter = null;
      goldSub = null;
    })
};

/**
 * Hàm cộng tiền vào hệ thống
 *
 * @param opts
 * @param cb
 */
pro.addBalance = function (opts, cb) {
  logger.info("addBalance : ", opts);
  var gold = parseInt(opts.gold);
  var uid = opts.uid;
  var goldAfter = 0;
  if (isNaN(gold) || gold < 0)
    return utils.invokeCallback(cb, null, {ec: Code.PAYMENT.ERROR_PARAM});
  return pomelo.app.get('mysqlClient').sequelize.transaction(function (t) {
    return pomelo.app.get('mysqlClient')
      .User
      .findOne({where: {uid: uid}, attributes: ['uid', 'gold', 'goldInGame', 'username']}, {transaction: t})
      .then(function (user) {
        if (!user) {
          return utils.invokeCallback(cb, null, {ec: Code.USER_NOT_EXIST});
        } else {
          goldAfter = user.gold + gold;
          var log = {
            before: user.gold
            , after: user.gold + gold
            , temp: 0
            , time: new Date().getTime()
            , opts: opts
            , cmd: 'addGold'
          };
          pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyTopupKey(), JSON.stringify(log));
          updateGoldInCache(user.username, user.gold + gold);
          return pomelo.app.get('mysqlClient')
            .User
            .update({
              gold: pomelo.app.get('mysqlClient').sequelize.literal('gold + ' + gold),
              goldInGame: opts.type === consts.CHANGE_GOLD_TYPE.LEAVE_BOARD ? 0 : user.goldInGame
            }, {
              where: {
                uid: uid
              },
              transaction: t
            })
        }
      })
  })
    .then(function () {
      return utils.invokeCallback(cb, null, {ec: Code.PAYMENT.SUCCESS, gold: goldAfter});
    })
    .finally(function () {
      goldAfter = null;
    })
};

pro.transfer = function (opts, cb) {
  var gold = opts.gold;
  if (isNaN(gold) || gold < 0)
    return utils.invokeCallback(cb, null, {ec: Code.PAYMENT.ERROR_PARAM});
  console.error('handler transfer : ', opts);
  return Promises.delay(0)
    .then(function () {
      return [
        pomelo.app.get('mysqlClient')
          .User
          .findOne({
            where: {
              uid: opts.fromUid
            },
            raw: true,
            attributes: ['gold', 'username', 'uid']
          }),
        pomelo.app.get('mysqlClient')
          .User
          .findOne({
            where: {
              uid: opts.toUid
            },
            raw: true,
            attributes: ['gold', 'username', 'uid']
          })
      ];
    })
    .spread(function (fromUser, toUser) {
      var subGold = gold;
      if (fromUser.gold >= gold) {
        fromUser.gold -= gold
      } else {
        subGold = fromUser.gold;
        fromUser.gold = 0;
      }
      var addGold = opts.tax ? Math.round(subGold * (100 - opts.tax) / 100) : subGold;
      updateGoldInCache(fromUser.username, fromUser.gold);
      updateGoldInCache(toUser.username, toUser.gold + addGold);
      var logFromUser = {
        before: fromUser.gold + gold,
        after: fromUser.gold,
        temp: 0,
        time: new Date().getTime(),
        opts: {
          uid: fromUser.uid,
          gold: subGold,
          type: consts.CHANGE_GOLD_TYPE.PLAY_GAME,
          gameId: opts.gameId,
          msg: opts.msg
        }
        ,
        cmd: 'subGold'
      };
      pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyTopupKey(), JSON.stringify(logFromUser));
      var logToUser = {
        before: toUser.gold,
        after: toUser.gold + addGold,
        temp: 0,
        time: new Date().getTime(),
        opts: {
          uid: toUser.uid,
          gold: addGold,
          type: consts.CHANGE_GOLD_TYPE.PLAY_GAME,
          gameId: opts.gameId,
          msg: opts.msg
        },
        cmd: 'addGold'
      };
      pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyTopupKey(), JSON.stringify(logToUser));
      return pomelo.app.get('mysqlClient').sequelize.transaction(function (t) {
        console.log('transaction : ');
        return pomelo.app.get('mysqlClient')
          .User
          .update({
            gold: fromUser.gold
          }, {
            where: {
              uid: opts.fromUid
            },
            transaction: t
          })
          .then(function () {
            return pomelo.app.get('mysqlClient')
              .User
              .update({
                gold: pomelo.app.get('mysqlClient').sequelize.literal('gold + ' + addGold)
              }, {
                where: {
                  uid: opts.toUid
                },
                transaction: t
              })
          });
      })
        .catch(function (err) {
          console.log('err : ', err);
        })
    })
    .spread(function () {
      return utils.invokeCallback(cb, null);
    })
    .catch(function (err) {
      console.log('err : ', err);
      return utils.invokeCallback(cb, err);
    })
};

pro.transferGuild = function (opts, cb) {
  var gold = opts.gold;
  if (isNaN(gold) || gold < 0)
    return utils.invokeCallback(cb, null, {ec: Code.PAYMENT.ERROR_PARAM});
  return Promises.delay(0)
      .then(function () {
        return [
          pomelo.app.get('mysqlClient')
              .Guild
              .findOne({
                where: {
                  id: opts.fromGuildId
                },
                raw: true,
                attributes: ['gold', 'name', 'id']
              }),
          pomelo.app.get('mysqlClient')
              .Guild
              .findOne({
                where: {
                  id: opts.toGuildId
                },
                raw: true,
                attributes: ['gold', 'name', 'id']
              })
        ];
      })
      .spread(function (fromUser, toUser) {
        var subGold = gold;
        if (fromUser.gold >= gold) {
          fromUser.gold -= gold
        } else {
          subGold = fromUser.gold;
          fromUser.gold = 0;
        }
        var addGold = opts.tax ? Math.round(subGold * (100 - opts.tax) / 100) : subGold;
        // var logFromUser = {
        //   before: fromUser.gold + gold
        //   ,
        //   after: fromUser.gold
        //   ,
        //   temp: 0
        //   ,
        //   time: new Date().getTime()
        //   ,
        //   opts: {
        //     uid: fromUser.uid,
        //     gold: gold,
        //     type: consts.CHANGE_GOLD_TYPE.PLAY_GAME,
        //     gameId: opts.gameId,
        //     msg: opts.msg
        //   }
        //   ,
        //   cmd: 'addGold'
        // };
        // pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyTopupKey(), JSON.stringify(logFromUser));
        // var logToUser = {
        //   before: toUser.gold
        //   ,
        //   after: toUser.gold + gold
        //   ,
        //   temp: 0
        //   ,
        //   time: new Date().getTime()
        //   ,
        //   opts: {
        //     uid: toUser.uid,
        //     gold: gold,
        //     type: consts.CHANGE_GOLD_TYPE.PLAY_GAME,
        //     gameId: opts.gameId,
        //     msg: opts.msg
        //   }
        //   ,
        //   cmd: 'addGold'
        // };
        // pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyTopupKey(), JSON.stringify(logToUser));
        return pomelo.app.get('mysqlClient').sequelize.transaction(function (t) {
          console.log('transaction : ');
          return pomelo.app.get('mysqlClient')
              .Guild
              .update({
                gold: fromUser.gold
              }, {
                where: {
                  id: opts.fromGuildId
                },
                transaction: t
              })
              .then(function () {
                return pomelo.app.get('mysqlClient')
                    .Guild
                    .update({
                      gold: pomelo.app.get('mysqlClient').sequelize.literal('gold + ' + addGold)
                    }, {
                      where: {
                        id: opts.toGuildId
                      },
                      transaction: t
                    })
              });
        })
            .catch(function (err) {
              console.log('err : ', err);
            })
      })
      .spread(function () {
        return utils.invokeCallback(cb, null);
      })
      .catch(function (err) {
        console.log('transfer Guild err : ', err);
        return utils.invokeCallback(cb, err);
      })
};

pro.syncBalance = function (opts, cb) {
  var gold = opts.gold;
  if (opts.gameType && opts.gameType === consts.GAME_TYPE.TOURNAMENT) {
    return utils.invokeCallback(cb);
  }
  if (isNaN(gold) || gold < 0)
    return utils.invokeCallback(cb, null, {ec: Code.PAYMENT.ERROR_PARAM});

  pomelo.app.get('mysqlClient')
    .AccUser
    .findOne({
      where: {
        id: opts.uid
      },
      attributes: ['gold'],
      raw: true
    })
    .then(function (user) {
      if (user) {
        var log = {
          before: opts.gold + user.gold
          , after: user.gold + opts.gold
          , time: new Date().getTime()
          , action: 'sync'
          , opts: opts
        };
        utils.invokeCallback(cb, null, {ec: Code.PAYMENT.SUCCESS, gold: log.after});
        pomelo.app.get('redisService').RPUSH(redisKeyUtil.getLogMoneyTopupKey(), JSON.stringify(log));
        pomelo.app.get('mysqlClient')
          .AccUser
          .update({
            goldInGame: opts.gold
          }, {
            where: {
              id: opts.uid
            }
          })
      }
    });
};


var updateGoldInCache = function (username, gold) {
  var key = 'cothu:profile:' + username;
  return pomelo
    .app
    .get('redisInfo')
    .existsAsync(key)
    .then(function (exist) {
      if (exist) {
        return pomelo
          .app
          .get('redisInfo')
          .hsetAsync(key, 'money2', gold)
      }
    })
};

