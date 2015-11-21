var ChannelUtil = module.exports;

var GLOBAL_CHANNEL_NAME = 'global';
var GAME_CHANNEL_PREFIX = 'game_';
var TEAM_CHANNEL_PREFIX = 'team_';
var BOARD_CHANNEL_PREFIX = 'board_';
var BOARD_GUEST_CHANNEL_PREFIX = 'board_guest_';
var DISTRICT_CHANNEL_PREFIX = 'district_';

ChannelUtil.getGlobalChannelName = function () {
  return GLOBAL_CHANNEL_NAME;
};

ChannelUtil.getGameChannelName = function (gameId) {
  return GAME_CHANNEL_PREFIX + gameId;
};

ChannelUtil.getTeamChannelName = function (teamId) {
  return TEAM_CHANNEL_PREFIX + teamId;
};

ChannelUtil.getBoardChannelName = function (boardId) {
  return BOARD_CHANNEL_PREFIX + boardId
};

ChannelUtil.getBoardGuestChannelName = function (boardId) {
  return BOARD_GUEST_CHANNEL_PREFIX + boardId;
};

ChannelUtil.getDistrictChannelName = function (districtId) {
  return DISTRICT_CHANNEL_PREFIX + districtId
};

