const pomelo = require('pomelo');
const Mongo = require('./app/dao/mongo/mongo');
const path = require('path');
const utils = require('./app/util/utils');
const Promise = require('bluebird');
const consts = require('./app/consts/consts');

Promise.config({
  longStackTraces: true,
  cancellable: true
});

process.env.LOGGER_LINE = true; // debug line number
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Init app for client.
 */
const app = pomelo.createApp();
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
  var tournament = require('./app/modules/tournament');
  var setBoard = require('./app/modules/setBoard');
  var globalChannel = require('pomelo-globalchannel-plugin');
  if (typeof app.registerAdmin === 'function') {
    app.registerAdmin(onlineUser, {app: app});
    app.registerAdmin(maintenance, {app: app});
    app.registerAdmin(tournament, {app: app});
    app.registerAdmin(kickUser, {app: app});
    app.registerAdmin(setBoard, {app: app});
  }
  app.loadConfig('redisConfig', app.getBase() + '/config/redis.json');
  app.loadConfig('mongoConfig', app.getBase() + '/config/mongo.json');
  app.loadConfig('mysqlConfig', app.getBase() + '/config/mysqlClient.json');
  app.loadConfig('gameConfig', app.getBase() + '/config/game.json');
  app.loadConfig('serviceConfig', app.getBase() + '/config/externalService.json');
  app.loadConfig('eventConfig', app.getBase() + '/config/eventConfig.json');
  app.loadConfig('emitterConfig', app.getBase() + '/config/emitterConfig.json');
  var dataPlugin = require('pomelo-data-plugin-ex');
  var redisConfig = app.get('redisConfig');
  var redisConfigCache = redisConfig.cache;
  app.use(dataPlugin, {
    watcher: {
      dir: __dirname + '/config/csv',
      idx: 'id',
      interval: 30000,
      nameRow: 1,
      typeRow: 2,
      ignoreRows: [3],
      indexColumn: 1
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
  var curServer = app.curServer;
  var db = models();
  app.set('mongoClient', Mongo(utils.merge_options({schemaDir: path.join(app.getBase(), '/app/dao/mongoSchema/')}, app.get('mongoConfig'))))
  app.set('mysqlClient', db);
  if (curServer.serverType === 'manager') {
    db.sequelize
      .sync()
      .catch(function (err) {
        console.error('sync err : ', err)
      })
  }
  else if (curServer.id === 'home-server-1') {
    var ccuPlugin = require('pomelo-ccu-plugin');
    app.use(ccuPlugin, {
      ccu: {
        redis: app.get('redisCache'),
        username: 'monitor',
        password: 'monitor',
        middleware: utils.getGameIdUser
      }
    })
  }
});

// app.configure('production|development', 'district', function () {
//   var DistrictManager = require('./app/domain/district/districtManager');
//   var districtManager = new DistrictManager(app);
// });

app.configure('production', function () {
  app.set('beta', true);
});

app.configure('production|development', 'master', function () {
  var AutoRestart = require('pomelo-autoRestart-plugin');
  app.use(AutoRestart,  {
    auto: {
      username: 'admin',
      password: 'admin',
      condition:{
        service: {
          memory: 500,
          restart: true
        },
        district: {
          memory : 500,
          restart: true
        },
        event: {
          memory: 500,
          restart: true
        },
        manager: {
          memory: 500,
          restart: true
        },
        auth: {
          memory : 500,
          restart: true
        }
      }
    }
  });
});
// app configuration connector
app.configure('production|development', 'connector|gate', function () {
  app.loadConfig('encryptConfig', app.getBase() + '/config/encrypt.json');
  app.set('maintenance', {
    enable: 1,
    type: consts.MAINTENANCE_TYPE.ALL
  });
  app.set('connectorConfig',
    {
      connector: pomelo.connectors.hybridconnector,
      useDict: true,
      gzip: true,
      useProtobuf: false,
      msgpack: false
    });
});

// config eventplugin
app.configure('production|development|local', 'master|service|connector|manager|event|worker', function () {
  var EventPlugin = require('pomelo-event-plugin');
  app.use(EventPlugin, {
    event: {
      db: app.get('mysqlClient'),
      eventServerType: 'event',
      listenerDir: app.getBase() + '/app/events',
      emitterConfig: {
        FINISH_GAME: 2, // chơi thắng 1 ván bài bất kì
        LOGIN: 3,
        LOGOUT: 4,
        TOPUP: 7, // nạp tiền
        UPDATE_PROFILE: 8,
        ADD_FRIEND: 10, // kết bạn
        REGISTER: 15 // đăng kí
      },
      dbName: {
        mysql: 'mysqlClient',
        redis: 'redisCache',
        mongodb: 'mongoClient'
      },
      eventConfig: []
    }
  })
});

// config chat abuse
app.configure('production|development|local', 'chat', function () {
  var abuseFilter = require('./app/servers/chat/filter/abuseFilter');
  app.filter(abuseFilter());
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
  app.game = new Game({gameId: gameId, serverId: server.id, base: server.base});
});

// config board
app.configure('production|development|local', 'game|district|service|manager|master|worker|connector|home', function () {
  var BoardService = require('pomelo-board-plugin');
  app.use(BoardService, {
    board: {
      db: app.get('mysqlClient'),
      redis: app.get('redisCache'),
      genBoardAttributes: ['gameId', 'hallId', 'gameType', 'roomId']
    }
  });
});

// config waitingService
app.configure('production|development|local', 'district|connector|game|home|worker', function () {
  var WaitingService = require('pomelo-waiting-plugin');
  app.use(WaitingService, {
    waiting: {
      db: app.get('mysqlClient')
    }
  })
});

// config accountService
app.configure('production|development|local', function () {
  var AccountPlugin = require('pomelo-account-plugin');
  app.use(AccountPlugin, {
    account: {
      config: app.get('serviceConfig').account,
      redis: app.get('redisCache')
    }
  })
});

app.configure('production|development', 'home|game|chat|service', function () {
  var GameService = require('./app/services/gameService');
  var gameService = new GameService(app);
  gameService.init();
  app.set('gameService', gameService)
});

app.configure('production|development', 'chat|game|service|event', function () {
  var ChatService = require('./app/services/chatService');
  app.set('chatService', new ChatService(app));
});

app.configure('production|development', 'manager|game|service|event|worker|http|tournament', function () {
  var PaymentService = require('./app/services/paymentService');
  var paymentService = new PaymentService(app, {});
  app.set('paymentService', paymentService);
});

app.configure('production|development', 'gate|home|service|event|worker|manager', function () {
  var ConfigService = require('./app/services/configService');
  var configService = new ConfigService(app);
  configService.init();
  app.set('configService', configService)
});

app.configure('production|development', 'tournament|service|game', function () {
  var TourManager = require('./app/domain/tournament/tourManager');
  var tourManager = new TourManager({
    app : app,
    serverType : 'tournament'
  });
  app.set('tourManager', tourManager);
});

app.configure('production|development', 'worker', function () {
  var HttpServer = require('./app/util/httpServer');
  var httpServer = new HttpServer(app, {
    routePath: app.getBase() + '/app/http'
  });
  app.set('httpServer', httpServer);
});

app.configure('production|development', 'event', function () {
  var geoIpPlugin = require('pomelo-geoip-plugin');
  app.use(geoIpPlugin, {
    geoip: {
      urlService: 'http://123.30.235.49:5688/query'
    }
  });
});

app.configure('production|development', 'service|home|event', function () {
  var VideoAdsService = require('./app/services/videoAdsService');
  app.set('videoAdsService', new VideoAdsService(app))
});

//app.configure('development|production', function () {
//  app.set('maintenance', {
//    enable: 1,
//    type: consts.MAINTENANCE_TYPE.ALL
//  });
//});

// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
