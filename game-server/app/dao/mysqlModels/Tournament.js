/**
 * Created by vietanha34 on 3/25/16.
 */
var consts = require('../../consts/consts');


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Tournament', {
    tourId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    name : {
      type : DataTypes.STRING,
      allowNull : false
    },
    type : {
      type : DataTypes.INTEGER
    },
    beginTime : {
      type : DataTypes.DATEONLY,
      allowNull: true
    },
    endTime : {
      type : DataTypes.DATEONLY,
      allowNull: true
    },
    numPlayer: {
      type: DataTypes.INTEGER,
      defaultValue : 0
    },
    fee : {
      type : DataTypes.INTEGER
    },
    registerTime : {
      type: DataTypes.DATE
    },
    status : {
      type : DataTypes.INTEGER,
      defaultValue : consts.TOUR_STATUS.PRE_START
    },
    tourType: {
      type: DataTypes.INTEGER
    },
    icon : {
      type: DataTypes.STRING
    },
    roundId : {
      type: DataTypes.INTEGER
    },
    prevRoundId: {
      type: DataTypes.INTEGER
    },
    champion: {
      type: DataTypes.TEXT,
      comment : 'champion'
    },
    rule: {
      type: DataTypes.STRING
    },
    fund : {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Số tiền góp quỹ giải thưởng'
    },
    resultString: {
      type: DataTypes.STRING
    },
    numMatch : {
      type: DataTypes.INTEGER
    },
    numBoard : {
      type : DataTypes.INTEGER
    },
    guildName1 : {
      type : DataTypes.STRING
    },
    guildName2 : {
      type : DataTypes.STRING
    },
    info: {
      type : DataTypes.TEXT
    },
    schedule : {
      type : DataTypes.TEXT
    }
  }, {
    classMethods: {
      associate: function(models) {
        //models.Tournament.hasMany(models.TourPrize, {foreignKey : 'tourId', as : 'Prize'});
        models.Tournament.hasOne(models.TourRound, { foreignKey : 'roundId', targetKey : 'roundId'});
      }
    }
  });
};
