var Code = require('../../../consts/code');
var utils = require('../../../util/utils');

module.exports = function (app) {
  return new ChatRemote(app, app.get('chatService'));
};

var ChatRemote = function (app, chatService) {
  this.app = app;
  this.chatService = chatService;
};

ChatRemote.prototype.addGlobal = function (uid, sid, ChannelName, cb) {
  return this.chatService.addGlobal(ChannelName, uid, sid, cb);
};

ChatRemote.prototype.leaveGlobal = function (uid, sid, ChannelName, cb) {
  return this.chatService.leaveGlobal(ChannelName, uid, sid, cb);
};

ChatRemote.prototype.pushMessage = function (channelName, route, msg, cb) {
  return this.chatService.pushMessage(channelName, route, msg, cb);
};

/**
 *  Add player into channel
 */
ChatRemote.prototype.add = function (uid, channelName, cb) {
  var code = this.chatService.add(uid, channelName);
  utils.invokeCallback(cb, null, code);
};

/**
 * leave Channel
 * uid
 * channelName
 */
ChatRemote.prototype.leave = function (uid, channelName, cb) {
  this.chatService.leave(uid, channelName);
  utils.invokeCallback(cb);
};

ChatRemote.prototype.destroy = function (channelName, cb) {
  this.chatService.destroy(channelName);
  utils.invokeCallback(cb);
};

/**
 * kick out user
 *
 */
ChatRemote.prototype.kick = function (uid, cb) {
  this.chatService.kick(uid);
  utils.invokeCallback(cb)
};
