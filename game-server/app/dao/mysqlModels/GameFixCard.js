/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('FixCard', { 
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
    },
    gameId: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    card: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '1'
    }
  },{
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    createdAt: false,
    updatedAt: false,
    tableName : 'FixCard'
  });
};
