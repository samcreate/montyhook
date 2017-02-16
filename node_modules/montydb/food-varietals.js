'use strict';
module.exports = function(sequelize, DataTypes) {
  var Attributes = sequelize.define('FoodVarietals', {
    weight: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here

      }
    }
  });
  return Attributes;
};
