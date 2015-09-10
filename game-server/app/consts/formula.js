var formula = module.exports;
var lodash = require('lodash');
var consts = require('./consts');

/**
 * Tinh level user
 *
 */
formula.calLevel = function (opts) {
  var level = 0;
  var block = 100;
  var current = 0;
  while ((++level * block + current) <= opts.score) {
    current += level * block;
  }
  block = null;
  current = null;
  return level > 2 ? level - 2 : 0;
};

formula.calRemainXpUpgradeLevel = function (level, currentScore) {
  var remain = (level + 2) * 100;
  var score = 0;
  var i = level + 1;
  while(i > 0) {
    score += i * 100;
    i--;
  }
  if (currentScore <= score)
    return 0;
  return Math.ceil(((currentScore - score) / remain) * 100);
};

formula.calActive = function (mixed) {
  var score;
  if (typeof mixed == 'object') {
    score = mixed.score;
  } else {
    score = mixed;
  }
  var aapd = consts.AAPD.SCORE;
  var keys = Object.keys(aapd);
  for (var i = keys.length - 1; i >= 0; i--) {
    var key = parseInt(keys[i]);
    if (score >= key)
      return aapd[key];
  }
  return 0;
};

formula.calBattle = function (doc) {
  if (doc.score < 10) return '0/5';
  if (doc.score <= 100) return '1/5';
  if (doc.score <= 1000) return '2/5';
  if (doc.score <= 10000) return '3/5';
  if (doc.score <= 100000) return '4/5';
  return '5/5';
};

formula.calDedicate = function (exp) {
  return parseInt(Math.random() * 5) + '/5';
};

formula.calWinXp = function (numWin, numLose) {
  if (!lodash.isNumber(numLose) || numLose == 0) {
    return 2;
  }
  else {
    return numLose * 2;
  }
};
