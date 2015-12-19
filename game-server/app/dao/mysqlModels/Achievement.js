var consts = require('../../consts/consts');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Achievement', {
    uid : {
      type : DataTypes.INTEGER.UNSIGNED,
      primaryKey : true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique : true
    },
    userCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    tuongWin: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    tuongDraw: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    tuongLose: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    tuongGiveUp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    tuongElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    tuongXp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    theWin: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    theDraw: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    theLose: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    theGiveUp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    theElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    theXp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    upWin: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    upDraw: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    upLose: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    upGiveUp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    upElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    upXp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    vayWin: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vayDraw: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vayLose: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vayGiveUp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vayElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    vayXp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    caroWin: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    caroDraw: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    caroLose: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    caroGiveUp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    caroElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    caroXp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    vuaWin: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vuaDraw: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vuaLose: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vuaGiveUp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: '0'
    },
    vuaElo: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    },
    vuaXp: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: consts.DEFAULT_ELO
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.Achievement.belongsTo(models.User,  { foreignKey : 'uid'});
      }
    }
  });
};
