/**
 * Created by vietanha34 on 3/9/15.
 */

var utils = require('../util/utils');
var pomelo = require('pomelo');
var lodash = require('lodash');
var Code = require('../consts/code');
var logger = require('pomelo-logger').getLogger(__filename);
var consts = require('../consts/consts');
var TourManager = require('../domain/tournament/tourManager');
var TourDao = require('../dao/tourDao');


module.exports = function (opts) {
  return new Module(opts);
};

module.exports.moduleId = 'tournament';

var Module = function (opts) {
  opts = opts || {};
  this.app = opts.app;
  this.type = opts.type || 'pull';
};

Module.prototype.monitorHandler = function (agent, msg, cb) {
  var tourManager = new TourManager();
  var curServer = this.app.curServer;
  var game = this.app.game;
  var func = msg.func;
  TourDao.getTour({
    where: {
      tourId: msg.tourId
    },
    attributes: ['roundId', 'tourId'],
    raw: true
  })
    .then(function (tour) {
      if (!tour || !tour['roundId']) return Promise.reject();
      return pomelo.app.get('mysqlClient')
        .TourRound
        .findOne({
          where: {
            id: tour['roundId']
          },
          attributes: ['id', 'tableConfigId'],
          raw : true
        })
    })
    .then(function (round) {
      console.log('round : ', round);
      if (!round || !round['tableConfigId']) return Promise.reject();
      return pomelo.app.get('mysqlClient')
        .TourTableConfig
        .findOne({
          where: {
            id: round['tableConfigId']
          },
          attributes: ['gameId'],
          raw : true
        })
    })
    .then(function (tc) {
      console.log('tc : ',tc);
      tc = tc || {};
      if (curServer.id === 'game-server-' + (tc.gameId || consts.GAME_ID.CO_TUONG)* 10) {
        switch (func) {
          case 'matchMaking':
            tourManager.matchMaking(msg.tourId);
            break;
          case 'calPoint':
            tourManager.calPoint(msg.tourId);
            break;
          case 'pickUser':
            tourManager.pickUser(msg.tourId, msg.prevRoundId, msg.nextRoundId, msg.numPlayer);
            break;
          case 'splitGroup':
            tourManager.splitGroup(msg.tourId, msg.numGroup);
            break;
          case 'showTable':
            tourManager.showTable(msg.tourId, msg.scheduleId);
            break;
          case 'refillTable':
            tourManager.reFillTable(msg.tourId, msg.boardId);
            break;
          case 'finishTour':
            tourManager.finishTour({
              tourId : msg.tourId,
              top: lodash.compact([msg.four, msg.third, msg.second, msg.first])
            });
            break;
          default:
            break;
        }
      }
      utils.invokeCallback(cb, null, {ec: Code.OK})
    })
    .catch(function (err) {
      console.error('err : ', err);
      utils.invokeCallback(cb, null, {ec: Code.OK})
    })
};

Module.prototype.masterHandler = function (agent, msg, cb) {
  agent.request('tournament-server-1', module.exports.moduleId, msg, cb);
};

Module.prototype.clientHandler = function (agent, msg, cb) {
  console.error('handler message : ', msg);
  agent.notifyByType('game', module.exports.moduleId, msg);
  utils.invokeCallback(cb, null, {ec: Code.OK})
};
