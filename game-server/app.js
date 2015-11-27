var pomelo = require('pomelo');
var Mongo = require('./app/dao/mongo/mongo');
var path = require('path');
var utils = require('./app/util/utils');
var Promise = require('bluebird');

process.env.LOGGER_LINE = true; // debug line number
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'cothu-v2');


app.configure('production|development|local', function () {
  // config db, config module
  app.enable('systemMonitor');
  var routeUtil = require('./app/util/routeUtil');
  app.route('game', routeUtil.game);
  app.route('connector', routeUtil.connector);
  var onlineUser = require('./app/modules/onlineUser');
  var maintenance = require('./app/modules/maintenance');
  var kickUser = require('./app/modules/kickUser');
  var globalChannel = require('pomelo-globalchannel-plugin');
  if (typeof app.registerAdmin === 'function'){
    app.registerAdmin(onlineUser, {app: app});
    app.registerAdmin(maintenance, {app: app});
    //app.registerAdmin(notify, { app : app});
    app.registerAdmin(kickUser,  { app : app});
  }
  app.loadConfig('redisConfig', app.getBase() + '/config/redis.json');
  app.loadConfig('mongoConfig', app.getBase() + '/config/mongo.json');
  app.loadConfig('mysqlConfig', app.getBase() + '/config/mysqlClient.json');
  app.loadConfig('gameConfig', app.getBase() + '/config/game.json');
  app.loadConfig('serviceConfig', app.getBase() + '/config/externalService.json');
  app.loadConfig('eventConfig', app.getBase() + '/config/eventConfig.json');
  app.loadConfig('emitterConfig', app.getBase() + '/config/emitterConfig.json');
  var dataPlugin = require('pomelo-data-plugin');
  var redisConfig = app.get('redisConfig');
  var redisConfigCache = redisConfig.cache;
  app.use(dataPlugin, {
    watcher: {
      dir: __dirname + '/config/csv',
      idx: 'id',
      interval: 30000
    }
  });

  var statusPlugin = require('pomelo-status-plugin');
  app.use(statusPlugin, {
    status: {
      host: redisConfigCache.host,
      port: redisConfigCache.port,
      timeLive: 60,
      db: redisConfigCache.db
    }
  });
  app.use(globalChannel, {
    globalChannel: {
      host: redisConfigCache.host,
      port: redisConfigCache.port,
      cleanOnStartUp: true,
      db: redisConfigCache.db       // optinal, from 0 to 15 with default redis configure
    }
  });

  // Khai báo redis
  var redis = require('redis');
  Promise.promisifyAll(redis.RedisClient.prototype);
  Promise.promisifyAll(redis.Multi.prototype);

  var redisInfo = redis.createClient(redisConfig.info.port, redisConfig.info.host);
  redisInfo.select(redisConfig.info.db);
  app.set('redisInfo', redisInfo);

  var redisService = redis.createClient(redisConfig.service.port, redisConfig.service.host);
  redisService.select(redisConfig.service.db);
  app.set('redisService', redisService);

  var redisCache = redis.createClient(redisConfigCache.port, redisConfigCache.host);
  redisCache.select(redisConfigCache.db);
  app.set('redisCache', redisCache);

  var redisPayment = redis.createClient(redisConfig.payment.port, redisConfig.payment.host);
  redisPayment.select(redisConfig.payment.db);
  app.set('redisPayment', redisPayment);

  // Đồng bộ mysql
  var models = require('./app/dao/mysqlModels/index');
  var curServer  = app.curServer;
  var db = models();
  app.set('mongoClient', Mongo(utils.merge_options({schemaDir: path.join(app.getBase(), '/app/dao/mongoSchema/')}, app.get('mongoConfig'))))
  app.set('mysqlClient', db);
  if (curServer.serverType === 'manager') {
    db.sequelize
      .sync()
      .then(function () {
      })
      .catch(function (err) {
        console.error('err : ', err)
      })
  }
});

// app configuration
app.configure('production|development', 'connector|gate', function(){
  app.loadConfig('encryptConfig', app.getBase() + '/config/encrypt.json');
  app.set('connectorConfig',
    {
      connector: pomelo.connectors.hybridconnector,
      useDict: true,
      useProtobuf: false,
      msgpack: false
    });
});

app.configure('production|development|local', 'master|service|connector|manager|event|worker', function () {
  var EventPlugin = require('pomelo-event-plugin');
  app.use(EventPlugin, {
    event : {
      db : app.get('mysqlClient'),
      eventServerType : 'event',
      listenerDir : app.getBase() + '/app/events',
      emitterConfig : {
        FINISH_GAME: 2, // chơi thắng 1 ván bài bất kì
        LOGIN: 3,
        LOGOUT : 4,
        TOPUP: 7, // nạp tiền
        UPDATE_PROFILE : 8,
        ADD_FRIEND: 10, // kết bạn
        REGISTER: 15 // đăng kí
      },
      dbName : {
        mysql : 'mysqlClient',
        redis : 'redisCache',
        mongodb : 'mongoClient'
      },
      eventConfig : []
    }
  })
});

app.configure('production|development|local', 'game', function () {
  app.filter(pomelo.filters.serial());
  app.filter(pomelo.filters.time());
  app.filter(pomelo.filters.timeout());
  var playerFilter = require('./app/servers/game/filter/playerFilter');
  app.before(playerFilter());
  var server = app.curServer;
  var gameId = server.gameId;
  var Game = require('./app/domain/game/game');
  app.game = new Game({gameId: gameId, serverId: server.id});
});

// config board
app.configure('production|development|local', 'game|district|service|manager|master|worker', function () {
  var BoardService = require('pomelo-board-plugin');
  app.use(BoardService, {
    board : {
      db : app.get('mysqlClient'),
      redis : app.get('redisCache'),
      genBoardAttributes : ['gameId', 'hallId']
    }
  });
});

// config waitingService
app.configure('production|development|local', 'district|connector|game|home', function () {
  var WaitingService = require('pomelo-waiting-plugin');
  app.use(WaitingService, {
    waiting : {
      db : app.get('mysqlClient')
    }
  })
});

// config accountService

app.configure('production|development|local', function () {
  var AccountPlugin = require('pomelo-account-plugin');
  app.use(AccountPlugin, { account : {
    config : app.get('serviceConfig').account,
    redis: app.get('redisCache')
  }})
});

app.configure('production|development', 'home|district|game|connector|service|worker', function () {
  var GameService = require('./app/services/gameService');
  var gameService = new GameService(app);
  gameService.init();
  app.set('gameService', gameService)
});

app.configure('production|development', 'chat|game', function () {
  var ChatService = require('./app/services/chatService');
  app.set('chatService', new ChatService(app));
});

app.configure('production|development', 'manager|game|service|event|worker', function () {
  var PaymentService = require('./app/services/paymentService');
  var paymentService = new PaymentService(app, {});
  app.set('paymentService', paymentService);
});

// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
