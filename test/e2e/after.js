let Users = require('../../app/users/users.model.js');

after(removeUsers);

function removeUsers(done) {
  Users
    .remove({})
    .then(function() {
      done();
    });
}
