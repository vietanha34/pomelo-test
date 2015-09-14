/**
 * Created by vietanha34 on 6/16/14.
 */

var utils = require('../../../util/utils');
var logger = require('pomelo-logger').getLogger('game', __filename, process.pid);
var pomelo = require('pomelo');
var userDao = require('../../../dao/userDao');
var async = require('async');
var Code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var expUtils = require('../../../util/expUtil');
var lodash = require('lodash');
var exp = module.exports;

exp.addEventFromBoard = function (board) {
};

