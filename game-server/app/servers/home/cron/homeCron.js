/**
 * Created by KienDT on 3/9/15.
 */

var consts = require('../../../consts/consts');
var moment = require('moment');
var utils = require('../../../util/utils');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger(__filename);

module.exports = function(app) {
  return new Cron(app);
};
var Cron = function(app) {
  this.app = app;
};
var cron = Cron.prototype;

cron.sumTotal = function (cronInfo) {
  var mysqlClient = this.app.get('mysqlClient');
  mysqlClient
    .AccUser
    .find({
      attributes : [
        [mysqlClient.sequelize.fn('SUM', mysqlClient.sequelize.col('gold')),'amount']
      ],
      raw : true
    })
    .then(function (result) {
      if(result){
        pomelo.app.get('mysqlClient')
          .Statistic
          .create({
            date : new Date(),
            totalChip : result.amount
          })
      }
    })
    .catch(function (err) {
      logger.error('err : ', err);
    })
};