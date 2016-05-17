/**
 * Created by KienDT on 11/21/14.
 */

/**
 * Emit listener config
 */

var CONFIG = module.exports;

CONFIG.TYPE = {
  FINISH_GAME: 2, // chơi thắng 1 ván bài bất kì
  LOGIN: 3,
  LOGOUT : 4,
  TOPUP: 7, // nạp tiền
  UPDATE_PROFILE : 8,
  ADD_FRIEND: 10, // kết bạn
  REGISTER: 15, // đăng kí
  TOURNAMENT : 16
};