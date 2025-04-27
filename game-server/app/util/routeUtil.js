var util = require('util');
var exp = module.exports;
var logger = require('pomelo-logger').getLogger('poker', __filename);
var lodash = require('lodash');
var pomelo = require('pomelo');
var crc = require('crc');


exp.game = function (session, msg, app, cb) {
  var serverId = session ? session.get('serverId') : null;
  var games, game, time, index;
  if (!serverId) {
    // xử lý lời gọi rpc nội bộ
    if (msg.service == 'gameRemote') {
      switch (msg.method){
        case 'createBoard':
          var gameId = msg.args[0];
          games = app.getServersByType('game');
          index = lodash.findIndex(games, { gameId : gameId});
          if (index > -1) {
            game = games[index];
            cb(null, game.id);
          }else {
            time = Date.now();
            index = time % games.length;
            game = games[index];
            cb(null, game.id)
          }
          break;
        default :
          boardId = msg.args[0];
          if (boardId && lodash.isString(boardId)) {
            app.get('boardService').getServerIdFromBoardId(boardId, function (err, serverId) {
              if (err) {
                logger.error(err);
                cb(new Error('Không tìm thấy máy chủ phù hợp'))
              }
              else if (serverId){
                cb(null, serverId);
              }else {
                console.error('routeUtil error : ', msg,  serverId, session ? session.uid : '');
                cb(new Error('Không tìm thấy máy chủ phù hợp'));
              }
            })
          }
          else {
            games = app.getServersByType('game');
            time = Date.now();
            index = time % games.length;
            game = games[index];
            cb(null, game.id)
          }
      }
    }
    // xử lý lời gọi từ client
    else if (msg.service == 'msgRemote') {
      var route, boardId;
      for (var i = 0, len = msg.args.length; i < len; i++) {
        var arg = msg.args[i];
        if (arg.body) {
          // logger with every action from user
          route = arg.route;
          boardId = arg.body.bid;
        }
      }
      if (boardId && route == 'game.handler.joinBoard') {
        app.get('boardService').getServerIdFromBoardId(boardId, function (err, serverId) {
          if (err) {
            logger.error(err);
            cb(new Error('Không tìm thấy máy chủ phù hợp'))
          }
          else {
            cb(null, serverId);
          }
        })
      } else if (route == 'game.handler.leaveBoard') {
        games = app.getServersByType('game');
        time = Date.now();
        index = Math.abs(crc.crc32(time)) % games.length;
        game = games[index];
        cb(null, game.id)
      }
      else {
        cb(new Error('Không tìm thấy máy chủ phù hợp'))
      }
    }
    else {
      cb(new Error('Không tìm thấy máy chủ phù hợp'))
    }
  }
  else {
    cb(null, serverId);
  }
};
  
exp.manager = function(session, msg, app, cb) {
  var uid = session.uid;
  var servers = app.getServersByType('manager');
  var index = Math.abs(crc.crc32(uid)) % servers.length;
  cb(null, servers[index].id);
};

exp.connector = function (session, msg, app, cb) {
  if (!session) {
    cb(new Error('fail to route to connector server for session is empty'));
    return;
  }

  if (!session.frontendId) {
    cb(new Error('fail to find frontend id in session'));
    return;
  }

  cb(null, session.frontendId);
};
