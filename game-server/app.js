var pomelo = require('pomelo');
var Mongo = require('./app/dao/mongo/mongo');
var path = require('path');
var utils = require('./app/util/utils');
var Promise = require('bluebird');
var consts = require('./app/consts/consts');

Promise.config({
  longStackTraces: true,
  cancellable: true
});

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
  var tournament = require('./app/modules/tournament');
  var globalChannel = require('pomelo-globalchannel-plugin');
  if (typeof app.registerAdmin === 'function') {
    app.registerAdmin(onlineUser, {app: app});
    app.registerAdmin(maintenance, {app: app});
    app.registerAdmin(tournament, {app: app});
    app.registerAdmin(kickUser, {app: app});
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
      .then(function () {
        console.log('create tournament');
        return {};
        return db
          .Tournament
          .bulkCreate([
            {
              tourId: 1,
              name: "Kỳ Vương cờ tướng",
              type: consts.TOUR_TYPE.NORMAL,
              beginTime: '2016-04-13',
              endTime: '2016-04-14',
              numPlayer: 0,
              fee: 5000,
              roundId: 1,
              battleType: 1,
              status: 0,
              tourType: 1,
              rule: 'Cờ tướng: liệt C5'
            },
            {
              tourId: 2,
              name: "Long Môn kì hội thách đấu",
              type: 1,
              beginTime: '2016-04-13',
              endTime: '2016-04-13',
              numPlayer: 2,
              fee: 5000,
              battleType: 1,
              status: 0,
              tourType: 1
            },
            {
              tourId: 3,
              name: "Đả lôi đài",
              type: 2,
              beginTime: '2016-04-13',
              endTime: '2016-04-13',
              numPlayer: 3,
              fee: 5000,
              battleType: 1,
              status: 3,
              roundId: 2,
              tourType: 2
            }
          ])
          .then(function () {
             //setup TourTableConfig
            return [db.TourTableConfig
              .create({
                id : 1,
                gameId : 1,
                totalTime: 300,
                turnTime : 30,
                timeWait : 120000,
                level : 0,
                tourTimeWait : 600000,
                showKill : 1,
                matchPlay : 3,
                mustWin : 1,
                bet : 10000
              }),
              db.TourSchedule
                .create({
                  id : 1,
                  matchTime : ((Date.now() + 60000) / 1000) | 0
                })
              ]
          })
          .spread(function () {
            console.log('create tour round');
            return [
              db.TourRound.bulkCreate([{
              roundId: 1,
              tourId: 1,
              battleType: 1,
              numGroup: 1,
              type: 1,
              scheduleId: 1,
                tableConfigId :1
            },
              {
                roundId: 2,
                tourId: 3,
                battleType: 2,
                numGroup: 1,
                type: 1,
                scheduleId: 2
              }
            ]),
              db.TourGroup.bulkCreate([
                {
                  id : 9,
                  tourId: 3,
                  index: 1,
                  roundId:2,
                  numPlayer: 8,
                  player1: 31,
                  player2: 33,
                  player3: 34,
                  player4: 35,
                  player5: 55,
                  player6: 57,
                  player7: 62,
                  player8: 68,
                  player9: 31,
                  player10: 34,
                  player11: 57,
                  player12: 68,
                  player13: 31,
                  player14: 68,
                  player15: 68
                },
                {
                  id: 1,
                  tourId: 1,
                  index: 1,
                  roundId: 1,
                  numPlayer: 0
                }
                //{
                //  id: 2,
                //  tourId: 1,
                //  index: 2,
                //  roundId: 1,
                //  numPlayer: 0
                //},
                //{
                //  id: 3,
                //  tourId: 1,
                //  index: 3,
                //  roundId: 1,
                //  numPlayer: 0
                //},
                //{
                //  id: 4,
                //  tourId: 1,
                //  index: 4,
                //  roundId: 1,
                //  numPlayer: 0
                //},
                //{
                //  id: 5,
                //  tourId: 1,
                //  index: 5,
                //  roundId: 1,
                //  numPlayer: 0
                //},
                //{
                //  id: 6,
                //  tourId: 1,
                //  index: 6,
                //  roundId: 1,
                //  numPlayer: 0
                //},
                //{
                //  id: 7,
                //  tourId: 1,
                //  index: 7,
                //  roundId: 1,
                //  numPlayer: 0
                //},
                //{
                //  id: 8,
                //  tourId: 1,
                //  index: 8,
                //  roundId: 1,
                //  numPlayer: 0
                //}
              ])
            ]
          })
          .then(function () {
            console.log('fill profile, prize');
            return [db.TourProfile
              .bulkCreate([
                {
                  uid: 31,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 1,
                  groupId: 9
                },
                {
                  uid: 33,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 2,
                  groupId: 9
                },
                {
                  uid: 34,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 3,
                  groupId: 9
                },
                {
                  uid: 35,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 1,
                  groupId: 9
                },
                {
                  uid: 55,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 1,
                  groupId: 9
                },
                {
                  uid: 57,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 1,
                  groupId: 9
                },
                {
                  uid: 62,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 1,
                  groupId: 9
                },
                {
                  uid: 68,
                  tourId: 3,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 1,
                  groupId: 9
                },

                {
                  uid: 461405,
                  tourId: 1,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 1,
                  groupId: 1
                },
                {
                  uid: 5,
                  tourId: 1,
                  win: 0,
                  lose: 0,
                  draw: 0,
                  status: 1,
                  point: 0,
                  rank: 2,
                  groupId: 1
                }
                //{
                //  uid: 6,
                //  tourId: 1,
                //  win: 0,
                //  lose: 0,
                //  draw: 0,
                //  status: 1,
                //  point: 0,
                //  rank: 3,
                //  groupId: 1
                //}
              ]), db.TourPrize.bulkCreate([
              {
                content: '',
                gold: 50000,
                tourId: 1
              },
              {
                content: '',
                gold: 30000,
                tourId: 1
              },
              {
                content: '',
                gold: 20000,
                tourId: 1
              }
            ])]
          })
          .then(function () {
            console.log('create tourTable');
            //return db.TourTable
            //  .bulkCreate([
            //    {
            //      boardId: '123' + Date.now() + Math.random() * (100 - 1) + 1,
            //      tourId: 1,
            //      gameId: 1,
            //      index: 1,
            //      serverId: 'game-server-10',
            //      status: consts.BOARD_STATUS.FINISH,
            //      bet: 1000,
            //      numPlayer: 2,
            //      groupId: 1,
            //      roundId: 1,
            //      match: '6bd936ec-39ca-4892-867c-846b89b0e881,56777f78-b9b9-4c03-b280-8561461d59d7,176e397f-eb1c-4205-bd4a-5b8395ede903',
            //      scheduleId: 1,
            //      score: '0,5 - 0,5',
            //      player: JSON.stringify([
            //        {
            //          fullname: 'Tuấn Anh',
            //          avatar: {id: 0, version: 0},
            //          point: 7,
            //          inBoard: 1
            //        },
            //        {
            //          fullname: 'Việt Anh',
            //          avatar: {id: 0, version: 0},
            //          point: 8,
            //          inBoard: 0
            //        }
            //      ])
            //    }
            //  ])
          })
      })
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

app.configure('production', function () {
  app.set('beta', true);
});

// app configuration
app.configure('production|development', 'connector|gate', function () {
  app.loadConfig('encryptConfig', app.getBase() + '/config/encrypt.json');
  app.set('connectorConfig',
    {
      connector: pomelo.connectors.hybridconnector,
      useDict: true,
      gzip: true,
      useProtobuf: false,
      msgpack: false
    });
});

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

app.configure('production|development|local', 'chat', function () {
  var abuseFilter = require('./app/servers/chat/filter/abuseFilter');
  app.filter(abuseFilter());
});

// config board
app.configure('production|development|local', 'game|district|service|manager|master|worker', function () {
  var BoardService = require('pomelo-board-plugin');
  app.use(BoardService, {
    board: {
      db: app.get('mysqlClient'),
      redis: app.get('redisCache'),
      genBoardAttributes: ['gameId', 'hallId']
    }
  });
});

// config waitingService
app.configure('production|development|local', 'district|connector|game|home', function () {
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

app.configure('production|development', 'home|game|chat', function () {
  var GameService = require('./app/services/gameService');
  var gameService = new GameService(app);
  gameService.init();
  app.set('gameService', gameService)
});

app.configure('production|development', 'chat|game|service', function () {
  var ChatService = require('./app/services/chatService');
  app.set('chatService', new ChatService(app));
});

app.configure('production|development', 'manager|game|service|event|worker|http|tournament', function () {
  var PaymentService = require('./app/services/paymentService');
  var paymentService = new PaymentService(app, {});
  app.set('paymentService', paymentService);
});

app.configure('production|development', 'gate|home|service|event|worker', function () {
  var ConfigService = require('./app/services/configService');
  var configService = new ConfigService(app);
  configService.init();
  app.set('configService', configService)
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
      urlService: 'http://sdk.vgame.us:8888/iploc'
    }
  });
});

app.configure('production|development', 'service|home|event', function () {
  var VideoAdsService = require('./app/services/videoAdsService');
  app.set('videoAdsService', new VideoAdsService(app))
});

app.configure('development|production', function () {
  app.set('maintenance', {
    enable: 1,
    type: consts.MAINTENANCE_TYPE.ALL
  });
});

// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
