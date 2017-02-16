import gulp from 'gulp';
import {lint as scripts} from './config.js';
import eslint from 'gulp-eslint';
import gutil from 'gulp-util';

gulp.task('lint', lintTask);

function lintTask() {
  return gulp
    .src(scripts)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .on('error', () => gutil.beep());
}
