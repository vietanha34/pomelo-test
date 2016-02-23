/**
 * Created by vietanha34 on 1/14/16.
 */

var async = require('async');
var utils = require('../../../util/utils');
var code = require('../../../consts/code');
var pomelo = require('pomelo');
var Promise = require('bluebird');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.createGuild = function (msg, session, next) {

};

Handler.prototype.getGuild = function (msg, session, next) {
};

Handler.prototype.updateGuild = function (msg, session, next) {
};


/**
 *  Kiểm tra permission
 *
 * @param uid
 * @param guildId
 * @param resource
 * @param action
 */
var checkPermission = function (uid, guildId, resource, action) {

};

/**
 * Kiểm tra role hiện tại của người dùng trong guild
 *
 * @param uid
 * @param guildId
 */
var getRole = function (uid, guildId) {
};

/**
 * Lấy về permission của role hiện tại
 *
 * @param role
 * @param resource
 */
var getPermission = function (role, resource) {
};
