import SmoochCore from 'smooch-core';

/**
 * Yields a test app user, creates one if necessary.
 */
function getOrCreateUser(smooch, uid) {
  console.log('getOrCreateUser')
  return smooch.appUsers.get(uid)
    .catch((err) => {
      if (!err.response || err.response.status !== 404) {
        throw err;
      }
      console.log('getOrCreateUser create',uid)
      smooch.appUsers.create(uid, {
        givenName: 'Dart Master',
      }).then((res)=>{
        console.log('user created; ', res)
      })
      .catch((err)=>{console.log('err')})
    })
    .then((response) => {
      console.log('getOrCreateUser return',response)
      return response;
    })
}

/**
 * Creates an app user and sends a test message using the retrieved token
 */
module.exports.sendTestMessage = function(uid) {
  console.log('sendTestMessage')
  let appUser;
  const smooch = new SmoochCore({
    appToken: 'ce28ku6ecg2jnop36l2pzwiyv',
  });
  console.log('sendTestMessage')
  return getOrCreateUser(smooch,uid)
    .then((response) => {
      console.log(response)
      appUser = response.appUser;
      return smooch.appUsers.sendMessage(appUser.userId, {
        text: 'You\'ve successfully integrated Shoplifter!',
        role: 'appUser',
      });
    })
    .then((res) => {
      console.log(res)
      return appUser;
    });
}
