module.exports = {
  PR_ID: 24,
  APP_ID: 24,
  PARTNER_ID: 1,
  CHARGE_SECRET_KEY: 'RqSOpZl3XUx5',
  PLATFORM_ENUM : {
    IOS : 1,
    ANDROID : 2,
    WINDOWPHONE : 3,
    JAVA : 4,
    WEB: 6,
    INSTANT: 7
  },

  FACE_OFF_MODE:{
    NORMAL : 1,
    CANNON : 2,
    DEATH_MATCH : 3
  },

  GAME_ACTION_ID :{
    AFK_CHECK : 1
  },

  ACTION_ID : {
    INVITE_GUILD: 1,
    TOURNAMENT_DUEL : 2
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
    LEVEL : 0,
    TURN_TIME_FREE : 3 * 60 * 1000,
    TOTAL_TIME_FREE : 30*60 * 1000
  },

  BOARD_STATUS: {
    NOT_STARTED: 0,
    PLAY : 1,
    FINISH : 2,
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
    DRAW : 5,
    SURRENDER : 6,
    CHARGE_MONEY : 7,
    HINT : 8,
    STAND_UP : 9,
    CHAT : 10,
    EMO : 11,
    TAN_GAU : 12,
    CHANGE_FORMATION: 14,
    SELECT_FORMATION : 13,
    CHANGE_SIDE : 15,
    BOTTOM_MENU_CHANGE_SIDE : 16,
    CHANGE_TURN : 17,
    INFORMATION : 18,
    TOURNAMENT: 19
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
    BOARD_GUEST : 4,
    GLOBAL: 5
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

  TOUR_ROUND_TYPE: {
    NORMAL :1,
    FINAL : 2
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

  TOUR_BATTLE_TYPE :{
    THUY_SY : 1,
    FACE_TO_FACE : 2
  },

  TOUR_DAY_TYPE : {
    CN : 1,
    CK : -1
  },

  TOUR_HISTORY_ROUND_TYPE :{
    TU_KET: 1,
    BAN_KET : 2,
    CHUNG_KET : 3
  },

  TOUR_TYPE:{
    FRIENDLY : 1,
    NORMAL : 2
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
    SIT_OUT_LEAVE: 120 * 60 * 1000,
    BOARD_NOT_START :15 * 60 * 1000,
    TIMEOUT_LEAVE_BOARD: 2000,
    LAYER_TIME : 4000,
    DELTA_TIME : 5000,
    SLEEP_TURN : 500,
    SLEEP_CHARGE : 1000,
    GUEST : 30 * 60 * 1000,
    LOGOUT : 30 * 1000,
    FRIENDLY_WAIT : 5 * 60 * 1000,
  },

  CHANGE_GOLD_TYPE: {
    TOPUP_CARD: 1,
    TOPUP_SMS: 2,
    TOPUP_IAP: 3,
    TOPUP_BANKING: 4,
    TOPUP_SUB: 5,
    BUY_ITEM: 34,
    MISSION_AWARD: 37,
    CMS: 41,
    REGISTER: 42,
    DAILY: 43,
    LEVEL_UP: 44,
    PLAY_GAME: 47,
    VIDEO_ADS: 48,
    BONUS_PLAY_GAME: 49,
    NRU: 50,
    BANKRUPT: 60,
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
      MARQUEE: 2,
      TOP_DOWN : 3,
      CONFIRM : 4
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
      GO_CHAT: 10,
      GO_BOARD: 11,
      GO_TOURNAMENT : 12,
      GO_FAN_PAGE : 13,
      GO_URL : 14,
      GO_EVENT : 15,
      GO_PROFILE : 16,
      GO_VIDEO : 17,
      GO_GUILD : 18
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

  ITEM_EFFECT_NAME: {
    1 : 'Luận cờ',
    2: 'Cấm kích',
    3: 'Sửa thời gian',
    4: 'Khoá bàn',
    5: 'level',
    7: 'Cược x3',
    8: 'Cược x5',
    9: 'Thẻ đại gia',
    10: 'Bàn cờ sắt',
    11: 'Bàn cờ tối',
    12: 'Vé phòng thường',
    13: 'Thẻ vip'
  },

  SUGGEST_BUY_ITEM_TEXT: {
    3 : 'Bạn cần vật phẩm  "sửa thời gian" để sử dụng chức năng này',
    4 : 'Bạn cần vật phẩm "khóa bàn chơi" để sử dụng chức năng này"',
    8 : 'Bạn cần item "cược x5" để gia tăng giới hạn cược',
    7 : 'Bạn cần item "cược x3" để gia tăng giới hạn cược'
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
    ios: 'ios',
    android: 'android',
    windowphone: 'windowsphone'
  },

  VIDEO_ADS_PLATFORM_UMAP: {
    ios: 'ios',
    android: 'android',
    windowphone: 'windowsphone'
  },

  GUILD_MEMBER_STATUS:{
    GUEST : 100,
    PRESIDENT : 1,
    VICE_PRESIDENT : 2,
    NORMAL_MEMBER : 3,
    REQUEST_MEMBER : 4,
    INVITE_MEMBER : 5
  },

  GUILD_MEMBER_STATUS_UMAP : {
    1 : "Hội chủ",
    2 : "Hội phó",
    3 : "Thành viên"
  },

  GUILD_UPDATE_MEMBER_TYPE : {
    ADD_MEMBER : 1,
    REMOVE_MEMBER : 2,
    UPGRADE_MEMBER : 3,
    DOWNGRADE_MEMBER : 4,
    ABDICATE_MEMBER: 5
  },

  LOSING_REASON : {
    //1: 'Hết nước đi hợp lệ.',
    2: 'Cả hai phạm luật chiếu dai.',
    3: 'Người chơi %s phạm luật chiếu dai.',
    4: 'Người chơi %s phạm luật duổi dai để cản chiếu hết.',
    5: 'Người chơi %s phạm luật đuổi dai.',
    6: 'Ván đấu kết thúc do 40 nước không tiến triển',
    7: 'Sau 300 nước ván cờ không kết thúc',
    8: 'Không đủ quân để chiến thắng.',
    10: 'Người chơi %s xin thua',
    11: 'Người chơi %s rời bàn',
    12: 'Người chơi %s hết thời gian một lượt đi quân',
    13: 'Người chơi %s hết thời gian tổng lượt đi quân'
  },

  LOSING_REASON_NAME : {
    XIN_THUA : 10,
    ROI_BAN:11,
    HET_LUOT :12,
    HET_TIME:13
  },
  GUILD_EVENT_TYPE :{
    NORMAL : 0,
    JOIN_GUILD : 1, // người chơi vào hội
    LEAVE_GUILD : 2, // người chơi rời hội
    ADD_GOLD : 3, // thành viên xung quỹ;
    WIN_TOUR : 4, // Thắng tour;
    JOIN_TOUR : 5, // người chơi tham gia giải đấu
    UPGRADE_VICE_PRESIDENT : 6, //Thăng chức hội phó
    DOWNGRADE_VICE_PRESIDENT : 7, // Giáng chức hội phó
    UP_LEVEL : 8, // lên level
    CHALLENGE_GUILD: 9, // Thách đấu hội quán,
    WIN_GUILD : 10, // chiến thắng hội quán,
    LOSE_GUILD : 11 // thua hội quán
  },

  GUILD_EVENT_ALIGN : {
    LEFT : 1,
    RIGHT : 2,
    MIDDLE : 3
  },

  GUILD_EVENT_COLOR : {
    GREEN : 1,
    RED : 2 ,
    YELLOW : 3,
    WHITE: 4
  },

  GUILD_INIT_FAME: 1000,

  GUILD_EVENT_TYPE_MAP :{
    0: {},
    1 : {
      color: 4,
      align: 3
    }, // người chơi vào hội
    2 : {
      align :3,
      color :2
    }, // người chơi rời hội
    3 : {
      color : 1
    }, // thành viên xung quỹ;
    4 : {
      color : 3
    }, // Thắng tour;
    5 : {
      color : 4
    }, // người chơi tham gia giải đấu
    6 : {
      color : 1,
      align : 3
    }, //Thăng chức hội phó
    7 : {
      align :3,
      color :2
    }, // Giáng chức hội phó
    8 : {
      color : 1,
      align : 3
    }, // lên level
    9: {
      color: 3,
      align: 3
    }, // Thách đấu hội quán,
    10 : {
      color : 1,
      align : 3
    }, // chiến thắng hội quán,
    11 : {
      color : 2,
      align : 3
    } // thua hội quán
  },
  NOTIFY_NC_POPUP_TYPE:{
    TOURNAMENT_DUEL : 1
  },
  NRU: {
    1: {
      xp: 10,
      gold: 500,
      msg: 'Chúc mừng bạn vừa nhận được ${gold} gold và ${xp} xp khi chơi ván cờ đầu tiên'
    },
    2: {
      friend: 10,
      msg: 'Chúc mừng bạn đã có thêm ${friend} bạn mới khi chơi ván cờ thứ ${count}'
    },
    3: {
      xp: 10,
      gold: 1000,
      msg: 'Chúc mừng bạn vừa nhận được ${gold} gold và ${xp} xp khi thắng ván cờ thứ ${count}'
    },
    10: {
      xp: 10,
      gold: 2000,
      item: {id: 1, duration: 4320},
      msg: 'Chúc mừng bạn vừa nhận được ${gold} gold, ${xp} xp và vật phẩm luận cờ trong 3 ngày khi thắng ván cờ thứ ${count}'
    },
    20: {
      xp: 20,
      gold: 3000,
      item: {id: 3, duration: 4320},
      msg: 'Chúc mừng bạn vừa nhận được ${gold} gold, ${xp} xp và vật phẩm sửa thời gian trong 3 ngày khi thắng ván cờ thứ ${count}'
    },
    30: {
      xp: 50,
      gold: 5000,
      item: {id: 13, duration: 4320},
      msg: 'Chúc mừng bạn vừa nhận được ${gold} gold, ${xp} xp và thẻ VIP bạc trong 3 ngày khi thắng ván cờ thứ ${count}'
    }
  },

  INSTANT_SECRET: '2f5057ee03a358614ca13b2e9d7d6ed2'
};
