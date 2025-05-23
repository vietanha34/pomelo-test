/**
 * Created by vietanha34 on 5/28/14.
 */

var util = require('util');
var utils = require('./utils');

var RedisKeyUtil = module.exports;


var BOARD_LIST = 'cothu:boardlist';
var LOCK_BOARD_KEY = 'cothu:lockBoard'
var PLAYER_INFO_KEY = 'cothu:userInfo:{uid}';
var PLAYER_FRIEND_KEY = 'cothu:friend:{uid}';
var PLAYER_LEVEL_KEY = 'cothu:player:{username}:level';
var TOP_PLAYER_LEVEL_KEY = 'cothu:player:top:level:{gameid}:{type}';
var PLAYER_FRONT_END = 'cothu:player:{username}:frontendId';
var GLOBAL_WAITING = 'cothu:waiting:global';
var GLOBAL_WAITING_REVERSE = 'cothu:waiting:global:reverse';
var GAME_WAITING = 'cothu:waiting:game:{gameId}';
var PLAYER_LABEL_KEY = 'cothu:label:{uid}';
var PLAYER_CHAT_KEY = 'cothu:chat:{uid}';
var IDSESSION_KEY = 'cothu:idSession:{idSession}';
var UNAME_MAP_ID_KEY = "MAP_UNAME_ID:{uname}";
var ROOM_INFO = 'cothu:room:{id}:info';
var ROOM_MEMBERS = 'cothu:room:{id}:members';
var USER_MESSAGE_STATE =  'cothu:{uid}:message:state';
var USER_ROOM_LIST = 'cothu:{uid}:room:list';
var USER_METADATA = 'cothu:{uid}:metadata'; // count unread message;
var USER_VIDEO_ADS = 'cothu:{uid}:videoAds';
var CRONID_HASH = 'cothu:cron:ids';
var CRONID_MAX = 'cothu:cron:max';
var PLAYER_BOARD_LIST = 'POMELO:STATUS:board:{uid}';
var CHAT_CHANNEL_BAN_USER = 'cothu:channel:ban:{name}';
var USER_PROMOTION_KEY = 'cothu:hash:promotion:{uid}';
var LOG_MONEY_IN_GAME = 'cothu:list:log:money:ingame';
var LOG_MONEY_TOPUP = 'cothu:list:log:money:topup';
var SUB_ACTIVE_POINT_IN_HOUR = 'cothu:sub:active:point:inhour';
var SUBSCRIBER_CHANNEL =  'channel:subscriber';
var CMS_PROMOTION_KEY = 'cothu:cms:promotion';
var USER_ALERT_KEY = 'cothu:alert:mark:{uid}';
var TRANSACTION_DETAIL = 'transaction:detail:{transactionId}';
var TRANSACTION_LIST = 'transaction:list';
var USER_GOLD = 'cothu:user_gold:%d';
var USER_NOTIFY = 'cothu:user_notify:%d';
var USER_EFFECT = 'cothu:user_effect:%d';
var DAILY_CONFIG = 'cothu:daily_config';
var PAYMENT_CONFIG = 'cothu:payment_config';
var USER_CHAT_LOG = 'cothu:{uid}:log';
var MISSION = 'cothu:mission:%d';
var ALL_MISSION = 'cothu:all_mission';
var MISSION_PROGRESS = 'cothu:mission_progress:%d';
var MISSION_STATUS = 'cothu:mission_status:%d';
var INVITE_SOCIAL = 'cothu:invite_social:%d';
var CHAT_GUILD_NAME = 'GUILD_{uid}';
var LEAVE_GUILD = 'cothu:guild:leave:{uid}';
var GUILD_DUEL_FAIL = 'cothu:guild:duel:fail:{guildId1}:{guildId2}';
var GUILD_DUEL_SUCCESS = 'cothu:guild:duel:success:{guildId1}:{guildId2}';
var USER_ACTION = 'cothu:action:{uid}';
var IS_REVIEW_VERSION = 'cothu:isReview:{version}';

var CCU_KEY = 'POMELO:CCU:count';
var CCU_LIST = 'POMELO:CCU:list';

RedisKeyUtil.getIsReviewVersion = function (version) {
  return IS_REVIEW_VERSION.replace(
    /\{(\w+)\}/g,
    function (u) {
      return version;
    }
  );
};

RedisKeyUtil.getLockBoardKey = function () {
  return LOCK_BOARD_KEY
}

