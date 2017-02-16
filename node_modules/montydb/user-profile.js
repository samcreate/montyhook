'use strict';
module.exports = function(sequelize, DataTypes) {
  var UserProfile = sequelize.define('UserProfile', {}, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return UserProfile;
};
