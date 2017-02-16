import gulp from 'gulp';
import nodemon from 'gulp-nodemon';
import {nodemon as options} from './config.js';

gulp.task('nodemon', nodemonTask);

function nodemonTask(callback) {
  let started = false;

  nodemon(options).on('start', setStartedStatus);

  function setStartedStatus() {
    if (!started){
      callback();
      started = true;
    }
  }
}
