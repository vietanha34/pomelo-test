/**
 * Created by bi on 6/30/15.
 */

var async = require('async');
var utils = require('../../../util/utils');
var util = require('util');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var logger = require('pomelo-logger').getLogger('payment',__filename);
var lodash = require('lodash');
var paymentDao = require('../../../dao/paymentDao');
var paymentUtil = require('../../../util/paymentUtil');
var pomelo = require('pomelo');
var moment = require('moment');
var IapUtil = require('../../../util/iapUtil');
var mailDao = require('../../../dao/mailDao');
var Promotion = require('../../../domain/payment/promotion');

module.exports = function (app) {
	return new Handler(app);
};

var Handler = function (app) {
	this.app = app;
};

Handler.prototype.getPaymentMethod = function (msg, session, next) {
	var uid = session.uid || 0;
	var type = msg.type || -1;
	var dtId = msg.dtId || 1;
	var platform = parseInt(session.get('platform')) || -1;
	if (isNaN(platform))
		platform = -1;

  //var self = this;
	async.parallel({
		channel: function (done) {
			paymentDao.getPaymentMethod({
				uid: uid,
				dtId: dtId,
				type: type,
				platform: platform
			}, done);
		},
		promotion: function (done) {
			Promotion.getPromotion(uid, done);
		}
    //, totalMatch: function (done) {
    //  self
    //    .app
    //    .get('mysqlClient')
    //    .AccUser
    //    .findOne({where: {id : uid}, raw: true, attributes: ['win', 'lose']})
    //    .then(function (user) {
    //      if (user) {
    //        return done(null, user.win + user.lose);
    //      }
    //      done(null, 0);
    //    })
    //    .catch(function (err) {
    //      done(null, 0);
    //    })
    //}
	}, function (err, result) {
		logger.info('getPaymentMethod: ', err, result);
		var channel = result ? result.channel : null;
		var unMap = {1: 'iap_apple', 2: 'iap_gg', 3: 'iap_wp', '-1' : ''};
		var cardPromotion = result && result.promotion.card ? result.promotion.card : {};
		var iapPromotion = result && result.promotion[unMap[platform]] ? result.promotion[unMap[platform]] : {};
    //var totalMatch = result && result.totalMatch ? result.totalMatch : 0;
		if (lodash.isObject(channel)) {
			var res = {card: [], iap: []};
			var keys = Object.keys(channel);
			for (var i = 0, len = keys.length; i < len; i++) {
				var type = parseInt(keys[i]);
				if (consts.PAYMENT_CONFIG.CARD.indexOf(type) != -1 && platform != consts.PLATFORM.IOS) {
          //if (totalMatch < 15 && platform == 2)
          //  continue;
					res.card.push({
						type: type,
						name: consts.PAYMENT_CONFIG.TYPE_UNMAP[type],
						data: channel[type].map(function (card) {
							if (cardPromotion[card.money] && this.type != consts.PAYMENT_CONFIG.BIT_CARD) {
								card.percent = cardPromotion[card.money];
								card.bonus = card.chip + card.chip * cardPromotion[card.money] / 100;
							}
							return card;
            }.bind({type: type}))
					});
				} else if (consts.PAYMENT_CONFIG.IAP.indexOf(type) != -1) {
					res.iap = channel[type].map(function (iap) {
						if (iapPromotion[iap.money]) {
							iap.percent = iapPromotion[iap.money];
							iap.bonus = iap.chip + iap.chip * iapPromotion[iap.money] / 100;
						}
						return iap;
					});
				}
			}
			return next(null, {ec: Code.OK, data: res});
		}
		next(null, {ec: Code.EMPTY_DATA});
	});
};

