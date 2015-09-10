/**
 * Created by vietanha34 on 6/25/15.
 */

/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('CmsCategory', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true
    },
    cateName: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0',
      comment : '1:  thẻ cào, 2: vật phẩm'
    },
    hint : {
      type : DataTypes.STRING,
      allowNull : true
    },
    url : {
      type : DataTypes.STRING,
      allowNull : true
    },
    cateType: {
      type : DataTypes.INTEGER(4),
      defaultValue : '1'
    },
    status: {
      type : DataTypes.INTEGER(4),
      defaultValue : '1'
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    tableName : 'CmsCategory'
  });
};
