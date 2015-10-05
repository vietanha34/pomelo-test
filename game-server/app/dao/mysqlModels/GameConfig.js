/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('GameConfig', {
    gameId: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    numSlot: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '4'
    },
    maxPlayer: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '4'
    },
    minPlayer: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '2'
    },
    autoStart: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '1'
    },
    minBuyIn: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    maxBuyIn: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    turnTime: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '15000'
    },
    minBet: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    maxBet: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    bet: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  },{
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    createdAt: false,
    updatedAt: false
  });
};
