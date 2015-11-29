/**
 * Created by vietanha34 on 5/12/15.
 */
/**
 * Created by vietanha34 on 6/4/14.
 */

var async = require('async');
var Code = require('../consts/code');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var pomelo = require('pomelo');

/**
 * Định kì lấy về danh sách các trò chơi, khu vực từ CSDL, sau đó gửi dữ liệu về cho client
 *
 * @module Service
 * @class GameService
 * @param opts
 * @param app
 * @constructor
 */

var ConfigService = function (app, opts) {
  this.app = app;
  this.mysql = this.app.get('mysqlClient');
  this.config = {};
  if (opts && opts.interval) {
    this.inter = opts.interval
  }
  else {
    this.inter = 180000;
  }
};

module.exports = ConfigService;

ConfigService.prototype.init = function () {
  var self = this;
  self.setConfig();
  this.interval = setInterval(function () {
    self.setConfig()
  }, this.inter);
};


ConfigService.prototype.setConfig = function () {
  var sql = 'select * from GlobalConfig';
  var self = this;
  this.mysql.sequelize
    .query(sql, { type: this.mysql.sequelize.QueryTypes.SELECT, raw: true})
    .then(function setConfigQueryCallback(values) {
      var object = {};
      for (var i = 0, len = values.length; i < len; i++) {
        var value = values[i];
        switch (value.type) {
          case consts.CONFIG_TYPE.NUMBER :
            object[value.key] = isNaN(parseInt(value.value)) ? 0 : parseInt(value.value);
            break;
          case consts.CONFIG_TYPE.JSON_STRING:
            object[value.key] = utils.JSONParse(value.value, {});
            break;
          case consts.CONFIG_TYPE.STRING :
          default :
            object[value.key] = value.value
        }
      }
      self.config = null;
      self.config = object;
    });
};

ConfigService.prototype.getConfig = function () {
  return this.config;
};

/**
 * clear Interval
 *
 * @method clearInter
 */
ConfigService.prototype.clearInter = function () {
  clearInterval(this.interval);
};

ConfigService.prototype.close = function (cb) {
  this.clearInter();
  utils.invokeCallback(cb);
};