/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Board', {
    table_id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ''
    },
    bet: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    turn_time: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    num_player: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    max_player: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    lock: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    server_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    level: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    max_buy_in: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    min_buy_in: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    stt: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    min_money_length: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    max_money_length: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    slot: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_full: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    game_type: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '2'
    },
    limit_pot: {
      type : DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue : '2'
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    createdAt: false,
    updatedAt: false,
    tableName : 'Board'
  });
};
