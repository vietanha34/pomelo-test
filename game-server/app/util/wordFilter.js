//var sexDict = require('./abuse.js');

var nlimit = 10;  // do dai cum tu
var replacingChar = '*';  // ki tu dung de thay the cum tu bay ba
var separatorsL = [',', '.', ':', ';', '!', '?', ')', '\"', '”',
  ']', '"', '“', '(', '[', '\n', '\t', ' ', '…'];
var separators = {};
for (var i = 0; i < separatorsL.length; i++) separators[separatorsL[i]] = 1;


module.exports = function (msg, sexDict) {
  var tokens = [];
  var tokensIndex = [];
  var buffer = [];
  var bi = 0;
  for (var i = 0; i < msg.length; i++) {
    if ((msg[i] in separators) || (i === msg.length - 1)) {
      if (i === msg.length - 1) {
        if (msg[i] in separators) {
        }
        else {
          buffer.push(msg[i]);
          i += 1;
        }
      }
      tokens.push(buffer.join(''));
      tokensIndex.push([bi, i - 1]);
      bi = i + 1;
      buffer = [];
    }
    else {
      buffer.push(msg[i]);
    }
  }


  var syls = [];
  var sylsIndex = [];
  for (var i = 0; i < tokens.length; i++)
    if (tokens[i] !== '') {
      syls.push(tokens[i]);
      sylsIndex.push(tokensIndex[i]);
    }

  var sexcharIndexs = {};

  var grams = {};
  for (var i = 1; i <= nlimit; i++) {
    grams[i] = [];
    var ngramBuffer, ngram, bi, ei;
    for (var j = 0; j < syls.length - i + 1; j++) {
      ngramBuffer = [];
      for (var k = 0; k < i; k++) ngramBuffer.push(syls[j + k]);
      ngram = ngramBuffer.join(' ');
      bi = sylsIndex[j][0];
      ei = sylsIndex[j + i - 1][1];
      grams[i].push([ngram, [bi, ei]])
    }
  }
  //print (grams)


  for (var i = 1; i <= nlimit; i++) {
    for (var j = 0; j < grams[i].length; j++) {
      if (grams[i][j][0].toLowerCase() in sexDict) {
        for (var k = grams[i][j][1][0]; k <= grams[i][j][1][1]; k++)
          sexcharIndexs[k] = 1;
      }
    }
  }


  var kq = [];
  for (var i = 0; i < msg.length; i++) {
    if (i in sexcharIndexs) kq.push(replacingChar);
    else kq.push(msg[i]);
  }
  return {msg: kq.join(''), isChange: Object.keys(sexcharIndexs).length};
};

