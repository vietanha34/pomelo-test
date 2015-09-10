var pomelo = require('pomelo');

process.env.LOGGER_LINE = true; // debug line number
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'cothu-v2');


app.configure('production|development', function () {
  // config db, config module
  app.enable('systemMonitor');
  var onlineUser = require('./app/modules/onlineUser');
  var maintenance = require('./app/modules/maintenance');
  var kickUser = require('./app/modules/kickUser');
  if (typeof app.registerAdmin === 'function'){
    app.registerAdmin(onlineUser, {app: app});
    app.registerAdmin(maintenance, {app: app});
    app.registerAdmin(notify, { app : app});
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
  app.use(dataPlugin, {
    watcher: {
      dir: __dirname + '/config/csv',
      idx: 'id',
      interval: 3000
    }
  });

  var statusPlugin = require('pomelo-status-plugin');
  app.use(statusPlugin, {
    status: {
      host: app.get('redisConfig').cache.host,
      port: app.get('redisConfig').cache.port,
      timeLive: 60,
      db: app.get('redisConfig').cache.db
    }
  });
  app.use(globalChannel, {
    globalChannel: {
      host: redisConfigClient.host,
      port: redisConfigClient.port,
      cleanOnStartUp: true,
      db: redisConfigClient.db       // optinal, from 0 to 15 with default redis configure
    }
  });
  var redisConfig = app.get('redisConfig');
  var redisConfigCache = redisConfig.cache;
  var redisCache = require('redis').createClient(redisConfigCache.port, redisConfigCache.host);
  redisCache.select(redisConfigCache.db);
  app.set('redisCache', redisCache);

  // Đồng bộ mysql
  var models = require('./app/dao/mysqlModels/index');
  var curServer= app.curServer;
  var db = models();
  app.set('mysqlClient', db);
  if (curServer.serverType == 'service') {
    logger.info('Đồng bộ mysql');
    db.sequelize
      .sync()
      .then(function () {
        logger.info('tao bang thanh cong')
      })
      .catch(function (err) {
        logger.error('err : ', err)
      })
  }
});

// app configuration
app.configure('production|development', 'connector|gate', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      useDict : true,
      useProtobuf : false
    });
});

app.configure('production|development', 'master|service|connector|manager', function () {
  var EventPlugin = require('pomelo-event-plugin');
  app.use(EventPlugin, {
    event : {
      db : app.get('mysqlClient'),
      eventServerType : 'service',
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
      eventConfig : app.get('eventConfig')
    }
  })
});

// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});
