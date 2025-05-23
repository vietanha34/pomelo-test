/**
 * Created by vietanha34 on 11/16/14.
 */

var request = require('request');
var redisKeyUtil = require('../util/redisKeyUtil');
var code = require('../consts/code');
var formula = require('../consts/formula');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var logger = require('pomelo-logger').getLogger('payment', __filename);
var lodash = require('lodash');
var async = require('async');
var rabbit = require('rabbit.js');
var UserDao = require('../dao/userDao');
var NotifyDao = require('../dao/notifyDao');
var PaymentDao = require('../dao/paymentDao');
var pomelo = require('pomelo');
var MD5 = require('MD5');

var RabbitService = function (app, opts) {
  this.app = pomelo.app;
  this.connectTry = 0;
  this.opts = opts;
  this.redisCache = this.app.get('redisCache');
  this.amqpServer = this.app.get('serviceConfig').charge_queue.url;
  this.channelName = ['topupResult', consts.PARTNER_ID, consts.PR_ID].join('_');
  this.lockKey = {};
};

module.exports = RabbitService;

var pro = RabbitService.prototype;

pro.run = function () {
  this.context = rabbit.createContext(this.amqpServer);
  var self = this;
  logger.error('calling payment run connect to ' + this.amqpServer);
  this.context.on('ready', function () {
    logger.error('amqp allReady + listen in ' + self.channelName);
    var sub = self.context.socket('PULL');
    sub.connect(self.channelName, function () {
    });
    sub.setEncoding('utf8');
    sub.setsockopt('expiration', 60 * 1000, {prefetch: 1});
    sub.on('data', lodash.partial(ProcessTopup, self.app))
  });
  this.context.on('close', function () {
    logger.error('connection has been terminated');
    self.reconnect();
  });
  this.context.on('error', function (err) {
    logger.error('connection has been terminated');
    setTimeout(function () {
      self.reconnect();
    }, 10000)
  });
  //this.autoUnlockKey();
};

pro.reconnect = function () {
  if (this.connectTry > 10) {
    return;
  }
  this.connectTry++;
  this.context = rabbit.createContext(this.amqpServer);
  this.run();
};

pro.autoUnlockKey = function () {
  var self = this;
  setInterval(function () {
    var keys = Object.keys(self.lockKey);
    var current = Date.now();
    for (var i = 0, len = keys.length; i < len; i++) {
      if (current - self.lockKey[keys[i]] >= 9000) {
        delete self.lockKey[keys[i]];
      }
    }
  }, 10000);
};

/**
 * - **handler:** url này cấu hình theo Mobile server
 - **method:** POST
 - **params:**

 Tên trường | Kiểu | Ý nghĩa
 ---|---|---
 `id` | int | ID của giao dịch
 `status` | int | trạng thái giao dịch (1-thành công)
 `username` | string | Username
 `platform` | int | (1: iOS, 2: android, 3: windows phone, 4: java, 5: web), optional; nếu là SMS thì sẽ không có platform
 `partnerId` | int | ID của đối tác (optional, mặc định là 0, tức là không có đối tác)
 `dtId` | int | ID của nhà phân phối
 `spId` | int | ID của chi nhánh (optional, nếu là SMS sẽ ko có spId)
 `prId` | int | ID của sản phẩm
 `money` | float | tiền thực tế (VD 1.99)
 `currency` | string | đơn vị tiền (VD: VND, USD,...)
 `moneyType` | int | loại tiền game (1: gold-loại tiền mặc định, 2: ruby-loại tiền thứ 2)
 `gameMoney` | int | tiền trong game
 `extra` | string json | các thông tin khác gửi sang có thể để vào đây
 `signature` | string | md5(username&#124;partnerId&#124;dtId&#124;prId&#124;money&#124;moneyType&#124;gameMoney&#124;secretKey), secretKey sẽ được cung cấp khi kết nối hệ thống

 *Trường `extra` là json object có thể có các trường thông tin sau*

 Tên trường | Kiểu | Ý nghĩa
 ---|---|---
 `phone` | string | SĐT gửi SMS lên (nếu là SMS)
 `message` | string | nội dung tin nhắn (nếu là SMS)
 `cardCode` | string | mã thẻ cào
 `serial` | string | mã seri thẻ
 `type` | int | loại thẻ (1-MOBI, 2-VTT, 3-VINA, 4-FPT, 5-MGC-megacard)

 - **response:** json, trả về {ec:0} nếu thành công, {ec:!=0,msg:...} nếu thất bại
 *
 *
 * @param msg
 * @param app
 * @param numberRetry
 * @constructor
 */

