/**
 * Created by KienDT on 12/02/14.
 */

var SDKService = require('../../../services/sdkService');
var utils = require('../../../util/utils');
var consts  = require('../../../consts/consts');
var code = require('../../../consts/code');
var CryptoJS = require('crypto-js');
var TopupDao = require('../../../dao/topupDao')
var Code = require('../../../consts/code')

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

var INSTANT_MAP = {
  chess_pack1: 70000,
  chess_pack10: 500000,
  chess_pack5: 1100000
}


/*
{
   "algorithm": "HMAC-SHA256",
   "developer_payload": "foobar",
   "is_consumed": false,
   "issued_at": 1524772799,
   "payment_id": "12345667512",
   "product_id": "your_product_id",
   "purchase_time": 1524772796,
   "purchase_token": "14245790188",
}
*/
Handler.prototype.sdk = function sdk(msg, session, next) {
  if (msg.instant) {
    var uid = session.uid
    var signedRequest = msg.signedRequest
    var productId = msg.productId
    var firstpart = signedRequest.split('.')[0];
    firstpart = firstpart.replace(/-/g, '+').replace(/_/g, '/');
    var signature = CryptoJS.enc.Base64.parse(firstpart).toString();
    var dataHash = CryptoJS.HmacSHA256(signedRequest.split('.')[1], consts.INSTANT_SECRET).toString();
    var isValid = signature === dataHash;
    if (!isValid) {
      // cộng tiền
      return next(null, {
        ec: Code.FAIL,
        msg: 'Thanh toán không thành công'
      })
    }
    var json = CryptoJS.enc.Base64.parse(signedRequest.split('.')[1]).toString(CryptoJS.enc.Utf8);
    var data = JSON.parse(json);
    var adsGold = INSTANT_MAP[msg.productId] || 10000
    this.app.get('mysqlClient').InAppLog
      .findOrCreate({
        where: {
          signedRequest: signedRequest
        },
        defaults: {
          signedRequest: signedRequest,
          uid: uid,
          paymentId: data.payment_id,
          productId: productId,
          purchaseTime: data.purchase_time,
          purchaseToken: data.purchase_token,
          issuedAt: data.issued_at
        }
      }, {transaction: t})
      .spread((log, created) => {
        if (created) {
          return {}
        }
        return TopupDao.topup({
          uid : session.uid,
          gold : adsGold,
          msg : "Thanh toán instant với producId " + msg.productId,
          type : consts.CHANGE_GOLD_TYPE.TOPUP_IAP,
        })
      })
      .then(res => {
        this.app.get('mysqlSequelize')
        next(null, {
          msg: 'Bạn được tặng '+adsGold+' vàng',
          gold: res ? res.gold : 0,
        });
      })
      .catch((err) => {
        console.error('instant purchase error: ', err);
        return next(null, {
          ec: Code.FAIL,
          msg: 'Payment fail. Please try again'
        })
      })
  }
  return SDKService.forward(msg)
    .then(function(rs) {
      return utils.invokeCallback(next, null, {type: msg.type, data: rs});
    })
    .catch(function(e) {
      console.error(e.stack || e);
      return utils.invokeCallback(next, null, {ec: code.EC.NORMAL, msg: code.COMMON_LANGUAGE.ERROR});
    });
};