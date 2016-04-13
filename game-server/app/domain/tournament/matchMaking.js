/**
 * Created by vietanha34 on 1/9/15.
 */

var utils = require('../../util/utils');
var MatchMaking = module.exports;
var pomelo  = require('pomelo');
var consts = require('../../consts/consts');

/**
 * Tạo bàn chơi cho N người vào chơi
 *
 * @param opts
 * @param cb
 */
MatchMaking.createBoard = function (opts, cb) {
  var data = {
    users : opts.users,
    gameType : consts.GAME_TYPE.TOURNAMENT,
    tourId : opts.tourId,
    bet : opts.bet,
    title : opts.name,
    maxPlayer : opts.users.length,
    matchTurn : opts.matchTurn
  };
  console.log("data : ", data);
  pomelo.app.rpc.game.gameRemote.createBoard(null, opts.gameId, data, function (err, res) {
    if (err) {
      utils.invokeCallback(cb, err);
    }
    else {
      // TODO memory leak
      utils.invokeCallback(cb, null, utils.merge_options(res, { users : opts.users}));
    }
  })
};

