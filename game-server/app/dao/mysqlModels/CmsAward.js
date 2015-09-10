/**
 * Created by vietanha34 on 6/25/15.
 */


/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('CmsAward', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0',
      comment: '1:  thẻ cào, 2: vật phẩm'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cate: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    prize: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '1',
      comment: '0: ko hien thi, 1: hien thi'
    }
  }, {
    classMethods: {
      associate: function (models) {
        // associations can be defined here
      }
    },
    tableName: 'CmsAward'
  });
};
