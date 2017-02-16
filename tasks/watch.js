import gulp from 'gulp';
import {lint, controllers} from './config.js';

gulp.task('watch', watchTask);

function watchTask() {
  gulp.watch(lint, ['lint']);
  gulp.watch(controllers, ['apiDocs']);
}
