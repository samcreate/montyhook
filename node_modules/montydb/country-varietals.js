'use strict';
module.exports = function(sequelize, DataTypes) {
  var Attributes = sequelize.define('CountryVarietals', {
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here

      }
    }
  });
  return Attributes;
};
