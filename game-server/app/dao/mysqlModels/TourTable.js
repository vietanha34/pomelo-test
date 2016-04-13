/**
 * Created by vietanha34 on 4/11/16.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourTable', {
    boardId : {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey : true
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
      type: DataTypes.INTEGER
    },
    serverId : {
      type: DataTypes.STRING
    },
    status : {
      type: DataTypes.INTEGER
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
    }
  }, {
    classMethods: {
      associate: function(models) {
        models.TourProfile.belongsTo(models.User, { foreignKey : 'uid'});
      }
    }
  });
};
