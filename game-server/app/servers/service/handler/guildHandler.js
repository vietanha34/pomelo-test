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

Handler.prototype.getGuildR = function (msg, session, next) {
};

var checkPermission = function (uid, guildId, permission) {
  
};