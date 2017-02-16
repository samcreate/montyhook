'use strict';
module.exports = function(sequelize, DataTypes) {
  var GeneralMedia = sequelize.define('GeneralMedia', {
    filename: DataTypes.STRING,
    type: {
      type: DataTypes.ENUM,
      values: ['image', 'video', 'audio', 'file']
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return GeneralMedia;
};