Handler.prototype.useCard = function(msg, session, next) {
	var uid = session.uid || 0;
	var type = msg.type || '';
	var pin = msg.pin || '';
	var serial = msg.serial || '';
	var platform = session.get('platform') || -1;
	var ip = session.get('ip') || '';
	var username = session.get('username') || '';
	var dtId = session.get('dtId') || 1;
	var spId = session.get('spId') || 0;

	if (!uid || !consts.PAYMENT_CONFIG.UNMAP_TYPE_CARD[type] || !pin || !serial)
		return next(null, {ec: Code.WRONG_PARAM, msg: 'Sai tham số. Vui lòng thử lại!'});
	paymentUtil.useCard({
		uid: uid,
		type: consts.PAYMENT_CONFIG.UNMAP_TYPE_CARD[type],
		pin: pin,
		serial: serial,
		os: consts.PLATFORM_UNMAP[platform] || 'unknown',
		ip: ip,
		username: username,
		dtId: dtId
	}, function (err, res) {
		logger.info('useCard: ', res);
		if (res.statusCode != 200 || !res.content) {
			return next(null, {ec: Code.FAIL, msg: 'Hệ thống cào thẻ đang lỗi. Bạn vui lòng thử lại sau. Xin cảm ơn !'});
		}
		var json = utils.JSONParse(res.content);
		if (!json) {
			return next(null, {ec: Code.FAIL, msg: 'Hệ thống cào thẻ đang lỗi. Bạn vui lòng thử lại sau. Xin cảm ơn !'});
		}
		if (json.e == 0) {
			async.parallel({
				chip: function (done) {
					paymentDao.getCardAmountToChip({
						amount: json.r,
						type: type
					}, done);
				},
				promotion: function (done) {
					Promotion.getPromotion(uid, done);
				}
			}, function (err, result) {
				if (err || !result.chip) {
					return next(null, {ec: Code.FAIL, msg: 'Có lỗi trong quá trình nạp tiền. Vui lòng liên hệ chăm sóc khách hàng để được trợ giúp. Xin cảm ơn !'});
				}
				var chip = result.chip;
				var bonus = 0;
				var cardPromotion = result.promotion.card ? result.promotion.card : {};
				if (cardPromotion[json.r] && type != consts.PAYMENT_CONFIG.BIT_CARD) {
					bonus = Math.round(chip * cardPromotion[json.r] / 100);
				}
				chip += bonus;
				pomelo.app.rpc.service.eventRemote.emit(null, pomelo.app.get('emitterConfig').TOPUP, {
					uid : uid,
					username : username,
					topupType : consts.TOPUP_TYPE.CARD,
					money : json.r,
					gold: chip
				}, function () {});
				paymentDao.logTransaction({
					chargeType: consts.PAYMENT_TYPE.CARD,
					transactionId: res.params.OrderID,
					purchaseDate: moment().format('YYYY-MM-DD HH:mm:ss'),
					username: username,
					text: pin + "\n" + serial,
					type: type,
					money: json.r,
					platform: platform,
					chip: chip || 0,
					distributorId: dtId,
					cardCode: pin,
					serial: serial,
					spId: spId,
					uid: uid,
					status: 0
				}, function (err, res) {
					if (err) logger.error('logCard error: ', err);
				});
				pomelo
					.app
					.get('paymentService')
					.addBalance({
						uid: uid,
						gold : chip,
						type: consts.PAYMENT_TYPE.CARD,
						msg: 'Nạp tiền vào game qua thẻ cào mệnh giá: ' + json.r,
						bonus: bonus
					})
          .then(function (res) {
						var msg = 'Nạp thành công: ' + result.chip + ' chips' + ( bonus ? ', khuyến mại: ' + bonus + ' chips.' : '.');
            next(null, {
	            ec: Code.OK,
	            msg: msg + ' Xin cảm ơn !'
            });
            pomelo
              .app
              .get('statusService')
              .pushByUids([uid],  'onNotify', {
                popup_type : consts.POPUP_TYPE.CENTER_SCREEN,
                message : msg + ' Chúc bạn chơi game vui vẻ !',
                gold: res.gold,
                addGold: chip
              });
            mailDao.createMessage({
              uid: uid,
              title: 'Nạp tiền thành công',
              message: msg + ' Xin cảm ơn !',
              isNew: 1,
              isHot: 1
            }, function (err, mail) {
              if (err) logger.error('error create mail: ', err);
            });
          })
          .catch(function (err) {
            return next(null, {ec: Code.FAIL, msg: 'Hệ thống cào thẻ đang lỗi. Bạn vui lòng thử lại sau. Xin cảm ơn !'});
          });
			});
		} else {
			paymentDao.logTransaction({
				chargeType: consts.PAYMENT_TYPE.CARD,
				transactionId: res.params.OrderID,
				purchaseDate: moment().format('YYYY-MM-DD HH:mm:ss'),
				username: username,
				money: 0,
				text: pin + "\n" + serial,
        type: type,
				info: json.r,
				platform: platform,
				chip: 0,
				distributorId: dtId,
				cardCode: pin,
				serial: serial,
				spId: spId,
				uid: uid,
				status: json.e
			}, function (err, res) {
				logger.info('logTransaction: ', err, res);
			});
			next(null, {ec: Code.FAIL, msg: json.r});
		}
	});
};

