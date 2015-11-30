module.exports = {
  OK: 0,
  EMPTY_DATA: 3,
  FA_LOGIN: 2,
  FA_HOME: 1,
  FAIL: 500, // serverError
  MAINTENANCE: 499,
  CHARGE: 505,
  CONFLICT: 400, // conflict device
  USER_NOT_EXIST: 404,
  TIME_OUT: 600,
  CHARGE_TITLE: 1201,
  CHARGE_MESSAGE: 1202,
  NEW_BOARD_TITLE: 1203,
  NEW_BOARD_MESSAGE: 1204,

  REGISTER : {
    OK : 0,
    FAIL : 101
  },

  ON_LOGIN : {
    FA_WRONG_USER_PASSWORD : 201,
    FA_WRONG_CLIENT_ID : 202,
    FA_WRONG_ACCESS_TOKEN : 203,
    FA_UNKNOWN : 204
  },

  ON_QUICK_PLAY: {
    FA_ON_BOARD: 300,
    FA_NOT_ENOUGH_LEVEL: 301,
    FA_NOT_ENOUGH_MONEY: 302,
    FA_BOARD_NOT_EXIST: 304,
    FA_ON_OTHER_BOARD: 303,
    FA_BOARD_FULL: 305,
    FA_NOT_AVAILABLE_BOARD : 306,
    FA_NOT_ENOUGH_MONEY_TO_CREATE_BOARD : 307
  },

  ON_TOUR: {
    FA_NOT_ENOUGH_PLAYER: 700,
    FA_ADD_GOLD: 701,
    FA_SIT_OUT: 702,
    FA_TIME_OUT: 703,
    FA_TOUR_STARTED: 704,
    FA_USER_FINISH_TOUR: 705,
    HINT_READY : 706,
    MSG_READY : 707,
    HINT_PRE_START_TOUR : 708,
    HINT_STARTED_TOUR : 709,
    FA_LEAVE_BOARD_TOUR_NOT_START : 710, // rời bàn khi tour chưa bắt đầu trong 10 giây
    REGISTER_CONFIRM : 711,
    HINT_PRE_FINISH_TOUR : 712,
    FA_NOT_ENOUGH_MONEY_REGISTER : 713,
    HINT_FINAL_PLAY : 714,
    HINT_FINAL_WITHOUT_PLAY : 715,
    FA_BOARD_TOUR_NOT_ENOUGH_PLAYER : 716,
    TOUR_ALL_READY_STARTED : 717,
    HINT_BUY_MORE_CHIP : 718 // bạn không có đủ tiền để tiếp tục chơi Đấu trường, vui lòng mua thêm chip để tiếp tục chơi game
  },

  ON_GAME: {
    FA_GAME_NOT_START: 506,
    FA_TOUR_NOT_START: 507,
    FA_WRONG_MOVE: 504,
    FA_WRONG_ARGUMENT: 510,
    FA_NOT_ON_BOARD: 501,
    FA_NOT_OWNER: 502,
    FA_ENOUGH_MONEY: 505,
    FA_NOT_BUY_GOLD: 508,
    FA_GAME_START: 509,
    FA_GAME_MAINTENANCE: 511,
    FA_TIME_OUT: 512,
    FA_BOARD_MAINTENANCE_TITLE: 513,
    FA_BOARD_MAINTENANCE_MESSAGE: 514,
    FA_ADD_GOLD: 515,
    FA_OWNER_NOT_ENOUGH_MONEY : 516,
    FA_NOT_ENOUGH_PLAYER : 517,
    FA_LEAVE_BOARD_GAME_JUST_STARTED : 518,
    FA_BOARD_NOT_STARTED : 519,
    FA_BOARD_ALREADY_STARTED : 520,
    MSG_CONFIRM: 521,
    FA_WAIT_FOR_READY : 522,
    FA_LEAVE_BOARD : 523,
    FA_STAND_UP : 524,
    FA_STAND_UP_WITH_MONEY : 525,
    FA_LEAVE_BOARD_WITH_MONEY : 526,
    FA_NOT_READY : 527, // ngừoi dùng không chịu sẵn sàng sau 10s
    FA_NOT_ENOUGH_MONEY_TO_CONTINUE : 528,  // người chơi không đủ tiền để có thể tiếp tục
    OWNER : 529, // Tên chủ bàn
    OWNER_CHANGE_BOARD_PROPERTIES : 530, // chủ bàn thay đổi thông tin bàn chơi
    FA_PUNISH : 531,
    FA_NOT_PUNISH : 532,
    FA_NOT_ENOUGH_MONEY_TO_SITIN : 533,
    FA_NOT_ENOUGH_MONEY_TO_READY : 534,
    CHARGE_MONEY : 535,
    CHARGE_MISSION_MONEY : 536,
    RESULT_LOG : 537,
    RESULT_LOG_WITH_CARD : 538,
    FA_CHANGE_MAX_PLAYER_SMALL_THAN_PLAYER : 539, // thay đổi người chơi nhỏ hơn lượng người chơi có trong bàn
    FA_CHANGE_MAX_PLAYER_NOT_ON_CONFIG : 540, // thay đổi sô lượng người chơi không có trong config
    FA_CHANGE_BET : 541, // Thay đổi tiền cược không đúng
    BOARD_FULL : 542,
    FA_SLOT_EXIST : 543, // vị trí đã có người ngồi
    FA_CAM_KICK : 544, // Cấm kick người chơi ra khỏi bàn
    FA_CAM_CHAT : 545, // người chơi bị cấm chat
    FA_KICK : 546, // Bạn đã bị kick
    FA_CAM_CHAT_EXIST : 547,// người chơi này đã bị cấm chat
    FA_KICK_WITH_NAME : 548,
    FA_CAM_CHAT_WITH_NAME : 549,
    FA_OWNER_NOT_HAS_CAM_CHAT : 1300,
    FA_USER_HAS_ITEM_CAM_KICK : 1301,
    FA_OWNER_NOT_ENOUGH_MONEY_CHANGE_BOARD : 1302, // Bạn không đủ tiền để thay đổi mức cược này
    FA_USER_NEED_MONEY_TO_START : 1303,  // Bạn cần ít nhất %s gold để chơi bàn %s người với mức cược %s gold, Vui lòng nạp tiền để chơi tiếp
    FA_OWNER_ENOUGH_MONEY_PLAY_SOLO : 1304, // Chủ bàn không đủ tiền để có thể chơi với bạn
    FA_USER_NOT_ENOUGH_MONEY_TO_START : 1305 ,// Bạn không đủ tiền để chơi bàn %s người
    FA_OWNER_NOT_ENOUGH_MONEY_TO_PLAY_WITH_USER : 1306, // Chủ bàn không đủ tiền để chơi game với bạn
    FA_USER_NOT_READY : 1307, // Bạn chưa sẵn sàng
    FA_NOT_READY_WITH_USERNAME : 1308,
    FA_OWNER_NOT_START : 1309, // Bạn không bắt đầu trong thời gian 15 giây
    FA_OWNER_NOT_START_WITH_USERNAME : 1310, // Chủ bàn không bắt đầu trong thời gian 15 giây
    FA_USER_NOT_READY_WITH_USERNAME : 1311, // %s chưa sẵn sàng
    FA_USER_NOT_ENOUGH_MONEY_TO_START_WITH_USERNAME : 1312, // %s không đủ tiền để chơi bàn %s người
    FA_OWNER_NOT_ENOUGH_MONEY_TO_PLAY_WITH_USER_WITH_USERNAME : 1313, // Chủ bàn không đủ tiền chơi với %s
    FA_NOT_ENOUGH_MONEY_TO_CONTINUE_WITH_USERNAME : 1314,
    FA_WRONG_PASSWORD : 1315
  },

  WIN_TYPE : {
    WIN : 550,
    DRAW : 551,
    LOSE : 552,
    FIRST : 553,
    SECOND : 554,
    THIRD : 555,
    FOURTH : 556,
    CONG : 557,
    DEN_LANG : 558,
    DAY : 559
  },

  LANGUAGE :{
    POINT : 17002
  },

  ON_JOIN_BOARD: {
    NEW: 650,
    OLD: 651,
    GUEST: 652
  },

  ENTRY: {
    FA_INFO_INVALID: 1001,
    FA_USER_NOT_EXIST: 1003
  },
  GAME: {
    MAINTAIN: 0,
    AVAILABLE: 1,
    NEW: 2,
    DELETE: 3
  },

  FACEBOOK_SHARE: {
    WINNING: 1100,
    TOUR_WIN: 1101,
    TOUR_RUNNING_UP: 1102
  },

  GATE: {
    FA_NO_CODE_AVAILABLE: 301,
    FA_MAINTENANCE: 302,
    FA_MAINTENANCE_GAME: 303 // bảo trì game
  },

  CHAT: {
    FA_CHANNEL_CREATE: 3001,
    FA_CHANNEL_NOT_EXIST: 3002,
    FA_UNKNOWN_CONNECTOR: 3003,
    FA_USER_NOT_ONLINE: 3004,
    FA_USER_NOT_FRIEND : 3005
  },

  PAYMENT: {
    SUCCESS: 0,
    DONE: 202,
    ERROR: 500,
    USER_NOT_EXISTS: 501,
    MONEY_LOWER: 502,
    TRANSACTION_EXISTS: 503,
    ERROR_PARAM: 505,
	  USER_LOCED: 506,
    CARD_SUCCESS: 600,
    IAP_SUCCESS: 601
  },

  PAYMENT_UMAP_LANGUAGE: {
    41: 602,
    42: 603,
    44: 604,
    45: 605,
    46: 606,
    47: 607,
    48: 608,
    49: 609,
    50: 610,
    51: 611,
    52: 612,
    53: 613,
    54: 614,
    90: 615,
    DEFAULT: 608
  },

  PROMOTION: {
    SUCCESS: 0,
    WRONG_PARAMETER: 1,
    ERROR: 2
  },

  PROMOTION_LANGUAGE: {
    VIP: {
      0: 800,
      1: 801,
      2: 802,
      3: 803,
      4: 804
    },
    NEW_USER: 805,
    DAILY: {
      SMS: 806,
      CARD: 807
    },
    KICKED: 808,
    VIP_POINT: 809,
    VIP_POINT_PER: 810
  },

  COMMON_LANGUAGE: {
    ERROR: 'Chức năng đang bảo trì',
    ADD_GOLD: 'Bạn vừa được cộng %s gold'
  },

  ELO_LANGUAGE: {
    0: 'Cờ thủ',
    1: 'Cao thủ',
    2: 'Danh thủ',
    3: 'Đại sư'
  },

  FIRST_LANGUAGE: {
    0: 'Tiên',
    1: 'Hậu'
  },

  WIN_LANGUAGE: {
    1: 'Thua',
    0: 'Hòa',
    2: 'Thắng'
  },

  VIP_LANGUAGE: {
    0: '',
    1: 'Vip bạc',
    2: 'Vip vàng',
    3: 'Vip kim cương'
  },

  PROFILE_LANGUAGE: {
    SUCCESS: 'Cập nhật thông tin thành công',
    PASSWORD_SUCCESS: 'Đổi mật khẩu thành công',
    WRONG_OLD_PASSWORD: 'Mật khẩu cũ không đúng'
  },

  EC: {
    SUCCESS: 0,
    GO_HOME: 1,
    GO_LOGIN: 2,
    NORMAL: 3
  },

  FRIEND_STATUS: {
    UNFRIEND: 0,
    FRIEND: 2,
    WAITING: 3,
    PENDING: 1
  },

  TOP_TYPE: {
    VIP: 99,
    GOLD: 100
  },

  FRIEND_LANGUAGE: {
    REQUEST_OK: 'Kết bạn thành công',
    REQUEST: 'Có thêm bạn mới!',
    FRIEND_SUCCESS: 'Kết bạn thành công',
    //ACCEPT_FRIEND: '%s đã chấp nhận lời mời kết bạn của bạn',
    //ALREADY_FRIEND: 'Bạn và người chơi này đã là bạn bè rồi',
    CANCEL_BEFORE: 'Yêu cầu kết bạn đã bị hủy trước đó',
    ACCEPT: 'OK',
    REQUEST_TO_YOU: '%s vừa kết bạn, chúc mừng đã có thêm bạn mới',
    //REJECT_OK: 'Đã từ chối kết bạn',
    UNFRIEND_OK: 'Đã hủy bạn bè thành công',
    LIMITED: 'Bạn chỉ được phép có tối đa %s bạn bè'
  },

  ITEM_LANGUAGE: {
    NOT_ENOUGH_MONEY: 'Bạn không có đủ tiền!',
    BUY_SUCCESS: '%s vật phẩm thành công!',
    BUY: 'Mua',
    RENEW: 'Gia hạn'
  },

  DAILY_LANGUAGE: {
    RECEICE_MONEY: 'Bạn vừa nhận được %s vàng'
  },

  FEEDBACK_LANGUAGE: {
    SUCCESS: 'Cảm ơn bạn đã gửi góp ý'
  }
};