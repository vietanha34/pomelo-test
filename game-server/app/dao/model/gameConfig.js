/**
 * Created by vietanha34 on 12/1/14.
 */


module.exports = function (opts) {
  return new ConfigGame(opts);
};

var ConfigGame = function (opts, bet) {
  this.gameId = opts.gameId;
  this.roomId = opts.roomId;
  this.numSlot = opts.numSlot;
  this.maxPlayer = opts.maxPlayer;
  this.minPlayer = opts.minPlayer;
  this.autoStart = opts.autoStart;
  this.turnTime = opts.turnTime;
  this.configMoney = [opts.bet, opts.minBet, opts.maxBet];
  this.configPlayer = this.numSlot == 9 ? [5, 9] : this.numSlot == 4 ? [2,3,4] : [5];
  this.bet = bet || opts.minBet;
  this.minBuyIn = opts.minBuyIn ? opts.minBuyIn * this.bet : 0;
  this.maxBuyIn = opts.maxBuyIn ? opts.maxBuyIn * this.bet : null;
};

ConfigGame.prototype.getConfigBet = function () {
  return {
    roomId : this.roomId,
    configBet : this.configMoney,
    configPlayer  : this.configPlayer
  }
};