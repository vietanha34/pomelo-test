/**
 * Created by vietanha34 on 1/2/15.
 */

var pomelo = require('pomelo');
var async = require('async');
var utils = require('../util/utils');
var Code = require('../consts/code');
var Room = require('./model/room');
var redisKeyUtils = require('../util/redisKeyUtil');
var userDao = require('./userDao');

var RoomDao = module.exports;


RoomDao.createRoom = function (opts, cb) {
  var redisClient = pomelo.app.get('redisCache');
  var room = new Room(opts);
  var multi = redisClient.multi();
  multi.hmset(redisKeyUtils.getRoomInfoKey(room.roomId), room);
  for (var i = 0, len = room.members.length; i < len; i++) {
    var member = room.members[i];
    multi.zadd(redisKeyUtils.getRoomMembersKey(room.roomId), 1, member)
  }
  multi.exec(function (err, result) {
    if (err) {
      utils.invokeCallback(cb, err)
    }
    else {
      utils.invokeCallback(cb, null, room);
    }
  });
  async.each(room.members, function (member) {
    pomelo.app.get('statusService').getSidsByUid(member, function (err, list) {
      if (!err) {
        for (var i = 0, len = list.length; i < len; i++) {
          var sid = list[i];
          pomelo.app.get('globalChannelService').add(room.roomId, member, sid);
        }
      }
    });
    redisClient.zadd(redisKeyUtils.getRoomListKey(member), 1 , room.roomId);
  })
};

RoomDao.getMembers = function (rid, cb) {
  pomelo.app.get('redisCache').zrange(redisKeyUtils.getRoomMembersKey(rid), 0 , -1 , function (err, members) {
    if (err) {
      utils.invokeCallback(cb, err);
    }
    else {
      utils.invokeCallback(cb, null, members)
    }
  })
};

RoomDao.deleteRoom = function (rid, cb) {
  var multi = pomelo.app.get('redisCache').multi();
  multi.del(redisKeyUtils.getRoomInfoKey(rid));
  multi.del(redisKeyUtils.getRoomMembersKey(rid));
  multi.exec(cb)
};

RoomDao.addMember = function (rid ,uids, cb) {
  var redisClient = pomelo.app.get('redisCache');
  async.map(uids, function (uid, done) {
    var multi = redisClient.multi();
    multi.zadd(redisKeyUtils.getRoomMembersKey(rid), 1, uid);
    multi.zadd(redisKeyUtils.getRoomListKey(uid), 1, rid );
    multi.exec(done);
  }, function (err, results) {
    if (err) {
      console.log(err);
      utils.invokeCallback(cb, err)
    }else {
      var userAdded = [];
      for (var i = 0, len = results.length; i < len; i++) {
        var result = results[i];
        if (result && result[0] && result[1]) {
          userAdded.push(uids[i]);
        }
      }
      utils.invokeCallback(cb, null, userAdded);
    }
  })
};

RoomDao.updateRoomInfo = function (rid, info, cb) {
  pomelo.app.get('redisCache').hmset(redisKeyUtils.getRoomInfoKey(rid), info, cb )
};

RoomDao.getInfo = function (rid, cb) {
  pomelo.app.get('redisCache').hgetall(redisKeyUtils.getRoomInfoKey(rid), cb)
};

RoomDao.getRoomInfo = function (roomId, cb) {
  var self = this;
  var rInfo, members;
  async.waterfall([
    function (done) {
      self.getInfo(roomId, done);
    },
    function (info, done) {
      rInfo = info;
      self.getMembers(roomId, done)
    },
    function (member, done) {
      members = member;
      userDao.checkingUserOnline(members, done)
    },
    function (results,done) {
      var members = {};
      var keys = Object.keys(results);
      for (var i = 0, len = keys.length; i < len; i++) {
        var key = keys[i];
        var online = results[key];
        members[key] = {
          userId : key,
          online : online ? 1 : 0
        }
      }
      rInfo.members = members;
      utils.invokeCallback(cb, null, rInfo);
    }
  ], function (err) {
    utils.invokeCallback(cb, err);
  })
};


RoomDao.kickUser = function (rid, uids, cb) {
  var redisClient = pomelo.app.get('redisCache');
  async.map(uids, function (uid, done) {
    var multi = redisClient.multi();
    multi.zrem(redisKeyUtils.getRoomMembersKey(rid), uid);
    multi.zrem(redisKeyUtils.getRoomListKey(uid), uid);
    multi.exec(done);
  }, function (err, results) {
    if (err) {
      console.log(err);
      utils.invokeCallback(cb, err)
    }else {
      var userRemove = [];
      for (var i = 0, len = results.length; i < len; i++) {
        var result = results[i];
        if (result && result[0] && result[1]) {
          userRemove.push(uids[i]);
        }
      }
      utils.invokeCallback(cb, null, userRemove);
    }
  })
};

RoomDao.joinSubscribeRoom = function (uids, cb) {
  var uid = uids.uid;
  var redisClient = pomelo.app.get('redisCache');
  async.waterfall([
    function (done) {
      redisClient.zrange(redisKeyUtils.getRoomListKey(uid), 0 , -1 , done)
    },
    function (rooms, done) {
      for (var i = 0, len = rooms.length; i < len; i++) {
        var room = rooms[i];
        pomelo.app.get('globalChannelService').add(room, uid, uids.sid)
      }
      done()
    }
  ], function (err) {
    if (err) {
      console.log(err);
    }
    utils.invokeCallback(cb);
  })
};


RoomDao.kickSubscribeRoom = function (uids, cb) {
  var uid = uids.uid;
  var redisClient = pomelo.app.get('redisCache');
  async.waterfall([
    function (done) {
      redisClient.zrange(redisKeyUtils.getRoomListKey(uid), 0 , -1 , done)
    },
    function (rooms, done) {
      for (var i = 0, len = rooms.length; i < len; i++) {
        var room = rooms[i];
        pomelo.app.get('globalChannelService').leave(room, uid, uids.sid)
      }
      done()
    }
  ], function (err) {
    if (err) {
      console.log(err);
    }
    utils.invokeCallback(cb);
  })
};