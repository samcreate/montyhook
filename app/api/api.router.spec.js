import helper from '../../test/helper.js';
import app from '../index.js';
import chai from 'chai';
import chaiHttp from 'chai-http';
import {request, expect} from 'chai';

chai.use(chaiHttp);

describe('API', function() {
  describe('not found - GET /chiforimfola', function() {
    it('no token provided', function(done) {
      request(app)
        .get('/chiforimfola')
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'no token provided');
          done();
        });
    });

    it('invalid token', function(done) {
      request(app)
        .get('/chiforimfola')
        .set('token', helper.user.invalidToken)
        .end(function(err, res) {
          expect(res.statusCode).to.be.equal(401);
          expect(res.body).to.have.property('message', 'invalid token');
          done();
        });
    });

    it('404 not found', function(done) {
      request(app)
        .get('/chiforimfola')
        .set('token', helper.user.token)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(404);
          expect(res.body).to.have.property('message', 'resource not found :(');
          done();
        });
    });
  });
});
