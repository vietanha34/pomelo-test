var consts = require('../../consts/consts');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Achievement', {
    uid : {
      type : DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      primaryKey : true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique : true
    },
    userCount: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    tuongWin: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    tuongDraw: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    tuongLose: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    tuongElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    theWin: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    theDraw: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    theLose: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    theElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    upWin: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    upDraw: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    upLose: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    upElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    vayWin: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    vayDraw: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    vayLose: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    vayElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    caroWin: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    caroDraw: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    caroLose: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    caroElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    vuaWin: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    vuaDraw: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    vuaLose: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      defaultValue: '0'
    },
    vuaElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
