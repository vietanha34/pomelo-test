/**
 * Created by vietanha34 on 6/26/15.
 */

var utils = require('../../../util/utils');
var consts = require('../../../consts/consts');
var Code = require('../../../consts/code');
var moment = require('moment');
var MailDao = require('../../../dao/mailDao');
var AlertDao = require('../../../dao/alertDao');
var async = require('async');

module.exports = function (app) {
	return new Handler(app);
};

var Handler = function (app) {
	this.app = app;
};


/**
 * Lấy thông tin về hộp thư của người dùng
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getInbox = function (msg, session, next) {
	var uid = session.uid || 0;
	var type = msg.type || 0;
	if (!uid || !type) {
		return next(null);
	}
	if (type == 1) {
		AlertDao.getAllAlerts(function (err, alerts) {
			if (alerts) {
				return next(null, {ec: Code.OK, type: type, data: alerts, unRead: 0});
			}
			next(null, {ec: Code.FAIL});
		});
	} else {
		async.parallel({
			unRead: function (done) {
				MailDao.getNumUnReadInbox(uid)
					.then(function (count) {
						done(null, count);
					})
					.catch(function (err) {
						done(null, 0);
					});
			},
			data: function (done) {
				MailDao.getMessageByUid(uid, done);
			}
		}, function (err, result) {
			if (result && result.data) {
				return next(null, utils.merge_options({ec: Code.OK, type: type}, result));
			}
			next(null, {ec: Code.FAIL});
		});
	}
};


/**
 * Đọc tin ở inbox
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.readMessage = function (msg, session, next) {
	var id = parseInt(msg.id || 0);
	var type = msg.type || 0;

	if (!id || isNaN(id) || !type) {
		return next(null);
	}
	if (type == 1) {
		AlertDao.getAlertDetail(id, function (err, alert) {
			if (alert) {
				return next(null, {ec: Code.OK, type: type, data: alert});
			}
			next(null, {ec: Code.FAIL});
		});
	} else {
		MailDao.getMessageById(id, function (err, message) {
			if (message) {
				return next(null, {ec: Code.OK, type: type, data: message});
			}
			next(null, {ec: Code.FAIL});
		});
	}
};

/**
 * Xoá tin ở inbox
 *
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.deleteMessage = function (msg, session, next) {
	var id = parseInt(msg.id || 0);
	var uid = session.uid || 0;

	if (!id || isNaN(id)) {
		return next(null);
	}
	MailDao.delete({uid: uid, id: id}, function (err, affectedRows) {
		if (affectedRows) {
			return next(null, {id: id});
		}
		next(null, {ec: Code.FAIL});
	});
};
