
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Item', {
    id: {
      type : DataTypes.INTEGER(8).UNSIGNED,
      primaryKey : true,
      autoIncrement : true
    },
    categoryId: {
      type : DataTypes.INTEGER(8).UNSIGNED,
      allowNull: false
    },
    name: {
      type : DataTypes.STRING(127),
      allowNull: false
    },
    description: {
      type : DataTypes.STRING
    },
    status: {
      type : DataTypes.INTEGER(4).UNSIGNED,
      defaultValue: 1
    },
    image: {
      type : DataTypes.STRING(63)
    },
    vipLevel: {
      type : DataTypes.INTEGER(4).UNSIGNED,
      defaultValue: 0
    },
    isHot: {
      type : DataTypes.INTEGER(4).UNSIGNED,
      defaultValue: 0
    },
    isNew: {
      type : DataTypes.INTEGER(4).UNSIGNED,
      defaultValue: 0
    },
    discount: {
      type : DataTypes.INTEGER(4).UNSIGNED,
      defaultValue: 0
    },
    effect: {
      type : DataTypes.INTEGER(8).UNSIGNED
    },
    price1: {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    price2: {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    price3: {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    rank: {
      type : DataTypes.INTEGER(8).UNSIGNED,
      defaultValue: 0
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    },
    timestamps: false,
    freezeTableName: true,
    tableName: 'Item'
  });
};
