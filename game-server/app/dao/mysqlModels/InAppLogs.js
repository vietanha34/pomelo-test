
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('InAppLog', {
    signedRequest: {
      type : DataTypes.STRING(150),
      primaryKey : true,
    },
    paymentId: {
      type : DataTypes.STRING(100),
      allowNull: true
    },
    productId: {
      type : DataTypes.STRING(100),
      allowNull: false
    },
    purchaseTime: {
      type : DataTypes.INTEGER
    },
    purchaseToken: {
      type : DataTypes.STRING(100),
    },
    uid: {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    issuedAt: {
      type : DataTypes.INTEGER,
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    },
  });
};
