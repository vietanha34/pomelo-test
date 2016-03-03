
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserItem', {
    uid: {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    itemId: {
      type : DataTypes.INTEGER(6).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    updatedAt: {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    expiredAt: {
      type : DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    }
  }, {
    classMethods: {
      associate: function(models) {
      }
    },
    timestamps: false,
    paranoid: false,
    freezeTableName: true,
    tableName: 'UserItem',
    indexes:[
      {
        fields:["uid","itemId"]
      }
    ]
  });
};
