'use strict';
module.exports = function(sequelize, DataTypes) {
  var WinesAttributes = sequelize.define('WinesAttributes', {
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
  return WinesAttributes;
};
