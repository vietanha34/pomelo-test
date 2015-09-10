/**
 * Created by bi on 7/24/15.
 */

var lodash = require('lodash');
var consts = require('../../../consts/consts');
var Code = require('../../../consts/code');
var EventDao = require('../../../dao/eventDao');
var ejs = require('ejs');
var moment = require('moment');
var numeral = require('numeral');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

Handler.prototype.getEvents = function (msg, session, next) {
	var uid = session.uid || 0;
	EventDao.getAllEvents(uid, function(err, res) {
		if (err)
			next(null, {ec: Code.FAIL});
		else
			next(null, {ec: Code.OK, data: res});
	});
};

Handler.prototype.getEventExtra = function (msg, session, next) {
	var id = parseInt(msg.id || 0);
	var uid = session.uid || 0;
	var type = parseInt(msg.contentType || 0);
	var parent = msg.parent || 0;

	if (!id || isNaN(id) || !type || isNaN(type)) {
		next(null);
	} else {
		if (type == consts.MESSAGE_CONTENT_TYPE.LIST) {
			EventDao.getEventExtras(id, function (err, res) {
				if (lodash.isArray(res) && res.length) {
					next(null, {ec: Code.OK, data: res, contentType: consts.MESSAGE_CONTENT_TYPE.LIST});
				} else {
					next(null, {ec: Code.FAIL});
				}
			});
		} else {
			var self = this;
			var func = 'getExtraContent';
			if (parent == 1) {
				func = 'getExtraContentByEventId';
			}
			EventDao[func](id, function (err, res) {
				if (!! res) {
					if (res.action) {
						self.app.get('eventService')
							.action({eventId: res.eventId, uid: uid}, res.action, function (err, data) {
								if (!err) {
									console.log('data : ', data);
									var template = ejs.compile(res.content, {delimiter: '?'});
									next(null, {
										ec: Code.OK,
										contentType: res.contentType,
										data: {
											id: res.id,
											title: res.title,
											content: template({data: data, moment: moment, numeral: numeral}),
											time: moment(res.updatedAt).format('DD/MM/YYY HH:mm')
										}
									});
								} else {
									console.error('err ', err);
									next(null, {ec: Code.FAIL});
								}
							});
					} else {
						next(null, {
							ec: Code.OK,
							contentType: res.contentType,
							data: {
								id: res.id,
								title: res.title,
								content: res.content,
								time: moment(res.updatedAt).format('DD/MM/YYY HH:mm')
						}});
					}
				} else {
					next(null, {ec: Code.FAIL});
				}
			});
		}
	}
};

Handler.prototype.markFocus = function (msg, session, next) {
	var uid = session.uid || 0;
	var id = parseInt(msg.id || 0);
	if (!id || isNaN(id) || !uid) {
		next(null);
	} else {
		EventDao.markFocus({
			uid: uid,
			id: id
		}, function (err, res) {
			if (res) {
				next(null, {ec: Code.OK});
			} else {
				next(null, {ec: Code.FAIL});
			}
		});
	}
};
