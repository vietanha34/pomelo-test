/**
 * Created by bi on 09/01/2015.
 */


var async = require('async');
var utils = require('../../../util/utils');
var code = require('../../../consts/code');
var consts = require('../../../consts/consts');
var Promise = require('bluebird');
var UserDao = require('../../../dao/userDao');
var Formula = require('../../../consts/formula');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

Handler.prototype.getGameLog = function (msg, session, next) {
  var matchId = msg.matchId;
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(matchId)) {
    return next(null, {ec: code.FAIL, msg: 'Định danh của ván chơi không chính xác'})
  }
  var logs, gameId;
  var mongoClient = this.app.get('mongoClient');
  mongoClient.model('GameLog')
    .findOne({
      matchId: matchId
    })
    .lean()
    .then(function (match) {
      if (!match) return Promise.reject();
      match.logs  = utils.JSONParse(match.logs, []);
      logs = match;
      gameId = match.info['gameId'];
      var eloKey = consts.ELO_MAP[gameId] ? consts.ELO_MAP[gameId] : 'tuongElo';
      return Promise.map(match.players, function (uid) {
        return UserDao.getUserAchievementProperties(uid, ['uid', 'avatar', 'fullname', 'exp', 'gold'], [[eloKey, 'elo']])
      })
    })
    .then(function (players) {
      for (var i = 0, len = players.length; i< len; i++){
        players[i]['avatar'] = utils.JSONParse(players[i]['avatar'], {});
        players[i]['level'] = Formula.calLevel(players[i]['exp']);
        players[i]['elo'] = players[i]['Achievement.elo'];
        players[i]['title'] = Formula.calEloLevel(players[i]['Achievement.elo']);
        players[i]['color'] = i ? consts.COLOR.BLACK : consts.COLOR.WHITE;
        delete players[i]['exp'];
        delete players[i]['Achievement.elo'];
      }
      logs.players = players;
      return next(null, logs);
    })
    .catch(function (err) {
      if (err){
        console.error(err);
      }
      return next(null, { ec: code.FAIL, msg: 'Không thể lấy được ván chơi này'})
    })
    .finally(function () {

    })
};

Handler.prototype.mark = function (msg, session, next) {

};