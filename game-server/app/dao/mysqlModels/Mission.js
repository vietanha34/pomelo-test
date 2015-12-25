
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Mission', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey : true,
      autoIncrement : true
    },
    name: {
      type: DataTypes.STRING(511),
      allowNull: true
    },
    type: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      defaultValue: 1
    },
    gold: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 0
    },
    exp: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 0
    },
    rank: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      defaultValue: 0
    },
    status: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      defaultValue: 1
    },
    progress: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 1
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    timestamps: false,
    tableName : 'Mission',
    indexes:[
      {
        columns:["status","rank"]
      }
    ]
  });
};