RedisKeyUtil.getGuildDuelFail = function (guildId1, guildId2) {
  return GUILD_DUEL_FAIL.replace(
    /\{(\w+)\}/g,
    function (u) {
      switch (u) {
        case '{guildId1}':
          return guildId1;
        case '{guildId2}' :
          return guildId2;
        default :
          return guildId1
      }
    }
  );
};

RedisKeyUtil.getGuildDuelSuccess = function (guildId1, guildId2) {
  return GUILD_DUEL_SUCCESS.replace(
    /\{(\w+)\}/g,
    function (u) {
      switch (u) {
        case '{guildId1}':
          return guildId1;
        case '{guildId2}' :
          return guildId2;
        default :
          return guildId1
      }
    }
  );
};



RedisKeyUtil.getLeaveGuild = function (uid) {
  return LEAVE_GUILD.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getUserAction = function (uid) {
  return USER_ACTION.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getChatGuildName = function (guildId) {
  return CHAT_GUILD_NAME.replace(
    /\{(\w+)\}/g,
    function (u) {
      return guildId;
    }
  );
};


RedisKeyUtil.getUserKeyVideoAds = function (uid) {
  return USER_VIDEO_ADS.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
};

RedisKeyUtil.getTransactionDetail = function (transactionId) {
  return TRANSACTION_DETAIL.replace(
    /\{(\w+)\}/g,
    function (u) {
      return transactionId;
    }
  );
};

RedisKeyUtil.getTransactionList = function () {
  return TRANSACTION_LIST;
};

RedisKeyUtil.getCcuKey = function () {
  return CCU_KEY
};

RedisKeyUtil.getCcuList = function () {
  return CCU_LIST;
};

RedisKeyUtil.getPlayerBoardList = function (uid) {
  return PLAYER_BOARD_LIST.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
    }
  );
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

RedisKeyUtil.getUserChatLog = function (uid) {
  return USER_CHAT_LOG.replace(
    /\{(\w+)\}/g,
    function (u) {
      return uid;
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


RedisKeyUtil.getWaitingGlobal = function () {
  return GLOBAL_WAITING
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
  return 'thanbai:member:daily:topup:card';
};

RedisKeyUtil.getDailySmsTopup = function () {
  return 'thanbai:member:daily:topup:sms';
};

RedisKeyUtil.getDailyIapTopup = function () {
  return 'thanbai:member:daily:topup:iap';
};


RedisKeyUtil.getUserMoneyLowerKicked = function (uid) {
  return 'thanbai:lower:money:kicked:' + uid;
};

RedisKeyUtil.getLogMoneyIngameKey = function () {
  return LOG_MONEY_IN_GAME;
};

RedisKeyUtil.getLogMoneyTopupKey = function () {
  return LOG_MONEY_TOPUP;
};

RedisKeyUtil.getSubUserActivePoint = function () {
	return SUB_ACTIVE_POINT_IN_HOUR;
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

RedisKeyUtil.getUserGoldKey = function getUserGoldKey(uid) {
  return util.format(USER_GOLD, uid);
};

RedisKeyUtil.getUserNotifyKey = function getUserNotifyKey(uid) {
  return util.format(USER_NOTIFY, uid);
};

RedisKeyUtil.getUserEffectKey = function getUserEffectKey(uid) {
  return util.format(USER_EFFECT, uid);
};

RedisKeyUtil.getDailyConfigKey = function getDailyConfigKey() {
  return DAILY_CONFIG;
};

RedisKeyUtil.getPaymentConfigKey = function getDailyConfigKey() {
  return PAYMENT_CONFIG;
};

RedisKeyUtil.getMissionKey = function getMissionKey(missionId) {
  return util.format(MISSION, missionId);
};

RedisKeyUtil.getAllMissionKey = function getAllMissionKey() {
  return ALL_MISSION;
};

RedisKeyUtil.getMissionProgressKey = function getMissionProgressKey(uid) {
  return util.format(MISSION_PROGRESS, uid);
};

RedisKeyUtil.getMissionStatusKey = function getMissionStatusKey(uid) {
  return util.format(MISSION_STATUS, uid);
};

RedisKeyUtil.getInviteSocialKey = function getInviteSocialKey(uid) {
  return util.format(INVITE_SOCIAL, uid);
};

RedisKeyUtil.userVideoAdsKey = function(uid) {
  return 'cothu:videoAds:'+uid;
};