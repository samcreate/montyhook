import gulp from 'gulp';
import apiDoc from 'gulp-apidoc';
import {apiDocs as options} from './config.js';

gulp.task('apiDocs', apiDocsTask);

function apiDocsTask(done) {
  apiDoc(options, done);
}
