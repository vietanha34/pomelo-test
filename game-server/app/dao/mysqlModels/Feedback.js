/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Feedback', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    uid: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      index: true
    },
    username: {
      type: DataTypes.STRING(31),
      allowNull: true
    },
    toId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    message: {
      type: DataTypes.STRING(511),
      allowNull: true
    },
    image1: {
      type: DataTypes.STRING(31),
      allowNull: true
    },
    image2: {
      type: DataTypes.STRING(31),
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    tableName : 'Feedback',
    createdAt: false,
    updatedAt: false
  });
};
