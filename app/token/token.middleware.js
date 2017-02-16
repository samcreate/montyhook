import bluebird from 'bluebird';
import jsonwebtoken from 'jsonwebtoken';
import {secret} from '../../config';

let jwt = bluebird.promisifyAll(jsonwebtoken);

module.exports = validateToken;

function validateToken(req, res, next) {
  let token = req.headers.token
    || req.body.token
    || req.query.token;

  jwt
    .verifyAsync(token, secret)
    .then(decodeToken)
    .catch(invalidToken);

  function decodeToken(token) {
    req.decoded = token;
    next();
  }

  function invalidToken() {
    let message = !token
      ? 'no token provided'
      : 'invalid token';

    return res
      .status(401)
      .json({message});
  }
}
