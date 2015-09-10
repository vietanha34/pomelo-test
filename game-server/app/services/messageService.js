var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('poker', __filename);
var exp = module.exports;
var consts = require('../consts/consts');
var utils = require('../util/utils');
var lodash = require('lodash');
var Promise = require('bluebird');
var eventDao = Promise.promisifyAll(require('../dao/eventDao'));
var mailDao = require('../dao/mailDao');

exp.pushMessageByUids = function (uids, route, msg) {
  logger.info('\n----PushMessage  to uid: %j ' +
  '\n ---- route : %s' +
  '\n ---- msg: %j', uids, route, msg);
  if (uids.length == 0) {
    return
  }
  pomelo.app.get('channelService').pushMessageByUids(route, msg, uids, errHandler);
};

exp.pushMessageToPlayer = function (uid, route, msg) {
  if (uid.sid) {
    exp.pushMessageByUids([uid], route, msg);
  }
};

/**
 * Gửi thông tin vào inbox của người chơi
 *
 * * opts
 *  * uids - Array
 *  * title - string
 *  * content - string
 *  * bonus - int số tiền bonus cho KH
 *  * btnLabel - string default "Nhận ngay"
 *  * contentType - int theo quy định chung
 *
 * @param opts
 * @param cb
 */
exp.pushMessageToInbox = function (opts, cb) {
	if (opts.hasOwnProperty('mail')) {
		return sendMail(opts, cb);
	}
  console.log('push message to inbox : ', opts);
  var mysqlClient = pomelo.app.get('mysqlClient');
  var uids = opts.uids;
	var data = [];
	var message = {
		title : opts.title,
		content : opts.content,
		contentType : opts.contentType || consts.MESSAGE_CONTENT_TYPE.TEXT,
		btnLabel : opts.btnLabel,
		bonus : opts.bonus,
		params : typeof opts.params === 'string' ? opts.params : typeof opts.params === 'object' ? JSON.stringify(opts.params) : null,
		eventId : opts.eventId,
    action : opts.action,
		eventType : opts.eventType
	};
	for (var i = 0, len = uids.length; i< len; i ++){
		var uid = uids[i];
		data.push(utils.merge_options(message, { uid : uid}))
	}
	return mysqlClient
		.Focus
		.bulkCreate(data)
		.then(function () {
			return Promise.map(uids, function (uid) {
				return eventDao.getAllEventsAsync(uid)
			})
		})
		.each(function (home, index) {
			pomelo.app.get('statusService')
				.pushByUids([uids[index]], 'service.eventHandler.getEvents', { ec: 0, data: home });
		})
		.catch(function (err) {
			logger.error('err : ', err)
		})
		.finally(function () {
			utils.invokeCallback(cb)
		});
};

/**
 * Send to inbox
 *
 * @param opts
 * @param cb
 */
var sendMail = function (opts, cb) {
	opts.uids.forEach(function (uid) {
		mailDao.createMessage({
			uid: uid,
			title: opts.title,
			content: opts.content,
			isNew: opts.isNew || 0,
			isHot: opts.isHot || 0
		}, utils.print);
	});
	utils.invokeCallback(cb);
};

function errHandler(err, fails) {
  if (!!err) {
    logger.error('Push Message error! %j', err.stack);
  }
}