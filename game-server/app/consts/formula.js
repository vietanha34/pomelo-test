var formula = module.exports;
var lodash = require('lodash');
var consts = require('./consts');

formula.eloArray = [1230,1900,2900];
formula.calEloLevel = function calEloLevel(elo) {
  for (var i=0; i<formula.eloArray.length; i++) {
    if (elo < formula.eloArray[i]) return i;
  }
  return i;
};

formula.vipArray = [1000, 5000, 10000];
formula.calVipLevel = function calVipLevel(vipPoint) {
  for (var i=0; i<formula.vipArray.length; i++) {
    if (vipPoint < formula.vipArray[i]) return i;
  }
  return i;
};

formula.calVipPoint = function calVipPoint(level) {
  return formula.vipArray[level-1];
};

formula.expArray = [10,35,80,150,250,385,560,780,1050,1375,2055,2775,3545,4375,5275,6255,7325,8495,9775,11175,14055,17035,20135,23375,26775,30355,34135,38135,42375,46875,51655,56735,62135,67875,73975,84825,95885,107190,118775,130675,142925,155560,168615,182125,196125,210650,225735,241415,257725,274700,301705,329095,356925,385250,414125,443605,473745,504600,536225,568675,602005,636270,671525,707825,745225,783780,823545,864575,906925,950650];
formula.calExp = function calExp(level) {
  var exp = formula.expArray[level-1];
  if (exp) return exp;
  else return (950650+level*50000);
};

formula.calLevel = function calLevel(exp) {
  for (var i=0; i<formula.expArray.length; i++) {
    if (exp < formula.expArray[i]) return i;
  }
  return i+Math.floor((exp-950650)/50000);
};

formula.calElo = function calElo(type, user1Elo, user2Elo) {
  var Aa = type == consts.WIN_TYPE.WIN ? 1 : (type == consts.WIN_TYPE.DRAW ? 0.5 : 0);
  var Ab = type == consts.WIN_TYPE.WIN ? 0 : (type == consts.WIN_TYPE.DRAW ? 0.5 : 1);
  var Qa = Math.pow(10, user1Elo/400);
  var Qb = Math.pow(10, user2Elo/400);
  var sumQ = (Qa+Qb);
  var Ea = Qa / sumQ;
  var Eb = Qb / sumQ;
  var Ka = formula.calK(user1Elo);
  var Kb = formula.calK(user2Elo);

  user1Elo += Ka*(Aa-Ea);
  user2Elo += Kb*(Ab-Eb);

  return [Math.max(user1Elo, consts.MIN_ELO), Math.max(user2Elo, consts.MIN_ELO)];
};

formula.calK = function calK(elo) {
  if (elo < 1600) return 25;
  else if (elo < 2000) return 20;
  else if (elo < 2400) return 15;
  else return 10;
};