/**
 * Created by vietanha34 on 6/25/15.
 */


/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('LogBuyAward', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement : true
    },
    userId : {
      type : DataTypes.INTEGER(11)
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    awardId : {
      type : DataTypes.INTEGER,
      allowNull : false
    },
    chip: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    serial: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    cardCode: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    id_admin1: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    id_admin2: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '1',
      comment: '1: chờ duyệt, 2: đã duyệt , 3 : đã huỷ'
    }
  }, {
    classMethods: {
      associate: function (models) {
        // associations can be defined here
        models.LogBuyAward.belongsTo(models.CmsAward, { foreignKey : 'awardId'});
        models.LogBuyAward.belongsTo(models.AccUser, { foreignKey : 'userId'});
      }
    }
  });
};
