/**
 * Created by KienDT on 3/9/15.
 */

var consts = require('../../../consts/consts');
var moment = require('moment');
var utils = require('../../../util/utils');
var pomelo = require('pomelo');
var DailyDao = require('../../../dao/dailyDao');

module.exports = function(app) {
  return new Cron(app);
};
var Cron = function(app) {
  this.app = app;
};
var cron = Cron.prototype;

cron.loadDailyConfig = function (cronInfo) {
  DailyDao.loadConfig();
};