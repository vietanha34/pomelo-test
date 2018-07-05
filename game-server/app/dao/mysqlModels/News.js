/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('News', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    cate: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      index: true
    },
    title: {
      type: DataTypes.STRING(511),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      defaultValue: 1
    },
    isHot: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      defaultValue: 0
    },
    isNews: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      defaultValue: 0
    },
    langCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'vi'
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    tableName : 'News',
    indexes:[
      {
        fields:["cate","status",'updatedAt']
      }
    ]
  });
};
