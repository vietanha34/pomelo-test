/**
 * Created by vietanha34 on 6/4/14.
 */

var async = require('async');
var Code = require('../consts/code');
var consts = require('../consts/consts');
var utils = require('../util/utils');
var Event = require('../consts/consts').Event;
var Game = require('../dao/model/game');
var logger = require('pomelo-logger').getLogger('service', __filename);
var sh = require("shorthash");
var lodash = require('lodash');
var GameConfig = require('../dao/model/gameConfig');
var pomelo = require('pomelo');
var Promise = require('promisse');

/**
 * Định kì lấy về danh sách các trò chơi, khu vực từ CSDL, sau đó gửi dữ liệu về cho client
 *
 * @module Service
 * @class GameService
 * @param opts
 * @param app
 * @constructor
 */

var GameService = function (app, opts) {
  this.app = app;
  this.mysql = this.app.get('mysqlClient');
  this.game = [];
  this.gameConfig = {};
  this.gameObject = [];
  this.language = {};
  this.langVersion = '';
  this.version = 1;
  if (opts && opts.interval) {
    this.inter = opts.interval
  }
  else {
    this.inter = 30000;
  }
};

module.exports = GameService;

GameService.prototype.init = function () {
  var self = this;
  self.getData();
  this.interval = setInterval(function () {
    self.getData()
  }, this.inter);
};

GameService.prototype.getData = function (cb) {
  var self = this;
  return Promise.all([
    self.setGameConfig(),
    self.setLanguage(),
    self.setHall()
  ])
    .then(function (res) {
      return utils.invokeCallback(cb, null, res)
    })
};


GameService.prototype.setHall = function (cb) {
  var self = this;
  return this.mysql
    .Game
    .findAll({raw: true})
    .map(function (g) {
      var game = new Game(g);
      return Promise.resolve(game);
    })
    .call('sort', function (a, b) {
      return a.rank - b.rank;
    })
    .then(function (gs) {
      self.game.splice(0, self.game.length);
      self.game = gs;
      self.setVersion();
      return utils.invokeCallback(cb);
    })
};

GameService.prototype.setLanguage = function (cb) {
  var self = this;
  return this.mysql
    .Language
    .findAll({raw: true})
    .then(function (values) {
      var object = {};
      object['vi'] = {};
      for (var i = 0, len = values.length; i < len; i++) {
        var value = values[i];
        var id = value.id;
        object['vi'][id] = value['vi'];
      }
      self.language = null;
      self.language = object;
      var str = JSON.stringify(self.language);
      self.langVersion = sh.unique(str);
      self.language.version = self.langVersion;
      return utils.invokeCallback(cb);
    })
};


GameService.prototype.setGameConfig = function (cb) {
  var self = this;
  return this.mysql
    .GameConfig
    .findAll({})
    .map(function (g) {
      var game = new GameConfig(g);
      var key = '' + gameConfig.gameId + '-' + gameConfig.roomId;
      self.gameConfig[key] = game;
      return Promise.resolve(game);
    })
    .then(function (gs) {
      return utils.invokeCallback(cb);
    })
};

GameService.prototype.getVersion = function () {
  return this.version;
};

GameService.prototype.setVersion = function () {
  var self = this;
  self.gameObject.splice(0, self.gameObject.length);
  for (var i = 0, len = this.game.length; i < len; i++) {
    var game = this.game[i];
    var gameObject = utils.clone(game);
    gameObject.room = [];
    for (var j = 0, lenj = 4; j < lenj; j++) {
      if (this.gameConfig['' + game.gameId + '-' + j]) {
        gameObject.room.push(this.gameConfig['' + game.gameId + '-' + j].getConfigBet())
      }
    }
    this.gameObject.push(gameObject);
  }
  var str = JSON.stringify(self.gameObject);
  self.version = sh.unique(str);
};

/**
 * clear Interval
 *
 * @method clearInter
 */
GameService.prototype.clearInter = function () {
  clearInterval(this.interval)
};

GameService.prototype.close = function (cb) {
  this.clearInter();
  utils.invokeCallback(cb);
};
