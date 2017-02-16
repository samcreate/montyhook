import {users, webhook} from '../controllers.js';
import {id, token} from '../middlewares.js';
import {Router} from 'express';

const router = Router();

router.param('id', id);

router
  .route('/users/authentication')
  .post(users.authenticate);


router
  .route('/apiai-webhook')
  .get(webhook.test)
  .post(webhook.router);

router
  .route('/users/:id')
  .get(users.single)
  .put(users.update)
  .delete(users.remove);

router.use(resourceNotFound);

function resourceNotFound(req, res) {
  let message = 'resource not found :(';
  res
    .status(404)
    .json({message});
}

module.exports = router;
