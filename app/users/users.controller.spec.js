import helper from '../../test/helper.js';
import app from '../index.js';
import chai from 'chai';
import chaiHttp from 'chai-http';
import {request, expect} from 'chai';
import faker from 'faker';

chai.use(chaiHttp);

describe('Users', function() {
  describe('.authenticate - POST /users/authentication', function() {
    it('authentication failed', function(done) {
      request(app)
        .post('/users/authentication')
        .set('token', helper.user.token)
        .field('email', helper.user.email)
        .field('password', helper.user.invalidPassword)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'authentication failed');
          done();
        });
    });

    it('authentication success', function(done) {
      request(app)
        .post('/users/authentication')
        .set('token', helper.user.token)
        .field('email', helper.user.email)
        .field('password', helper.user.password)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('id', helper.user._id.toString());
          expect(res.body).to.have.property('token');
          done();
        });
    });
  });

  describe('.list - GET /users', function() {
    it('no token provided', function(done) {
      request(app)
        .get('/users')
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'no token provided');
          done();
        });
    });

    it('invalid token', function(done) {
      request(app)
        .get('/users')
        .set('token', helper.user.invalidToken)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'invalid token');
          done();
        });
    });

    it('list users', function(done) {
      request(app)
        .get('/users')
        .set('token', helper.user.token)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.be.instanceOf(Array);
          done();
        });
    });
  });

  describe('.create - POST /users', function() {
    it('no token provided', function(done) {
      request(app)
        .post('/users')
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'no token provided');
          done();
        });
    });

    it('invalid token', function(done) {
      request(app)
        .post('/users')
        .field('token', helper.user.invalidToken)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'invalid token');
          done();
        });
    });

    xit('invalid fields', function(done) {
      request(app)
        .post('/users')
        .set('token', helper.user.token)
        .field('test', 'true')
        .field('password', faker.internet.password())
        .end(function(err, res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.have.property('password');
          expect(res.body).to.have.property('email');
          done();
        });
    });

    it('create an user', function(done) {
      request(app)
        .post('/users')
        .set('token', helper.user.token)
        .field('test', 'true')
        .field('email', faker.internet.email())
        .field('password', faker.internet.password())
        .end(function(err, res) {
          expect(res.statusCode).to.equal(201);
          expect(res.body).to.have.property('id');
          done();
        });
    });
  });

  describe('.single - GET /users/:id', function() {
    it('no token provided', function(done) {
      request(app)
        .get(`/users/${helper.user._id}`)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'no token provided');
          done();
        });
    });

    it('invalid token', function(done) {
      request(app)
        .get(`/users/${helper.user._id}?token=${helper.user.invalidToken}`)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'invalid token');
          done();
        });
    });

    it('not found', function(done) {
      request(app)
        .get(`/users/${helper.user._id.toString().replace(/^.{2}/, 'dd')}`)
        .set('token', helper.user.token)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(204);
          expect(res.body).to.deep.equal({});
          done();
        });
    });

    it('invalid id', function(done) {
      request(app)
        .get('/users/:id'.replace(':id', '123'))
        .set('token', helper.user.token)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.have.property('message', 'invalid id');
          done();
        });
    });

    it('get an user', function(done) {
      request(app)
        .get(`/users/${helper.user._id.toString()}`)
        .set('token', helper.user.token)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('_id', helper.user._id.toString());
          expect(res.body).to.have.property('email', helper.user.email);
          expect(res.body).to.have.property('createdAt');
          expect(res.body).to.not.have.property('password');
          expect(res.body).to.not.have.property('__v');
          done();
        });
    });
  });

  describe('.update - PUT /users/:id', function() {
    it('no token provided', function(done) {
      request(app)
        .put(`/users/${helper.user._id}`)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'no token provided');
          done();
        });
    });

    it('invalid token', function(done) {
      request(app)
        .put(`/users/${helper.user._id}`)
        .field('token', helper.user.invalidToken)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'invalid token');
          done();
        });
    });

    it('update an user', function(done) {
      request(app)
        .put(`/users/${helper.user._id}`)
        .set('token', helper.user.token)
        .field('email', 'darlanmendonca@gmail.com')
        .end(function(err, res) {
          expect(res.statusCode).to.equal(204);
          expect(res.body).to.be.empty;
          done();
        });
    });
  });

  describe('.delete - DELETE /users/:id', function() {
    it('no token provided', function(done) {
      request(app)
        .delete(`/users/${helper.user._id}`)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'no token provided');
          done();
        });
    });

    it('invalid token', function(done) {
      request(app)
        .delete(`/users/${helper.user._id}`)
        .field('token', helper.user.invalidToken)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(401);
          expect(res.body).to.have.property('message', 'invalid token');
          done();
        });
    });

    it('delete an user', function(done) {
      request(app)
        .delete(`/users/${helper.user._id}`)
        .set('token', helper.user.token)
        .end(function(err, res) {
          expect(res.statusCode).to.equal(204);
          expect(res.body).to.be.empty;
          done();
        });
    });
  });
});
