/**
 * Created by vietanha34 on 7/7/15.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AccUserOnline', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    userId : {
      type : DataTypes.INTEGER,
      allowNull : false
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    platform: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ip : {
      type : DataTypes.STRING,
      allowNull : true
    },
    version : {
      type : DataTypes.STRING,
      allowNull : true
    },
    loginTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    boardId : {
      type : DataTypes.STRING,
      allowNull : true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
