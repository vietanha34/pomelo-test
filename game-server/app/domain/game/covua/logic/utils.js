/**
 * Created by vietanha34 on 11/22/14.
 */

var utils = module.exports;

/**
 * Lấy về mặt nạ của slot
 *
 * @param numSlot
 */
utils.getSlotMark = function (numSlot) {
  switch (numSlot) {
    case 9 :
      return [0,2,6,4,8,9,5,7,3];
    case 5 :
      return [0,2,4,5,3];
    default :
      return [0,1,2,3]
  }
};

utils.fillArray = function (number, incre) {
  return Array.apply(null, new Array(number)).map(function (value, index, array) {
    if (incre) {
      return index
    }else {
      return 0
    }
  });
};

utils.fillDeck = function (deck) {
  var i, j;
  for (i = 1; i < 14; i++) {
    for (j = 0; j < 4; j++) {
      deck.push(this.encodeCard(i, j))
    }
  }
  this.FisherYates(deck);
};

utils.FisherYates = function (deck) {
  var i, j, tempi, tempj;
  for (i = 0; i < deck.length; i += 1) {
    j = Math.floor(Math.random() * (i + 1));
    tempi = deck[i];
    tempj = deck[j];
    deck[i] = tempj;
    deck[j] = tempi;
  }
};

utils.encodeCard = function encodeCard(card, type) {
  return (card << 4) & 0xf0 | (type << 2)
};

utils.CARDS = {
  "2c": 1,
  "2d": 2,
  "2h": 3,
  "2s": 4,
  "3c": 5,
  "3d": 6,
  "3h": 7,
  "3s": 8,
  "4c": 9,
  "4d": 10,
  "4h": 11,
  "4s": 12,
  "5c": 13,
  "5d": 14,
  "5h": 15,
  "5s": 16,
  "6c": 17,
  "6d": 18,
  "6h": 19,
  "6s": 20,
  "7c": 21,
  "7d": 22,
  "7h": 23,
  "7s": 24,
  "8c": 25,
  "8d": 26,
  "8h": 27,
  "8s": 28,
  "9c": 29,
  "9d": 30,
  "9h": 31,
  "9s": 32,
  "tc": 33,
  "td": 34,
  "th": 35,
  "ts": 36,
  "jc": 37,
  "jd": 38,
  "jh": 39,
  "js": 40,
  "qc": 41,
  "qd": 42,
  "qh": 43,
  "qs": 44,
  "kc": 45,
  "kd": 46,
  "kh": 47,
  "ks": 48,
  "ac": 49,
  "ad": 50,
  "ah": 51,
  "as": 52
};

utils.encodeCardStringToCode =  function encodeCardStringToCode(cards) {
  var self = this;
  if (typeof cards[0] == "string") {
    return cards.map(function (card) {
      return self.CARDS[card.toLowerCase()];
    });
  }
};

utils.decodeCardToString = function decodeCardToString(cards) {
  var card = cards >> 4 & 0x0f;
  var type = (cards & 0x0f) >> 2;
  var result = '';
  switch (card) {
    case 1 :
      result += 'A';
      break;
    case 2 :
    case 3 :
    case 4 :
    case 5 :
    case 6 :
    case 7 :
    case 8 :
    case 9 :
      result += card.toString().toUpperCase();
      break;
    case 10 :
      result += 'T';
      break;
    case 11 :
      result += 'J';
      break;
    case 12 :
      result += 'Q';
      break;
    case 13 :
    default :
      result += 'K';
  }
  switch (type) {
    case 0 :
      result += 's';
      break;
    case 1 :
      result += 'c';
      break;
    case 2 :
      result += 'd';
      break;
    case 3 :
    default :
      result += 'h'
  }
  return result
},

utils.convertHandToString =  function (hands) {
  var result = [], i, len, hand;
  for (i = 0, len = hands.length; i < len; i++) {
    hand = hands[i];
    result.push(this.decodeCardToString(hand))
  }
  return result
};

