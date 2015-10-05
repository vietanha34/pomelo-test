var util = require('util');
var utils = module.exports;
var fs = require('fs');
var isPrintFlag = true;
var pomelo = require('pomelo');
var Code = require('../consts/code');
var lodash = require('lodash');
var consts = require('../consts/consts');
var moment = require('moment');
var redisKeyUtil = require('./redisKeyUtil');
var MD5 = require('MD5');

/**
 * Check and invoke callback function
 */
utils.invokeCallback = function (cb) {
  var args = Array.prototype.slice.call(arguments, 1);
  if (!!cb && typeof cb === 'function') {
    return cb.apply(null, args);
  }else {
    if (!!args[0]){
      return Promise.reject(args[0]);
    }else{
      return Promise.resolve(args[1]);
    }
  }
};

/*
 * Date format
 */
utils.format = function (date, format) {
  format = format || 'MM-dd-hhmm';
  var o = {
    "M+": date.getMonth() + 1, //month
    "d+": date.getDate(), //day
    "h+": date.getHours(), //hour
    "m+": date.getMinutes(), //minute
    "s+": date.getSeconds(), //second
    "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
    "S": date.getMilliseconds() //millisecond
  };

  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  for (var k in o) {
    if (new RegExp("(" + k + ")").test(format)) {
      format = format.replace(RegExp.$1,
        RegExp.$1.length === 1 ? o[k] :
          ("00" + o[k]).substr(("" + o[k]).length));
    }
  }
  return format;
};


/**
 * clone an object
 */
utils.clone = function (origin) {
  return JSON.parse(JSON.stringify(origin));
};

utils.sortNumber = function(a,b) {
  return a - b;
};

utils.sortNumberReserve = function (a, b) {
  return b -a
};

utils.size = function (obj) {
  if (!obj) {
    return 0;
  }

  var size = 0;
  for (var f in obj) {
    if (obj.hasOwnProperty(f)) {
      size++;
    }
  }

  return size;
};

// print the file name and the line number ~ begin
function getStack() {
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function (_, stack) {
    return stack;
  };
  var err = new Error();
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
}

function getFileName(stack) {
  return stack[1].getFileName();
}

function getLineNumber(stack) {
  return stack[1].getLineNumber();
}

utils.myPrint = function () {
  if (isPrintFlag) {
    var len = arguments.length;
    if (len <= 0) {
      return;
    }
    var stack = getStack();
    var aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
    for (var i = 0; i < len; ++i) {
      aimStr += arguments[i] + ' ';
    }
  }
};

utils.getValues = function (obj) {
  var values = [];
  for(var key in obj){
    values.push(obj[key]);
  }
  return values;
};

utils.isNumber = function (number) {
  return !isNaN(number);
};


/**
 * Lấy message cần thiết tùy theo ngôi ngữ
 *
 * @param messageId
 * @param language
 * @param data
 * @returns {*}
 */
utils.getMessage = function (messageId, data) {
  data = data ? data.map(function(d){return d.toString()}) : [];
  messageId = lodash.isNumber(messageId) ? messageId : Code.FAIL;
  if (lodash.isArray(data)) {
    data.unshift(messageId);
    return data;
  }else {
    return messageId
  }
};

utils.getError = function (msgId, data) {
  return { ec : msgId, msg : this.getMessage(msgId, data)}
};


utils.getMessages = function (messageId) {
  messageId = lodash.isNumber(messageId) || Code.FAIL;
  var languageData = pomelo.app.get('gameService').language['vi'] || {};
  if (languageData[messageId]) {
    var msg = languageData[messageId];
    return msg
  }
  else {
    return ""
  }
};

utils.int2Ip = function (ip) {
  if (!ip) {
    return ''
  }
  ip = parseInt(ip);
  return [(ip >> 24).toString(), ((ip >> 16) & 255 ).toString(), ((ip >> 8) & 255).toString(),
    (ip & 255).toString()].join('.');
};

utils.getServerIdFromServerIndex = function (serverIndex) {
  return 'game-server-' + serverIndex;
};

utils.interval = function (func, wait, times) {
  var interv = function (w, t) {
    return function () {
      if (typeof t === "undefined" || t-- > 0) {
        setTimeout(interv, w);
        try {
          func.call(null);
        }
        catch (e) {
          t = 0;
          throw e;
        }
      }
    };
  }(wait, times);

  setTimeout(interv, wait);
};

utils.getServerIndexFromServerId = function (serverId) {
  try {
    var tmp = serverId.split('-');
    if (tmp.length == 3) {
      return parseInt(tmp[2]);
    }
    else {
      return null;
    }
  }
  catch (err) {
    return null
  }
};


utils.merge_options = function(obj1,obj2){
  var obj3 = {};
  obj1 = obj1 || {};
  obj2 = obj2 || {};
  for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
  for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
  return obj3;
};


