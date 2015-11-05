/**
 * Created by vietanha34 on 11/22/14.
 */


module.exports = {
  SEAT_SLOT : {
    0 : [0,1,2,3],
    1 : [1,0,3,2],
    2 : [2,3,1,0],
    3 : [3,2,0,1]
  },
  SLOT_ORDER : {
    0 : 0,
    2 : 1,
    1 : 2,
    3 : 3
  },
  LEAVEBOARD_TIMEOUT : 10000,
  TURN_ORDER : [0,2,1,3],
  BOARD_STATUS: {
    NOT_STARTED: 1,
    SEATING: 2,
    PREFLOP: 3,
    FLOP: 4,
    TURN: 5,
    RIVER: 6,
    SHOW_DOWN: 7
  },

  SLOT_STATUS : {
    SITED : 1,
    NOT_AVAILABLE : 0,
    AVAILABLE : 2
  },

  PLAYER_STATUS: {
    NOT_PLAY: 0,
    PLAY: 1
  },


  PAYMENT_METHOD : {
    SUB_GOLD : 1,
    ADD_GOLD : 2,
    SYNC_GOLD : 3
  }
};