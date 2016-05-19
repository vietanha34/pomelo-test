
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AdsConfig', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    platform: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: false
    },
    location: {
      type: DataTypes.STRING(7),
      allowNull: false
    },
    gold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    limit: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    wait: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    tableName : 'AdsConfig',
    indexes:[
      {
        unique: true,
        fields: ['platform', 'location']
      }
    ]
  });
};
