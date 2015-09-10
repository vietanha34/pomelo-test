module.exports = {
  PR_ID: 3,
  PARTNER_ID: 1,
  CHARGE_SECRET_KEY: 'd68Ntm5Uzjhb',
  PLATFORM_ENUM : {
    IOS : 0,
    ANDROID : 1,
    WINDOWPHONE : 2,
    JAVA : 3
  },
  JOIN_BOARD_PROPERTIES : ['level', 'gold', 'username', 'uid', 'fullname', 'xp', 'sex', 'avatar', 'chip'],

  GAMEID : {
    XAM : 0,
    TLMN_DL : 1,
    PHOM : 2,
    POKER : 3,
    LIENG : 4,
    XITO : 5,
    MAU_BINH : 6,
    XI_ZACH : 7,
    TLMN : 8,
    CAO : 9
  },

  GAME_ID_ALLOW_FRIEND : [
    3,4,5,6,7,9
  ],
  GAME_ID_AUTO_START : [3,4,5],
  TOP: {
    TIME: {
      WEEKLY: 1,
      MONTHLY: 2,
      TOTAL: 3
    },
    REGION: {
      GLOBAL: 1,
      LOCAL: 2,
      FRIEND: 3
    },
    TYPE: {
      MONEY: 1,
      TOTALPOT: 2,
      HANDWON: 3,
      TOURWON: 4
    }
  },

  RESPONSE_EC: {
    NOT_DISPLAY: 0,
    TOAST: 1,
    POPUP: 2
  },

  NOTIFY_TYPE: {
    POPUP: 1,
    MARQUEE: 2
  },

  NOTIFY_SCOPE : {
    ALL: 99,
    USER : 100
  },

  NOTIFY_BUTTON_TYPE: {
    LEAVEBOARD: 1,
    HOME: 2,
    LOGIN: 3,
    QUICKPLAY: 4,
    QUIT: 5,
    WAP: 6,
    CHARGE_GOLD: 7,
    CHARGE_RUBY: 8
  },

  NOTIFY_BUTTON: {
    CLOSE: 1,
    OK: 2,
    CONTINUE: 3
  },

  HOT_LINE: "19001220",

  BOARD: {
    STATE: {
      WAITING: 0,
      RUNNING: 1
    }
  },

  DISTRICT_STATUS: {
    UNAVAILABLE: 0,
    AVAILABLE: 1,
    LOCK: 2,
    NEW: 3
  },

  PHONE_CENTER: '8086',
  PAYMENT_PROCESS: 10,

  FRIEND_METHOD: {
    ADD_FRIEND: 0,
    ACCEPT_FRIEND: 1,
    DELETE_FRIEND: 2
  },

  ACCOUNT_TYPE : {
    ACCOUNT_TYPE_USER : 1,
    ACCOUNT_TYPE_FBUSER : 2,
    ACCOUNT_TYPE_APPOTA : 3,
    ACCOUNT_TYPE_GGUSER : 4
  },

  LOGIN_TYPE : {
    LOGIN_TYPE_NORMAL : 1,
    LOGIN_TYPE_TOKEN : 0,
    LOGIN_TYPE_FACEBOOK : 2,
    LOGIN_TYPE_APPOTA : 3,
    LOGIN_TYPE_GOOGLE : 4
  },

  ITEM_TYPE: {
    NORMAL: 1,
    HOT: 2,
    NEW: 3
  },


  ROOM_ID : {
    SINH_VIEN : 0,
    BINH_DAN :1,
    DAI_GIA : 2,
    TY_PHU : 3
  },

  DEFAULT : {
    GOLD : 1000000,
    XP : 0,
    LEVEL : 0
  },

  BOARD_STATUS: {
    NOT_STARTED: 0,
    PLAY : 1,
    PREFLOP: 3,
    FLOP: 4,
    TURN: 5,
    RIVER: 6,
    SHOW_DOWN: 7
  },

  PLAYER_STATUS: {
    NOT_PLAY: 0,
    PLAY: 1,
    READY : 2
  },

  WIN_TYPE : {
    BIG_WIN: 1,
    WIN : 2,
    FIRST : 1,
    DRAW : 3,
    LOSE : 4,
    BIG_LOSE : 5,
    GIVE_UP : 6
  },

  ACTION : {
    DONE : 60,
    READY : 100,
    START_GAME : 101,
    CONTINUE : 102,
    SIT_BACK_IN : 110,
    CHARGE_MONEY : 111,
    PROMOTION : 112,
    CHANGE_BOARD : 113,
    INVITE_PLAYER : 114,
    ADVERTISE : 115,
    LEAVE_BOARD : 116
  },

  LANGUAGE_LIMIT : {
    MENU : 8000,
    ITEM_NAME : 100210,
    ITEM_DISABLE : 100500,
    ITEM_ENABLE : 100510
  },

  TARGET_TYPE : {
    GROUP : 1,
    PERSON : 2,
    BOARD : 3  },

  MESSAGE_STATUS : {
    SENDED : 0,
    RECEIVED : 1,
    READ : 2
  },
  GAME_TYPE : {
    NORMAL : 1,
    TOURNAMENT : 2,
    PRIVATE : 3
  },

  DIR: {
    HANDLER: 'handler',
    REMOTE: 'remote',
    CRON: 'cron',
    LOG: 'logs',
    SCRIPT: 'scripts',
    EVENT: 'events',
    COMPONENT: 'components',
    BOARD : 'board.js'
  },

  TOUR_STATUS : {
    PRE_START : 0,
    STARTED : 1,
    RUNNING : 2,
    FINISHED : 3
  },

  WHERE_TYPE : {
    EQUAL : 0,
    GREATER : 1,
    SMALLER : 2,
    GREATER_EQUAL : 3,
    SMALLER_EQUAL : 4,
    IN : 5
  },

  UMAP_GAME_NAME: {
    0: 'xam',
    1: 'tlmndl',
    2: 'phom',
    3: 'poker',
    4: 'lieng',
    5: 'xito',
    6: 'maubinh',
    7: 'xizach',
    8: 'tlmn',
    9: 'baicao'
  },

  COMBATIVE_SCORE: {
    bigWin: 3,
    win: 2,
    draw: 0,
    lose: -1,
    bigLose: -2
  },

  PAYMENT_TYPE: {
    CARD: 1,
    SMS: 2,
    IAP_IOS: 3,
    IAP_ANDROID: 4,
    IAP_WP: 5,
    BANKING: 6
  },

  DELTA_TIME : 5000,

  TOUR_PRIZE_TYPE : {
    CHAMPION : 1,
    RUNNER_UP : 2,
    THIRD : 3,
    DAY : 4
  },

  TOUR_PRIZE : {
    VAT_PHAM : 1,
    GOLD : 2,
    ITEM : 3
  },

  TOUR_BUY_CONFIG : {
    1: {
      chip: 100000,
      gold: 20000
    },
    2: {
      chip: 50000,
      gold: 20000
    },
    3 : {
      chip : 20000,
      gold : 10000
    }
  },


  TOUR_DAY_TYPE : {
    CN : 1,
    CK : -1
  },

  BUTTON_TYPE :{
    NEGATIVE : 4,
    NORMAL : 2,
    SUGGEST : 1
  },

  TIME: {
    ON_DEAL: 1000,
    ON_TURN_ON_DEAL: 2000,
    ALL_IN: 2000,
    SHOW_DOWN: 2000,
    TIMEOUT_START : 30 * 1000,
    SIT_OUT_TIMEOUT: 3 * 60 * 1000,
    GAME_IDLE: 60 * 1000 * 10,
    GAME_STUCK: 60 * 10 * 1000,
    SIT_OUT_LEAVE: 5 * 60 * 1000,
    TIMEOUT_LEAVE_BOARD: 2000,
    LAYER_TIME : 4000,
    DELTA_TIME : 5000,
    SLEEP_TURN : 500,
    SLEEP_CHARGE : 1000
  },

  CHANGE_GOLD_TYPE: {
    TOPUP_CARD: 1,
    TOPUP_SMS: 2,
    TOPUP_IAP: 3,
    TOPUP_BANKING: 4,
    SPIN: 31,
    BUY_SPIN: 32,
    EVENT_SELL_CHARACTER: 33,
    BUY_ITEM: 34,
    PHAT_LOC: 35,
    XIN_LOC: 36,
    MISSION_AWARD: 37,
    UPDATE_PROFILE: 38,
    SEND_GIFT: 39,
    RECEIVE_GIFT: 40,
    CMS: 41,
    REGISTER: 42,
    DAILY: 43,
    LEVEL_UP: 44,
    ENTER_BOARD: 45,
    LEAVE_BOARD: 46,
    PLAY_GAME: 47,
    ADD_BOARD : 48,
	  VIP_UP: 49,
    UNKNOWN: 99
  },

  TOUR_EXP : {
    REGISTER : 100,
    CHAMPION : 1000,
    RUNNER_UP : 500,
    THIRD : 200
  },

  NOTIFY_BUTTON_COLOR : {
    RED : 0,
    GREEN : 1,
    BLUE : 2,
    VIOLET : 3,
    BLACK: 4
  },

  NOTIFY_TARGET : {
    NORMAL : 0,
    SYSTEM : 1,
    INVITE : 2,
    HALL : 3,
    BOARD_LIST : 4,
    SPIN : 5,
    SHOP : 6,
    HOME : 7,
    LOC : 8,
    MISSION : 9,
    ADVERTISE : 10,
    FRIEND : 11,
    GIFT : 20,
    WEB : 21,
    CHARGE_MONEY : 13,
    TOP : 14,
    TOURNAMENT : 15,
    NEWS : 16,
    EVENTS : 17,
    CLAN : 18,
    LEAVE_BOARD : 22
  },

  POPUP_TYPE : {
    NOTIFY_CENTER : 0,
    CENTER_SCREEN : 1,
    ON_TOP: 2,
    TOAST : 3,
    IMAGE : 4
  },

  VIP: {
    BACH_KIM: 10000000,
    KIM_CUONG: 1000000,
    VANG: 100000,
    BAC: 10000
  },

  VIP_TYPE: {
    BACH_KIM: 4,
    KIM_CUONG: 3,
    VANG: 2,
    BAC: 1,
    BT: 0
  },

  VIP_PROMOTION: {
    1: 10,
    2: 15,
    3: 20,
    4: 25
  },

	VIP_UP_BONUS: {
		1: {
			gold: 50000,
			exp: 50
		},
		2: {
			gold: 80000,
			exp: 100
		},
		3: {
			gold: 100000,
			exp: 150
		},
		4: {
			gold: 200000,
			exp: 200
		}
	},

	VIP_LANGUAGE: {
		1: 100111,
		2: 100112,
		3: 100113,
		4: 100114
	},

  PROMOTION: {
    NEW_USER: 50,
    SMS: {
      2: 10,
      3: 20
    },
    CARD: {
      2: 15,
      3: 25
    },
    KICKED: {
      PERCENT: 100,
      EXPIRE: 30 * 60
    }
  },

  VIP_BONUS_EXP_RATE: {
    1: 1.1,
    2: 1.15,
    3: 1.2,
    4: 1.25
  },

  VIP_POINT: {
    RATE: 100,
    USD2VN: 22000
  },

  AAPD: {
    SUB: 15,
    SCORE: {
      1680: 5,
      810: 4,
      320: 3,
      45: 2,
      10: 1
    },
	  MAX_ADD: 2100
  },

  TOPUP_TYPE: {
    CARD: 1,
    SMS: 2,
    IAP: 3,
    BANK: 4
  },

  SLEEP_TYPE : {
    CARD : 1,
    MONEY : 2
  },

  MAINTENANCE_TYPE : {
    ALL : 1,
    GAME : 2
  },

  CONFIG_TYPE : {
    STRING : 1,
    NUMBER : 2,
    JSON_STRING : 3
  },

  EVENT_WIN_TYPE : {
    TLMN_4_DOI_THONG_CHAT_HEO: 0,
    TLMN_TOI_TRANG: 1,
    THANG_BINH_THUONG: 2,
    PHOM_U_TRON: 10,
    PHOM_U_KHAN: 11,
    PHOM_U : 1005,
    MAU_BINH: 31,
    MAU_BINH_SANH_RONG: 30,
    LIENG_SAP_A: 80,
    LIENG_THANG_50_LAN_TIEN_CUOC: 81,
    POKER_THANG_50_LAN_TIEN_CUOC: 91,
    POKER_THUNG_PHA_SANH: 90,
    XAM_TU_QUI_CHAT_2_HEO: 4,
    XAM_KHUNG_7_LA: 5,
    TLMN_DEM_LA_4_DOI_THONG_CHAT_2_HEO: 8,
    LTMN_DEM_LA_TOI_TRANG: 9,
    COMPLETE_MISSION_1: 41,
    COMPLETE_MISSION_2: 42,
    COMPLETE_MISSION_3: 43,
    COMPLETE_MISSION_4: 44,
    COMPLETE_MISSION_5: 45,
    INVITE_SOCIAL_10: 46,
    PHAT_LOC_10K: 47,
    PHAT_LOC_50K: 48,
    PHAT_LOC_100K: 49
  },

  SEX: {
    MALE: 0,
    FEMALE: 1,
    UNKNOWN: 2
  },

  ONLINE_STATUS: {
    OFFLINE: -1,
    ONLINE: 99
  },

	ACTIVE_POINT_IN_HOUR: 45,
  TOURNAMENT_HOME_STATUS : {
    PREPARE : 0,
    RUNNING : 1,
    FINISH : 2
  },

  CMS_SECRET_KEY: 'tXbC8ieHLBZ0'
};
