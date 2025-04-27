/**
 * Created by vietanha34 on 6/4/16.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('GuildBattle', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    actionId : {
      type : DataTypes.BIGINT
    },
    tourId : {
      type : DataTypes.INTEGER
    },
    guildId1: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    guildId2: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    time : {
      type: DataTypes.DATE
    },
    guildScore1: {
      type : DataTypes.FLOAT,
      defaultValue: 0
    },
    guildScore2: {
      type : DataTypes.FLOAT,
      defaultValue : 0
    },
    allow : {
      type : DataTypes.INTEGER(4)
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
