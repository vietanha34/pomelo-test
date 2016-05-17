/**
 * Created by vietanha34 on 5/5/16.
 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('TourFund', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    uid : {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    tourId : {
      type : DataTypes.INTEGER,
      allowNull: false
    },
    gold: {
      type: DataTypes.INTEGER
    }
  }, {
    classMethods: {
      associate: function(models) {
        models.TourFund.belongsTo(models.User, { foreignKey : 'uid'});
      }
    }
  });
};