utils.arraysIdentical = function (a, b) {
  var i = a.length;
  if (i != b.length) return false;
  while (i--) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

utils.getMonday = function (d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
  var monday = new Date(d.setDate(diff));
  return '' + monday.getDate() + '-' + monday.getMonth() + '-' + monday.getFullYear();
};

/**
 * remove element from array
 *
 * @param {Array} array
 * @param {*} element
 */
utils.arrayRemove = function (array, element) {
  for (var i = 0, l = array.length; i < l; i++) {
    if (array[i] === element) {
      array.splice(i, 1);
      return;
    }
  }
};

utils.removeTab = function (str) {
  return str.replace(/(\r\n|\n|\r)/gm, "")
};


utils.containArray = function (parentArray, arr) {
  for (var i = 0, len = arr.length; i < len; i++) {
    var elem = arr[i];
    if (parentArray.indexOf(elem) < 0) {
      return false
    }
  }
  return true;
};

utils.getMenuLanguage = function (id) {
  return consts.LANGUAGE_LIMIT.MENU + Math.abs(id);
};

utils.randomChoiceArray = function (arr) {
  return arr.length == 0 ? -1 : arr[Math.floor(Math.random() * arr.length)];
};

utils.getUids = function (session) {
  return { uid : session.uid , sid : session.frontendId};
};

utils.checkSameDay = function (time1, time2) {
  return moment(time1).startOf('day').unix() === moment(time2).startOf('day').unix();
};

utils.getIpv4FromIpv6 = function (ip) {
  var split = ip.split(':');
  return split[split.length - 1];
};

utils.JSONParse = function(opts, defaults) {
  defaults = defaults || null;
  try {
    defaults = JSON.parse(opts)
  }catch (e){
    //console.error(e.stack || e);
  }
  return defaults
};

utils.execMultiCommands = function(redis, cmds, cb) {
  if(!cmds.length) {
    utils.invokeCallback(cb);
    return;
  }
  redis.multi(cmds).exec(function(err, replies) {
    utils.invokeCallback(cb, err, replies);
  });
};


utils.walk = function(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(utils.walk(file));
    else results.push(file)
  });
  return results
};

utils.decodeStringToCards = function (cards) {
  var result = [], i, len, card, cardString;
  for (i = 0, len = cards.length; i < len; i++) {
    card = cards[i];
    cardString = this.decodeStringToCard(card);
    result.push(cardString)
  }
  return result;
};

utils.decodeStringToCard = function (card) {
  card = card.toLowerCase();
  var value = 0;
  var suit = 0;
  switch (card[0]) {
    case 'a' :
      value = 1;
      break;
    case '2' :
    case '3' :
    case '4' :
    case '5' :
    case '6' :
    case '7' :
    case '8' :
    case '9' :
      value = parseInt(card[0]);
      break;
    case 't' :
      value = 10;
      break;
    case 'j' :
      value = 11;
      break;
    case 'q' :
      value = 12;
      break;
    case 'k' :
    default :
      value = 13
  }
  switch (card[1]) {
    case 's' :
      suit = 0;
      break;
    case 'h' :
      suit = 1;
      break;
    case 'd' :
      suit = 2;
      break;
    case 'c' :
    default :
      suit = 3
  }
  return this.encodeCard(value, suit)
};

utils.encodeCard = function (card, type) {
  return (card << 4) & 0xf0 | (type << 2)
};

/**
 *
 * @param array
 * @param key
 * @param dimension : 0-tăng dần, 1-giảm dần
 * @returns {*|Query|Array|Cursor}
 */
utils.sortByKey = function(array, key, dimension) {
  return array.sort(function(a, b) {
    var x = a[key];
    var y = b[key];
    if (!dimension)
      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    else
      return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  });
};

utils.getFromKey = function (targetType, fromId) {
  return '' + fromId + '|' + targetType;
};

utils.getQueryInFromArray = function (array) {
  for (var i = 0, len = array.length; i < len; i++) {
    var item = array[i];
    if (lodash.isString(item)) {
      array[i] = "'" + item + "'"
    }
  }
  return "(" + array.join(',') + ")";
};

utils.combinations = function (numArr, choose) {
  var n = numArr.length;
  var c = [];
  var all = [];
  var inner = function (start, choose_) {
    if (choose_ == 0) {
      all[all.length] = Array.apply(undefined, c);
    }
    else {
      for (var i = start; i <= n - choose_; ++i) {
        c.push(numArr[i]);
        inner(i + 1, choose_ - 1);
        c.pop();
      }
    }
  };
  inner(0, choose);
  return all
};

utils.log = function(args) {
  var redis = pomelo.app.get('redisInfo');
  for (var i=0; i<arguments.length; i++) {
    var content = arguments[i];
    console.log(content);
    if (typeof content == 'object' && content !== null)
      content = JSON.stringify(content);
    else if (typeof content != 'string' && content)
      content = content.toString();
    content = 'DUMP '+(i+1).toString()+': '+content;
    redis.publish('log', content, function(e, reply) {
      if (e) console.error(e.stack || e);
      else console.log(content);
    });
  }
  redis.publish('log', '-----', function(e, reply) {
  });
};

utils.getTimeLeft = function(timeout) {
  return Math.ceil((timeout._idleStart + timeout._idleTimeout - Date.now()) / 1000);
};

utils.convertMomentToCron = function (time) {
  return util.format('%s %s %s %s %s %s', 0, time.minute(), time.hour(), time.date(), time.month(), '*');
};

utils.getCardValue =  function (card) {
  return card >> 4 & 0x0f;
};

utils.getCardString = function (cards) {
  if (!lodash.isArray(cards)) return '';
  var result = '';
  for (var i = 0, len = cards.length; i < len; i++) {
    result += ('/' + String.fromCharCode(cards[i] >> 2));
  }
  return result
};

utils.findTourAfterTime = function findTourAfterTime(tour, time) {
  var days = tour.day;
  var daysArray = [];
  for (var j = 0, lenj = days.length; j < lenj; j++) {
    var day = days[j];
    daysArray.push(day.time.begin);
    daysArray.push(day.time.end);
  }
  for (j = 0, lenj = daysArray.length; j < lenj; j++) {
    day = daysArray[j];
    var dayAfter = daysArray[j + 1];
    if (!dayAfter) {
      break;
    }
    if (moment(time).isBetween(day, dayAfter)) {
      return {
        nextTime: dayAfter,
        type: days[Math.floor((j+1)/2)].type
      }
    }
  }
};
