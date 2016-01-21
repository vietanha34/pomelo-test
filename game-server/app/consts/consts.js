module.exports = {
  PR_ID: 24,
  APP_ID: 24,
  PARTNER_ID: 1,
  CHARGE_SECRET_KEY: 'RqSOpZl3XUx5',
  PLATFORM_ENUM : {
    IOS : 1,
    ANDROID : 2,
    WINDOWPHONE : 3,
    JAVA : 4
  },

  MAP_GAME_ID_OLD_VERSION : {
    20 : 5,
    21 : 1,
    22 : 2,
    23 : 6,
    24 : 3,
    25 : 4
  },

  JOIN_BOARD_PROPERTIES : ['level', 'gold', 'username', 'fullname', 'sex', 'avatar', 'uid', 'exp', 'vipPoint'],

  WAITING_LIST : {
    TOTAL : 1,
    FRIEND: 2
  },

  TABLE_TYPE_MAP_EFFECT : {
    1 : 10,
    2 : 11
  },

  GAME_ID : {
    CO_TUONG : 1,
    CO_UP : 2,
    CO_THE : 3,
    CO_VUA : 4,
    CARO : 5,
    CO_VAY : 6
  },

  TABLE_TYPE : {
    ROCK : 0,
    WOOD : 1,
    DARK : 2
  },

  TABLE_TYPE_NAME_MAP : {
    0 : 'bàn đá',
    1 : 'bàn gỗ',
    2 : 'bàn tối'
  },

  HALL_ID : {
    MIEN_PHI : 1,
    TAP_SU : 2,
    BINH_DAN : 3,
    CAO_THU : 4,
    LIET_CHAP : 5,
    KIEN_TUONG : 6
  },

  COLOR : {
    WHITE : 1,
    BLACK : 2
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
    WIN : 1,
    DRAW : 0,
    LOSE : 2,
    GIVE_UP: 3
  },

  ACTION : {
    READY : 2,
    START_GAME : 1,
    CONTINUE : 100,
    SIT_BACK_IN : 3,
    DE_LAY : 4,
    CHARGE_MONEY : 7,
    DRAW : 5,
    SURRENDER : 6,
    HINT : 8,
    STAND_UP : 9,
    CHAT : 10,
    EMO : 11,
    TAN_GAU : 12,
    CHANGE_FORMATION: 14,
    SELECT_FORMATION : 13,
    CHANGE_SIDE : 15,
    BOTTOM_MENU_CHANGE_SIDE : 16,
    CHANGE_TURN : 17
  },

  LANGUAGE_LIMIT : {
    MENU : 8000,
    ITEM_NAME : 100210,
    ITEM_DISABLE : 100500,
    ITEM_ENABLE : 100510
  },

  LOCK_MODE : [1,2,3,4,5,6,7],
  HANDICAP_MODE : [11,12,13],

  LOCK_MODE_MAP : {
    1 : {
      id : 1,
      name : 'lockPawn1',
      before :  [75, 114],
      after :  [88, 101]
    },
    2 : {
      id : 2,
      name : 'lockPawn3',
      before :  [73, 112],
      after : [86, 99]
    },
    3 : {
      id : 3,
      name : 'lockPawn5',
      before : [71, 110],
      after : [84, 97]
    },
    4 : {
      id : 4,
      name : 'lockPawn7',
      before : [69, 108],
      after : [82, 95]
    },
    5 : {
      id : 5,
      name : 'lockPawn9',
      before : [67, 106],
      after : [80, 93]
    },
    6 : {
      id : 6,
      name : 'lockHorse2',
      before : [35, 152],
      after :  [35, 152]
    },
    7 : {
      id : 7,
      name : 'lockHorse8',
      before :  [29, 146],
      after :  [29, 146]
    }
  },

  HANDICAP_MODE_MAP : {
    11 : {
      id : 11,
      name : 'handicapRook1',
      before : [36],
      after : [36]
    },
    12 : {
      id : 12,
      name :'handicapHorse2',
      before : [35],
      after : [35]
    },
    13 :{
      id : 13,
      name : 'handicapCannon2',
      before :  [61],
      after :  [61]
    }
  },

  TARGET_TYPE : {
    GROUP : 1,
    PERSON : 2,
    BOARD : 3,
    BOARD_GUEST : 4
  },

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
    1: 'tuong',
    2: 'up',
    3: 'the',
    4: 'vua',
    5: 'caro',
    6: 'vay'
  },

  GAME_MAP: {
    1: 'Cờ tướng',
    2: 'Cờ úp',
    3: 'Cờ thế',
    4: 'Cờ vua',
    5: 'Cờ caro',
    6: 'Cờ vây'
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

  PAYMENT_METHOD : {
    SUB_GOLD : 1,
    ADD_GOLD : 2,
    SYNC_GOLD : 3,
    TRANSFER : 4
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
    SIT_OUT_TIMEOUT: 10 * 60 * 1000,
    GAME_IDLE: 60 * 1000 * 10,
    GAME_STUCK: 60 * 10 * 1000,
    SIT_OUT_LEAVE: 30 * 60 * 1000,
    BOARD_NOT_START :3 * 60 * 1000,
    TIMEOUT_LEAVE_BOARD: 2000,
    LAYER_TIME : 4000,
    DELTA_TIME : 5000,
    SLEEP_TURN : 500,
    SLEEP_CHARGE : 1000,
    LOGOUT : 60 * 1000
  },

  CHANGE_GOLD_TYPE: {
    TOPUP_CARD: 1,
    TOPUP_SMS: 2,
    TOPUP_IAP: 3,
    TOPUP_BANKING: 4,
    BUY_ITEM: 34,
    MISSION_AWARD: 37,
    CMS: 41,
    REGISTER: 42,
    DAILY: 43,
    LEVEL_UP: 44,
    PLAY_GAME: 47,
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
    BANK: 4,
    SUB: 5
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

  CMS_SECRET_KEY: 'tXbC8ieHLBZ0',

  NOTIFY: {
    TYPE: {
      NOTIFY_CENTER: 0,
      POPUP: 1,
      MARQUEE: 2
    },
    TARGET: {
      NORMAL: 0,
      HOME: 1,
      GO_LOBBY: 2,
      GO_SHOP: 3,
      GO_MISSION: 4,
      GO_NEWS: 5,
      GO_FRIEND: 6,
      GO_TOPUP: 7,
      GO_TOP: 8,
      GET_GOLD: 9,
      GO_CHAT: 10
    },
    SCOPE: {
      ALL: 99,
      USER: 100
    },
    IMAGE: {
      NORMAL: {},
      FRIEND: {},
      ALERT: {},
      GOLD: {},
      AWARD: {},
      UP: {}
    }
  },

  ELO_MAP : {
    1 : 'tuongElo',
    2 : 'upElo',
    3 : 'theElo',
    4 : 'vuaElo',
    5 : 'caroElo',
    6 : 'vayElo'
  },

  PROFILE: {
    PER_PAGE: 5
  },

  FRIEND: {
    PER_PAGE: 20
  },

  TOP: {
    PER_PAGE: 20
  },

  MAX_FRIEND: 200,

  MIN_ELO: 800,
  DEFAULT_ELO: 1000,

  ITEM_EFFECT: {
    LUAN_CO: 1,
    CAM_KICK: 2,
    SUA_THOI_GIAN: 3,
    KHOA_BAN: 4,
    LEVEL: 5,
    CUOCX3: 7,
    CUOCX5: 8,
    THE_DAI_GIA: 9,
    BAN_CO_SAT: 10,
    BAN_CO_TOI: 11,
    VE_PHONG_THUONG: 12,
    THE_VIP: 13
  },

  NEWS_CATE: {
    SU_KIEN: 1, // tab tin sự kiện
    TIN_KM: 2, // tab tin KM
    TIN_ADMIN: 3, // tab tin admin
    CHINH_SACH_VIP: 4,
    HUONG_DAN_VAT_PHAM: 5,
    HUONG_DAN_CHUNG: 6,
    DIEU_KHOAN: 7,
    CARD: 8,
    SMS: 9,
    IAP: 10,
    LUAT_CO_TUONG: 11,
    LUAT_CO_UP: 12,
    LUAT_CO_THE: 13,
    LUAT_CO_VUA: 14,
    LUAT_CO_CARO: 15,
    LUAT_CO_VAY: 16
  },
  GAME_MAP_ID: {
    20: 'caro',
    21: 'tuong',
    22: 'up',
    23: 'vay',
    24: 'the',
    25: 'vua'
  },
  PLATFORM_UNMAP: {
    1: 'ios',
    2: 'android',
    3: 'windowphone'
  },

  GUILD_MEMBER_STATUS:{
    NORMAL_MEMBER : 1,
    PRESIDENT : 2,
    VICE_PRESIDENT : 3,
    REQUEST_MEMBER : 4
  }
};