function ProcessTopup(app, msg, numberRetry) {
  try {
    var data = utils.JSONParse(msg.toString());
    console.error('TOPUP: ', data);
    numberRetry = numberRetry || 0;
    if (numberRetry > 4) {
      data.msg = 'Retry failed';
      return logging(data, false);
    }
    var signature = data.signature;
    var keyString = [data.username, data.partnerId, data.dtId, data.prId, data.money
      , data.moneyType, data.gameMoney, consts.CHARGE_SECRET_KEY].join('|');
    var currentSignature = MD5(keyString);
    if (signature !== currentSignature) {
      return logger.info('Charge handle result : invalid signature');
    }
    if (data.ec) {
      return async.waterfall([
        function (done) {
          UserDao.getUserIdByUsername(data.username, done);
        },
        function (uid, done) {
          if (uid) {
            NotifyDao.push({
              type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
              title: code.PAYMENT_LANGUAGE.NOTICE,
              msg: data.msg.vi,
              buttonLabel: 'OK',
              scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
              users: [uid],
              image:  consts.NOTIFY.IMAGE.ALERT
            });
          }
          done();
        }
      ]);
    }
    var userId, vipPoint;
    async.waterfall([
      function (done) {
        UserDao.getUserPropertiesByUsername(data.username, ['uid', 'vipPoint'], done);
      },
      function (userInfo, done) {
        userInfo = userInfo || {};
        userId = userInfo.uid;
        vipPoint = userInfo.vipPoint || 0;
        var uid = userId;
        if (!uid) {
          data.msg = 'uid not found';
          logging(data, false);
          return done({msg: 'uid not found'})
        }
        if (data.methodType === consts.TOPUP_TYPE.SMS && data.sub)
          data.methodType = consts.TOPUP_TYPE.SUB;

        var type = (data.methodType === consts.TOPUP_TYPE.SMS && data.sub)
                    ? consts.TOPUP_TYPE.SUB
                    : data.methodType;

        PaymentDao.getPromotionByType(uid, type, function (err, myPromotion) {
          logger.info('myPromotion: ', myPromotion);
          var rate = myPromotion || 0;
          done(null, userId, rate);
        });
      },
      function (uid, bonusPercent, done) {
        if (bonusPercent) {
          data.promotionMoney += Math.round(data.gameMoney * bonusPercent / 100);
        }
        if (['chess6', 'chess8', 'chess7'].indexOf(data.packageName) > -1) {
          data.promotionMoney = data.gameMoney
        }
        var addVip = formula.calVipPointByMoney((data.currency === 'VND' ? data.money : data.money*22000));
        var vipAfter = (vipPoint+addVip);
        var opts = {
          uid: uid,
          gold: data.promotionMoney,
          msg: "Nạp tiền vào game qua "+data.methodType+"; vip trước: "+vipPoint+'; vip cộng: '+addVip+'; vip sau: '+vipAfter,
          bonus: data.promotionMoney - data.gameMoney,
          type: data.methodType
        };
        app.get('paymentService').addBalance(opts, done)
      }
    ], function (err, results) {
      if (err) {
        logger.error("message : %s , stack : %s, e: %j", err.message, err.stack, err);
        return logging(data, false);
      }

      NotifyDao.push({
        type: consts.NOTIFY.TYPE.NOTIFY_CENTER,
        title: code.PAYMENT_LANGUAGE.NOTICE,
        msg: 'Bạn vừa nạp thành công ' + data.promotionMoney + ' vàng',
        buttonLabel: 'OK',
        scope: consts.NOTIFY.SCOPE.USER, // gửi cho user
        users: [userId],
        gold: results.gold,
        image:  consts.NOTIFY.IMAGE.GOLD
      });

      var emitterConfig = pomelo.app.get('emitterConfig');
      pomelo.app.rpc.event.eventRemote.emit(null, emitterConfig.TOPUP, {
        uid: userId,
        topupType: data.methodType,
        money: data.money,
        packageName: data.packageName,
        currency: data.currency,
        gold: data.promotionMoney,
        bonus: data.promotionMoney - data.gameMoney
      }, function () {});

      logging({transactionId: data.id}, true)
    });
  } catch (err) {
    utils.log("message : %s , stack : %s ", err.message, err.stack);
    logger.error("message : %s , stack : %s ", err.message, err.stack);
    var message = {msg: err.message, data: msg};
    logging(message, false);
  }
}

function logging(data, success) {
  var redisClient = pomelo.app.get('redisCache');
  var successKey = 'charge:success';
  var failureKey = 'charge:failure';
  var key = success
    ? successKey
    : failureKey;
  redisClient.zadd(key, Date.now(), JSON.stringify(data), function (err, res) {
    if (err) {
      logger.error("message : %s , stack : %s ", err.message, err.stack);
    }
  });
}
