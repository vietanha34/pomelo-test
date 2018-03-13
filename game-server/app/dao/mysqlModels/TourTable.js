/**
 * Created by vietanha34 on 4/11/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourTable', {
    boardId : {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey : true,
      comment: 'Id của bàn chơi'
    },
    tourId : {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gameId : {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    index: {
      type: DataTypes.INTEGER,
      comment: 'index của bàn'
    },
    serverId : {
      type: DataTypes.STRING
    },
    stt : {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue : 0,
      comment: 'trạng thái của bàn'
    },
    bet : {
      type: DataTypes.INTEGER
    },
    numPlayer : {
      type: DataTypes.INTEGER
    },
    groupId: {
      type: DataTypes.INTEGER
    },
    roundId : {
      type: DataTypes.INTEGER
    },
    scheduleId : {
      type: DataTypes.INTEGER
    },
    score: {
      type: DataTypes.STRING,
      defaultValue : '0 - 0',
      comment: 'score'
    },
    win : {
      type: DataTypes.STRING,
      defaultValue : '0 - 0'
    },
    draw : {
      type: DataTypes.STRING,
      defaultValue : '0 - 0'
    },
    lose :{
      type: DataTypes.STRING,
      defaultValue : '0 - 0'
    },
    match: {
      type: DataTypes.STRING
    },
    player1: {
      type: DataTypes.INTEGER
    },
    player2: {
      type: DataTypes.INTEGER
    },
    player: {
      type: DataTypes.TEXT
    },
    winner : {
      type: DataTypes.INTEGER
    },
    result : {
      type : DataTypes.INTEGER(4),
      defaultValue : 0
    },
    fameDelta1: {
      type: DataTypes.INTEGER(4),
      defaultValue: 0
    },
    fameDelta2: {
      type: DataTypes.INTEGER(4),
      defaultValue: 0
    },
    famePunish1: {
      type: DataTypes.INTEGER(4),
      defaultValue: 0
    },
    famePunish2: {
      type: DataTypes.INTEGER(4),
      defaultValue: 0
    },
    calPoint: {
      type: DataTypes.INTEGER(4),
      defaultValue : 0
    },
    matchTime : {
      type : DataTypes.DATE
    }
  }, {
    classMethods: {
      associate: function(models) {
        models.TourProfile.belongsTo(models.User, { foreignKey : 'uid'});
      }
    }
  });
};
