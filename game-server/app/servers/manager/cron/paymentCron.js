/**
 * Created by bi on 6/10/15.
 */


var utils = require('../../../util/utils');
var async = require('async');
var logger = require('pomelo-logger').getLogger(__filename);

module.exports = function(app) {
	return new Cron(app);
};
var Cron = function(app) {
	this.app = app;
};
var cron = Cron.prototype;

