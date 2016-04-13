/**
 * Created by vietanha34 on 1/9/15.
 */


var channelUtil = require('../../util/channelUtil');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var utils = require('../../util/utils');
var async = require('async');
var lodash = require('lodash');
var MatchMaking = require('./matchMaking');
var messageService = require('../../services/messageService');
var dictionary = require('../../../config/dictionary');
var Code = require('../../consts/code');
var NotifyDao = require('../../dao/notifyDao');
var consts = require('../../consts/consts');
var TourDao = require('../../dao/tourDao');
var HomeDao = require('../../dao/homeDao');

/**
 * Tournament , đấu trường người chơi
 *
 * @param opts
 * @constructor
 */
var Tour = function (opts) {
  this.numPlayer = 0;
  this.gameId = opts.gameId;
  this.name = opts.name;
  this.matchTurn = opts.matchTurn || 1;
  this.tourId = opts.tourId;
  this.dayType = opts.dayType;
  this.bet = opts.bet;
  this.final = opts.final;
  this.minPlayer = opts.minPlayer || 2;
  this.maxPlayer = opts.maxPlayer || 4;
  this.timeout = opts.timeout || 20000;
  this.gameConfig = opts.game;
  this.players = {};
  this.forceQueue = async.queue(this.forceMatchMaking,1);
  this.interval = 5000;
  this.matchMakingInterval = setInterval(this.matchMaking.bind(this), this.interval);
  this.setWinnerInterval = setInterval(this.setWinner.bind(this), this.interval * 30);
  if ( this.final){
    this.increaseChipInterval = setInterval(this.increaseChipPlay.bind(this), 10 * 1000 * 60);
  }
};

pro = Tour.prototype;


pro.registerTour = function (userInfo) {
  if (!this.players[userInfo.uid]) {
    this.numPlayer++;
    this.players[userInfo.uid] = {
      userInfo : userInfo,
      timeout : setTimeout(function (userInfo) {
        // tim ban choi ngay
        var self = this;
        this.forceQueue.push({ context : this, uid : userInfo.uid}, function (err, force) {
          if (!force) {
            // push ve cho nguoi dung
            NotifyDao.push({
              popup_type : consts.POPUP_TYPE.TOAST,
              title : 'Đấu trường',
              message : 'Đấu trường không tìm thấy bàn phù hợp cho bạn',
              scope : 100,
              users : [userInfo.uid]
            });
            self.unRegisterTour(userInfo.uid);
          }
        });
      }.bind(this), this.timeout, userInfo)
    };
  }
};

pro.getPlayer = function (uid) {
  return this.players[uid];
};

pro.unRegisterTour = function (uid) {
  if (this.players[uid]) {
    this.numPlayer--;
    clearTimeout(this.players[uid].timeout);
    delete this.players[uid];
  }
};

pro.increaseChipPlay = function increaseChipPlay() {
  var self = this;
  TourDao.getTourById(this.tourId, function (err, tour) {
    if (tour){
      self.bet = tour.increaseChipByDay();
      tour.save();
    }
  })
};

pro.forceMatchMaking = function (task, callback) {
  var uid = task.uid;
  var self = task.context;
  if (self.numPlayer >= self.minPlayer) {
    var players = lodash.values(self.players);
    var index = lodash.findIndex(players, function (chr) {
      return chr.userInfo.uid === uid
    });
    if (index < 0) {
      callback(null, true);
      return
    }
    players.sort(function (a, b) {
      return a.point - b.point
    });
    if (players.length > self.maxPlayer) {
      var currentPlayers = players.splice(0, self.maxPlayer);
    }else {
      currentPlayers = players.splice(0, players.length);
    }
    var uids =[];
    for (var i = 0, len = currentPlayers.length; i < len; i++) {
      uids.push(currentPlayers[i].userInfo.uid);
      self.unRegisterTour(currentPlayers[i].userInfo.uid);
    }
    MatchMaking.createBoard({gameId: self.gameId, users: uids, tourId: self.tourId, bet : self.bet, name : self.name, matchTurn : self.matchTurn}, function (err, res) {
      if (err) {
        console.log(err);
      } else if (!res.ec) {
        pomelo.app.get('statusService').pushByUids(res.users, 'tournament.tourHandler.playTour', {tableId: res.boardId})
      }
    });
    utils.invokeCallback(callback, null, true)
  }
  else {
    utils.invokeCallback(callback, null, false )
  }
};

pro.matchMaking = function () {
  if (this.numPlayer >= this.maxPlayer) {
    var players = lodash.values(this.players);
    players.sort(function (a, b) {
      return a.point - b.point
    });
    while (players.length >= this.maxPlayer) {
      var currentPlayers = players.splice(0, this.maxPlayer);
      for (var i = 0, len = currentPlayers.length; i < len; i++) {
        var player = currentPlayers[i];
        this.unRegisterTour(player.userInfo.uid);
      }
      var uids = [];
      for (i = 0, len = currentPlayers.length; i < len; i++) {
        uids.push(currentPlayers[i].userInfo.uid);
      }
      MatchMaking.createBoard({gameId: this.gameId, users: uids, tourId: this.tourId, bet : this.bet, name : this.name, matchTurn : this.matchTurn}, function (err, res) {
        if (err) {
          console.log(err);
        } else if (!res.ec) {
          pomelo.app.get('statusService').pushByUids(res.users, 'tournament.tourHandler.playTour', {tableId: res.boardId})
        }
      });}
  }
};

pro.setWinner = function () {
  var TourProfile = pomelo.app.get('mongoClient').model('tourProfile');
  var self = this;
  TourProfile
    .findOne({tourId: this.tourId})
    .sort({point: -1})
    .exec(function (err, leader) {
      if (err) {
        logger.error("message : %s , stack : %s ",err.message, err.stack);
      } else if (leader) {
        // set leader
        var TourModel = pomelo.app.get('mongoClient').model('tours');
        TourModel.findById(self.tourId, function (err, tour) {
          if (err) {
            logger.error("message : %s , stack : %s ",err.message, err.stack);
          } else if (tour) {
            tour.leader = leader._id;
            tour.save(function (err) {
              if (err) {
                logger.error("message : %s , stack : %s ",err.message, err.stack);
              }
            });
            pomelo.app.rpc.home.homeRemote.pushInfo(null, null,{
              tournament: {
                label: tour.name,
                status : consts.TOURNAMENT_HOME_STATUS.RUNNING,
                avatar : leader.avatar,
                info : "Dẫn đầu - " + leader.fullname
              }
            }, function(e, r) {});
          }
          leader = null;
        })
      }
    })
};

pro.close = function () {
  clearInterval(this.matchMakingInterval);
  clearInterval(this.setWinnerInterval);
  clearInterval(this.increaseChipInterval);
  // TODO push ve cho nguoi choi la tour da ket thuc
};

module.exports = Tour;