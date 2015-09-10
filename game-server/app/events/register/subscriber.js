/**
 * Created by bi on 7/7/15.
 */

var Config = require('../config');
var pomelo = require('pomelo');
var redisKeyUtil = require('../../util/redisKeyUtil');
var consts = require('../../consts/consts');

module.exports.type = Config.TYPE.REGISTER;

/**
 * Event Gửi về khi có người chơi đăng kí vào trò chơi
 * Dữ liệu param truyền vào có dạng Object gồm các thông tin sau
 *
 * * uid : đinh danh người chơi
 * * username : tên của người dùng
 * * platform : định danh của platform xem thêm tại ....
 * * deviceId : Định danh của thiết bị
 * * deviceToken : device token để push notification
 * * version : version của thiết bị
 * * ip : Địa chỉ ip khi đăng ký
 * * extraData : Thông tin thêm của người dùng đăng nhập từ bên thứ 3 như facebook, google
 * * deviceName : tên của thiết bị
 * * type : account type (xem thêm tại consts.ACCOUNT_TYPE)
 *
 * @event
 * @param app
 * @param type
 * @param param
 */
module.exports.process = function (app, type, param) {
	var opts = {
		appId: 1,
		register: 1,
		deviceId: param.deviceId,
		deviceToken: param.deviceToken,
		username: param.username,
		dtId: 1,
		platform: consts.PLATFORM_UNMAP[param.platform] || ''
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