import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import compress from 'compression';
import methodOverride from 'method-override';
import multer from 'multer';
import routes from './routers.js';
import shell from 'shell-arguments';
import {server} from '../config';

let app = express();

app.set('env', shell.env || process.env.NODE_ENV || 'production');
app.set('port', process.env.PORT || server.port);

if (app.get('env') === 'development') {
  app.use(morgan('dev'));
}



app
  .use(compress())
  .use(methodOverride())
  .use(multer().array())
  .use(bodyParser.urlencoded({extended: true}))
  .use(bodyParser.json())
  .use('/', routes.api);


function startServer() {
  app.listen(app.get('port'), logStartServer);

  function logStartServer() {
    if (app.get('env') !== 'test') {
      console.log('> localhost:' + app.get('port'));
    }
  }
}

startServer();
module.exports = app;
