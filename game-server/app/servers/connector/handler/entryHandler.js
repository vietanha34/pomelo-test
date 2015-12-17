var async = require('async');
var lodash = require('lodash');
var userDao = require('../../../dao/userDao');
var logger = require('pomelo-logger').getLogger(__filename);
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var channelUtil = require('../../../util/channelUtil');
var utils = require('../../../util/utils');
var redisKeyUtil = require('../../../util/redisKeyUtil');
var pomelo = require('pomelo');
var Formula = require('../../../consts/formula');
var ItemDao = require('../../../dao/itemDao');

module.exports = function (app) {
	return new Handler(app);
};

var Handler = function (app) {
	this.app = app;
};

Handler.prototype.validClient = function (msg, session, next) {
	var self = this;
	var idSession = msg.idSession;
	var langVersion = msg.langVersion;
	var sessionId = session.id;
	if (idSession) {
		this.app.get('redisCache').get(redisKeyUtil.getIdSessionKey(idSession), function (err, key) {
			if (err) {
				next(null, {ec: Code.FAIL});
			}
			else if (key) {
				self.app.sessionService.get(sessionId).changeEncryptKey(key);
				var language;
				if (lodash.isString(langVersion) && langVersion !== self.app.get('gameService').langVersion) {
					language = self.app.get('gameService').language
				}
				next(null, {
					language: language
				});
			}
			else {
				next(null, {ec: Code.FAIL});
			}
		})
	} else {
		next(null, {ec: Code.FAIL});
	}
};

/**
 * Login user.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 */
Handler.prototype.login = function (msg, session, next) {
	var self = this;
	var player, boardId;
  var type = msg.type;
	var loginIp = utils.getIpv4FromIpv6(self.app.get('sessionService').getClientAddressBySessionId(session.id).ip);
  msg.versionCode = msg.versionCode ? msg.versionCode.toString() : '';
  var version = '' + msg.versionCode.slice(4,10) + msg.versionCode.slice(2,4) + msg.versionCode.slice(0,2);
	msg.ip = loginIp;
	var maintenance = this.app.get('maintenance');
	async.waterfall([
		function (done) {
			self.app.rpc.auth.authRemote.login(session, msg, done);
		},
		function (user, done) {
      if (!!maintenance && maintenance.type === consts.MAINTENANCE_TYPE.ALL && user.username !== 'laanhdo') {
        next(null, {
          ec: Code.GATE.FA_MAINTENANCE,
          msg: Code.GATE.FA_MAINTENANCE
        });
        return
      }
      player = user;
      kickUser(self.app, user.uid, done);
		},
		function (done) {
			session.bind(player.uid, {
				username: player.username,
				platform: msg.platform,
				dtId: msg.dtid
			}, done);
		},
    // check effect
    function (done) {
      ItemDao.checkEffect(player.uid, [consts.ITEM_EFFECT.LUAN_CO], done)
    },
		function (items, done) {
			session.set('fullname', player.fullname);
			session.set('username', player.username);
			session.set('level', Formula.calLevel(player.exp));
			session.set('gold', player.gold);
			session.set('sex', player.sex);
			session.set('accessToken', msg.accessToken);
			session.set('avatar', player.avatar);
      session.set('effect', items);
			session.set('platform', msg.platform);
      session.set('version', version);
			session.on('closed', onUserLeave.bind(null, self.app));
			session.pushAll(done)
		}
		, function (done) {
			// TODO : kiểm tra số lượng kệnh mà người dùng đang subscribe, để tiếp tục subscribe, ví dụ như bang hội, chat nhóm ....
			//self.app.rpc.chat.chatRemote.addGlobal(session, player.uid, session.frontendId,
			//	channelUtil.getGlobalChannelName(), done);
			done();
		},
		function (done) {
			self.app.get('statusService').getBoardIdsByUid(player.uid, function (err, list) {
				if (err) {
					done(err)
				}
				else {
					if (list && list[0]) {
						boardId = list[0];
					}
					done(null)
				}
			})
		}
	], function (err) {
		if (!!err) {
			console.error(err);
			return next(null, {ec: err.ec || Code.FAIL, msg: utils.getMessage(err.ec || Code.FAIL)});
		}
		var emitData = {
			uid: session.uid,
			ip: loginIp,
			lastLogin: player.lastLogin,
			deviceId: msg.deviceId,
			platform : msg.platform
		};

		if (boardId) {
			session.set('tableId', boardId);
			session.push('tableId');
			next(null, {
				tableId : boardId,
				accessToken: msg.accessToken,
				uid: player.uid,
				type: type
			});
			emitData.boardId = boardId;
		} else {
			// người dùng chưa chơi game, cho vào hàm waitingService
			next(null, {
				accessToken: msg.accessToken,
				uid: player.uid,
				type: type,
				tableId: ''
			});
			var waitingData = {
        username : session.get('username'),
        fullname : session.get('fullname'),
        userId : session.uid,
        gold : session.get('gold'),
        level: session.get('level'),
        avatar: session.get('avatar')
      };
      console.log('waitingData : ', waitingData);
			self.app.get('waitingService').add(waitingData);
		}
    emitData.resume = msg.resume;
    var emitterConfig = self.app.get('emitterConfig');
    self.app.rpc.event.eventRemote.emit(null, emitterConfig.LOGIN, emitData, function () {});
		player = null;
		msg = null;
	})
};


Handler.prototype.ping = function (msg, session, next) {
	delete msg.__route__;
	next(null, msg);
};

/**
 * Event xử lý sự kiện người dùng ngắt kết nối
 *
 * @param app
 * @param session
 * @param reason
 */
var onUserLeave = function onUserLeave(app, session, reason) {
	if (!session || !session.uid) {
		// user chưa đăng nhập, bỏ qua không xử lý
	} else {
		// TODO, kiểm tra các kênh người dùng không sử dụng để unsubscribe, ví dụ như bang hội, chat nhóm
		//app.rpc.chat.chatRemote.leaveGlobal(session, session.uid, session.frontendId,
		//	channelUtil.getGlobalChannelName(), function () {
		//	});
		app.get('waitingService').leave(session.uid);
		var emitData = {
			uid: session.uid,
			lastLogin: session.get('lastLogin'),
			boardId: session.get('tableId')
		};
    var emitterConfig = pomelo.app.get('emitterConfig');
    pomelo.app.rpc.event.eventRemote.emit(null, emitterConfig.LOGOUT, emitData, function () {});
		//app.get('authService').playGame({
		//	accessToken: session.get('accessToken'),
		//	ip: session.get('ip'),
		//	lastPlayedTime: Date.now() - session.get('lastLogin'),
		//	balance : session.get('gold')
		//})
	}
};


var kickUser = function kickUser(app, uid, cb) {
	var statusService = app.get('statusService');
	var curServer = app.curServer;
	statusService.getSidsByUid(uid, function (err, sids) {
		if (sids !== undefined && sids.length >= 1 && sids[0] !== curServer.id) {
			app.rpc.connector.connectorRemote.kick({frontendId: sids[0]}, uid, cb);
		} else {
			app.get('sessionService').kick(uid, Code.CONFLICT, cb);
		}
	});
};
