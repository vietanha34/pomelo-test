/**
 * Created by vietanha34 on 8/12/15.
 */
/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserDetail', {
    uid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true
    },
    topup: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0'
    },
    buyItem: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue : '0'
    },
    bonus : {
      type : DataTypes.BIGINT,
      allowNull: false,
      defaultValue : '0'
    },
    winChip : {
      type : DataTypes.BIGINT,
      allowNull: false,
      defaultValue : '0'
    },
    loseChip : {
      type : DataTypes.BIGINT,
      allowNull: false,
      defaultValue : '0'
    },
    tax : {
      type : DataTypes.BIGINT,
      allowNull: false,
      defaultValue : '0'
    },
    other : {
      type : DataTypes.BIGINT,
      allowNull : false,
      defaultValue : '0'
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        //models.UserDetail.belongsTo(models.User,  { foreignKey : 'uid'});
      }
    }
  });
};
