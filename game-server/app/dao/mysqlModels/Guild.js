/**
 * Created by vietanha34 on 1/19/16.
 */


/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Guild', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    acronym: {
      type: DataTypes.STRING,
      allowNull: true
    },
    detail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gold: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue : 0
    },
    avatar:{
      type : DataTypes.STRING,
      allowNull: true,
      comment: 'avatar của hội quán'
    },
    fame : {
      type: DataTypes.INTEGER
    },
    level : {
      type: DataTypes.INTEGER
    },
    numPlayer : {
      type: DataTypes.INTEGER
    },
    maxPlayer : {
      type : DataTypes.INTEGER
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
};
