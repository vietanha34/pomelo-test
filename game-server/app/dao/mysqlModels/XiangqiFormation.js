/**
 * Created by vietanha34 on 11/2/15.
 */


module.exports = function(sequelize, DataTypes) {
  return sequelize.define('XiangqiFormation', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    rank : {
      type : DataTypes.INTEGER,
      allowNull: false
    },
    fen : {
      type : DataTypes.STRING,
      allowNull: false
    },
    name : {
      type : DataTypes.STRING,
      allowNull: true,
      defaultValue : '0'
    },
    description : {
      type : DataTypes.STRING,
      allowNull: true,
      defaultValue : '0'
    },
    win : {
      type : DataTypes.INTEGER(4)
    },
    numMoves : {
      type : DataTypes.INTEGER
    },
    status : {
      type : DataTypes.INTEGER(4),
      defaultValue : '1'
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    }
  });
};
