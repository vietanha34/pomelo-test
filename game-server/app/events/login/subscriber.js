/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var consts = require('../../consts/consts');

module.exports.type = Config.TYPE.LOGIN;

/**
 * Event Gửi về khi có người chơi login vào trò chơi
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 *
 * * uid : đinh danh người chơi
 * * username : tài khoản người chơi
 * * platform : platform
 * * deviceId : định danh device
 * * deviceToken : token để push offline
 *
 * @event
 * @param app
 * @param type
 * @param param
 */
module.exports.process = function (app, type, param) {
	var opts = {
		appId: 1,
		register: 0,
		deviceId: param.deviceId,
		deviceToken: param.deviceToken,
		username: param.username,
		platform: consts.PLATFORM_UNMAP[param.platform] || '',
		dtId: 1
	};
	pomelo
		.app
		.get('redisCache')
		.publish(redisKeyUtil.getSubscriberChannel(), JSON.stringify(opts), function (err, res) {
			if (err) {
				console.error('register event error: ', err, res);
			}
			opts = null;
		});
};
