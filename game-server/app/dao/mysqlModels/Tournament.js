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
    battleType : {
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
    first: {
      type: DataTypes.INTEGER,
      comment : 'uid của người dẫn đầu'
    },
    second: {
      type: DataTypes.INTEGER,
      comment : 'uid của người đứng thứ 2'
    },
    third: {
      type: DataTypes.INTEGER,
      comment : 'uid của người đứng thứ 3'
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
    }
  }, {
    classMethods: {
      associate: function(models) {
        //models.Tournament.hasMany(models.TourPrize, {foreignKey : 'tourId', as : 'Prize'});
        //models.Tournament.hasOne(models.TourRound, { foreignKey : 'roundId', as : 'Round'});
      }
    }
  });
};
