/**
 * Created by vietanha34 on 5/28/14.
 */

var utils = require('./utils');

var RedisKeyUtil = module.exports;


var BOARD_LIST = 'ipoker:boardlist';
var PLAYER_INFO_KEY = 'ipoker:userInfo:{uid}';
var PLAYER_FRIEND_KEY = 'ipoker:friend:{uid}';
var PLAYER_LEVEL_KEY = 'ipoker:player:{username}:level';
var TOP_PLAYER_LEVEL_KEY = 'ipoker:player:top:level:{gameid}:{type}';
var PLAYER_FRONT_END = 'ipoker:player:{username}:frontendId';
var GLOBAL_WAITING = 'ipoker:waiting:global';
var GLOBAL_WAITING_REVERSE = 'ipoker:waiting:global:reverse';
var GAME_WAITING = 'ipoker:waiting:game:{gameId}';
var PLAYER_LABEL_KEY = 'ipoker:label:{uid}';
var PLAYER_CHAT_KEY = 'ipoker:chat:{uid}';
var WEEKLY_LEADER_BOARD = 'ipoker:leaderboard:weekly:{type}:{weekday}';
var MONTHLY_LEADER_BOARD = 'ipoker:leaderboard:monthly:{type}:{month}';
var TOTAL_LEADER_BOARD = 'ipoker:leaderboard:total:{type}';
var TAX_KEY = 'ipoker:tax:{blind}';
var TAX_LOG_KEY = 'ipoker:tax:log:{blind}';
var TOTAL_TAX = 'ipoker:tax:total';
var IDSESSION_KEY = 'ipoker:isSession:{idSession}';
var ROOM_INFO = 'ipoker:room:{id}:info';
var ROOM_MEMBERS = 'ipoker:room:{id}:members';
var USER_MESSAGE_STATE =  'ipoker:{uid}:message:state';
var USER_ROOM_LIST = 'ipoker:{uid}:room:list';
var USER_METADATA = 'ipoker:{uid}:metadata'; // count unread message;
var CRONID_HASH = 'ipoker:cron:ids';
var CRONID_MAX = 'ipoker.cron:max';
var CHAT_CHANNEL_BAN_USER = 'ipoker:channel:ban:{name}';
var USER_PROMOTION_KEY = 'ipoker:hash:promotion:{uid}';
var LOG_MONEY_IN_GAME = 'ipoker:list:log:money:ingame';
var LOG_MONEY_TOPUP = 'ipoker:list:log:money:topup';
var CCU_KEY = 'POMELO:CCU:count';
var CCU_LIST = 'POMELO:CCU:list';
var SUBSCRIBER_CHANNEL =  'channel:subscriber';
var PLAYER_BOARD_LIST = 'POMELO:STATUS:board:{uid}';
var CMS_PROMOTION_KEY = 'ipoker:cms:promotion';
var USER_ALERT_KEY = 'ipoker:alert:mark:{uid}';

RedisKeyUtil.getPlayerBoardList = function (uid) {
  return PLAYER_BOARD_LIST.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getCcuKey = function () {
  return CCU_KEY
};

RedisKeyUtil.getCcuList = function () {
  return CCU_LIST;
};

RedisKeyUtil.getChatChannelBanUserKey = function (name) {
  return CHAT_CHANNEL_BAN_USER.replace(
    /\{(\w+)\}/g,
    function (u) {
      return name;
    }
  );
};

RedisKeyUtil.getCronIdHashKey = function () {
  return CRONID_HASH;
};

RedisKeyUtil.getCronMaxKey = function () {
  return CRONID_MAX;
};

RedisKeyUtil.getRoomInfoKey = function (roomId) {
  return ROOM_INFO.replace(
    /\{(\w+)\}/g,
    function (u) {
      return roomId;
    }
  );
};

RedisKeyUtil.getRoomMembersKey = function (roomId) {
  return ROOM_MEMBERS.replace(
    /\{(\w+)\}/g,
    function (u) {
      return roomId;
    }
  );
};

RedisKeyUtil.getUserMessageStateKey = function (uid) {
  return USER_MESSAGE_STATE.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getRoomListKey = function (uid) {
  return USER_ROOM_LIST.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getUserMetadata = function (uid) {
  return USER_METADATA.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getTaxKey = function (blind) {
  return TAX_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return blind;
    }
  );
};

RedisKeyUtil.getUnameMapIdKey = function (uname) {
  return UNAME_MAP_ID_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uname;
    }
  );
};