Handler.prototype.verifyIap = function (msg, session, next) {
	var uid = msg.uid || 0;
	var receipt = msg.receipt || '';
	var signature = msg.signature || '';
	var platform = parseInt(session.get('platform') || 0);
	var username = session.get('username') || '';
	var dtId = session.get('dtId') || 1;
	var spId = session.get('spId') || 1;

	if (!uid || !receipt || !platform || isNaN(platform))
		return next(null, {ec: Code.FAIL, msg: 'Sai tham số. Vui lòng kiểm tra lại thông tin. Xin cảm ơn !'});
  if (platform == consts.PLATFORM.ANDROID) {
    receipt = {
      signature: msg.signature,
      data: msg.receipt
    };
    signature = consts.IAP_SIGNATURE[platform];
  }
	var iap = new IapUtil({
		signature: signature,
		platform: platform
	});

	iap.verify(receipt, function (err, purchase) {
		if (purchase) {
			iap.getPurchaseData(purchase, function (data) {
				if (lodash.isArray(data) && data.length) {
					async.waterfall([
						function (done) {
							Promotion.getPromotion(uid, done);
						},
						function (promotion, done) {
							var chip = 0;
							var bonus = 0;
							var money = 0;
							var unMap = {1: 'iap_apple', 2: 'iap_gg', 3: 'iap_wp', '-1' : ''};
							var iapPromotion = promotion && promotion[unMap[platform]] ? promotion[unMap[platform]] : {};
							async.each(data, function (order, cb) {
								async.waterfall([
									function (fn) {
										paymentDao.getIapAmountToChip({productId: order.productId, platform: platform}, fn);
									},
									function (charge, fn) {
										if (!charge) {
											return fn('Giao dịch không thành công. Vui lòng kiểm tra lại gói IAP. Xin cảm ơn !');
										}
										if (iapPromotion[charge.vnd]) {
											bonus += Math.round(iapPromotion[charge.vnd] * charge.chip / 100);
										}
										chip += charge.chip;
										money += parseFloat(charge.vnd);
										paymentDao.logTransaction({
											chargeType: consts.PAYMENT_TYPE.IAP,
											transactionId: order.transactionId,
											purchaseDate: moment().format('YYYY-MM-DD HH:mm:ss'),
											username: username,
											money: charge.vnd,
											text: charge.text,
											type: 4,
											info: order.productId + ' purchase date: ' + order.purchaseDate,
											platform: platform,
											chip: charge.chip,
											distributorId: dtId,
											spId: spId,
											uid: uid,
											status: 0
										}, fn);
									}
								], cb);
							}, function (err) {
								if (err || !chip) {
									if (err) return done(err);
									return next(null, {ec: Code.OK, msg: 'Nạp tiền không thành công. Vui lòng thử lại. Xin cảm ơn !'});
								}
								var messageAlert = 'Nạp thành công: ' + chip + ' chips' + ( bonus ? ', khuyến mại: ' + bonus + ' chips.' : '.');
								chip += bonus;
								pomelo.app.rpc.service.eventRemote.emit(null, pomelo.app.get('emitterConfig').TOPUP, {
									uid: uid,
									username: username,
									topupType: consts.TOPUP_TYPE.IAP,
									money: money,
									gold: chip
								}, utils.print);
								pomelo
									.app
									.get('paymentService')
									.addBalance({
										uid: uid,
										gold: chip,
										type: consts.TOPUP_TYPE.IAP,
										msg: 'Nạp tiền thành công: '
									})
									.then(function (res) {
										next(null, {ec: Code.OK, msg: messageAlert + ' Xin cảm ơn !', data: utils.JSONParse(msg.receipt, {})});
										pomelo
											.app
											.get('statusService')
											.pushByUids([uid], 'onNotify', {
												popup_type: consts.POPUP_TYPE.CENTER_SCREEN,
												message: messageAlert + ' Chúc bạn chơi game vui vẻ !',
												gold: res.gold,
												addGold: chip
											});
										mailDao.createMessage({
											uid: uid,
											title: 'Nạp tiền thành công qua IAP',
											content: messageAlert + ' Xin cảm ơn !',
											isNew: 1,
											isHot: 1
										}, utils.print);
									})
									.catch(done);
							});
						}
					], function (err) {
						if (err) {
							logger.error(err);
							next(null, {ec: Code.OK, msg: 'Nạp tiền không thành công. Vui lòng thử lại. Xin cảm ơn !'});
						}
					});
				} else {
					next(null, {ec: Code.OK, msg: 'Nạp tiền không thành công. Vui lòng thử lại. Xin cảm ơn !'});
				}
			});
		} else {
      logger.error(err);
			next(null, {ec: Code.OK, msg: 'Nạp tiền không thành công. Vui lòng thử lại. Xin cảm ơn !'});
		}
	});
  logger.info(util.inspect('Handle message verifyInap with uid : %s and msg : %s', session.uid, JSON.stringify(msg)));
};
