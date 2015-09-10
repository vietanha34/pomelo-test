/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('ChargingConfig', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true
    },
    distributorId: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0'
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'sms'
    },
    syntax: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'sms'
    },
    platform: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    type: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: 0
    },
    bundleId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rank: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    vnd: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    chip: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '1'
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
