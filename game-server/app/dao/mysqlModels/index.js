/**
 * Created by vietanha34 on 4/1/15.
 */

"use strict";
var pomelo = require('pomelo');
var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");

module.exports = function(config) {
  var db        = {};
  var mysqlConfig = config || pomelo.app.get('mysqlConfig');
  var sequelize = new Sequelize(mysqlConfig.database, mysqlConfig.username, mysqlConfig.password, mysqlConfig);
  fs
    .readdirSync(__dirname)
    .filter(function(file) {
      return (file.indexOf(".") !== 0) && (file !== "index.js");
    })
    .forEach(function(file) {
      console.log('file : ', file)
      var model = sequelize["import"](path.join(__dirname, file));
      db[model.name] = model;
    });

  Object.keys(db).forEach(function(modelName) {
    if ("associate" in db[modelName]) {
      db[modelName].associate(db);
    }
  });

  db.sequelize = sequelize;
  db.Sequelize = Sequelize;
  return db
};