RedisKeyUtil.getIdSessionKey = function (idSession) {
  return IDSESSION_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return idSession;
    }
  );
};

RedisKeyUtil.getTotalTaxKey = function () {
  return TOTAL_TAX;
};

RedisKeyUtil.getTaxLogKey = function (blind) {
  return TAX_LOG_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return blind;
    }
  );
};

RedisKeyUtil.getWaitingGlobal = function () {
  return GLOBAL_WAITING
};

RedisKeyUtil.getWeeklyLeaderBoard = function (type) {
  var monday = utils.getMonday(new Date());
  type = type || 1;
  return WEEKLY_LEADER_BOARD.replace(
    /\{(\w+)\}/g,
    function (u) {
      switch (u) {
        case '{weekday}':
          return monday;
        case '{type}' :
          return type;
        default :
          return monday
      }
    }
  );
};

RedisKeyUtil.getMonthlyLeaderBoard = function (type) {
  var month = (new Date()).getMonth();
  type = type || 1;
  return MONTHLY_LEADER_BOARD.replace(
    /\{(\w+)\}/g,
    function (u) {
      switch (u) {
        case '{month}':
          return month;
        case '{type}' :
          return type;
        default :
          return month
      }
    }
  );
};

RedisKeyUtil.getTotalLeaderBoard = function (type) {
  type = type || 1;
  return TOTAL_LEADER_BOARD.replace(
    /\{(\w+)\}/g,
    function (u) {
      return type;
    }
  );
};

RedisKeyUtil.getBoardListKey = function (districtId) {
  return BOARD_LIST.replace(
    /\{(\w+)\}/g,
    function (u) {
      return districtId;
    }
  );
};


RedisKeyUtil.getPlayerLabelKey = function (uid) {
  return PLAYER_LABEL_KEY.replace(/\{(\w+)\}/g, function (u) {
    return uid
  })
};

RedisKeyUtil.getPlayerChatKey = function (uid) {
  return PLAYER_CHAT_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getWaitingGame = function (gameId) {
  return GAME_WAITING.replace(
    /\{(\w+)\}/g,
    function (u) {
      return gameId;
    }
  );
};

RedisKeyUtil.getWaitingGlobalReverse = function () {
  return GLOBAL_WAITING_REVERSE;
};

RedisKeyUtil.getPlayerInfoKey = function (username) {
  return PLAYER_INFO_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return username;
    }
  );
};

RedisKeyUtil.getPlayerFriendKey = function (uid) {
  return PLAYER_FRIEND_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getPlayerLevelKey = function (username) {
  return PLAYER_LEVEL_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return username;
    }
  );
};

RedisKeyUtil.getTopPlayerLevelKey = function (gameId, type) {
  return TOP_PLAYER_LEVEL_KEY.replace(
      /\{(\w+)\}/g,
      function (u) {
        switch (u) {
          case '{gameid}':
            return gameId;
          case '{type}' :
            return type;
          default :
            return gameId
        }
      }
  );
};


RedisKeyUtil.getPlayerFrontendId = function (username) {
  return PLAYER_FRONT_END.replace(
    /\{(\w+)\}/g,
    function (u) {
      return username;
    }
  )
};

RedisKeyUtil.getPromotionKey = function (uid) {
  return USER_PROMOTION_KEY.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  )
};

RedisKeyUtil.getDailyCardTopup = function () {
  return 'ionline:member:daily:topup:card';
};

RedisKeyUtil.getDailySmsTopup = function () {
  return 'ionline:member:daily:topup:sms';
};

RedisKeyUtil.getDailyIapTopup = function () {
  return 'ionline:member:daily:topup:iap';
};


RedisKeyUtil.getUserMoneyLowerKicked = function (uid) {
  return 'ionline:lower:money:kicked:' + uid;
};

RedisKeyUtil.getLogMoneyIngameKey = function () {
  return LOG_MONEY_IN_GAME;
};


RedisKeyUtil.getLogMoneyTopupKey = function () {
  return LOG_MONEY_TOPUP;
};

RedisKeyUtil.getSubscriberChannel = function () {
	return SUBSCRIBER_CHANNEL;
};

RedisKeyUtil.getCmsPromotionKey = function () {
	return CMS_PROMOTION_KEY;
};

RedisKeyUtil.getUserAlertKey = function (uid) {
	return USER_ALERT_KEY.replace(
		/\{(\w+)\}/g,
		function (u) {
			return uid;
		}
	);
};
