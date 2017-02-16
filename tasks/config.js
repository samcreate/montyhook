module.exports = {
  lint: [
    './gulpfile.js',
    './tasks/*.js',
    './test/**/*.js',
    './app/**/*.js',
    './config.js',
  ],
  controllers: './app/**/*.controller.js',
  apiDocs: {
    src: 'app/',
    dest: './docs',
    debug: true,
    // parse: true,
    silent: true,
    includeFilters: ['\\.js$'],
  },
  nodemon: {
    script: 'app/index.js',
    quiet: true,
    ext: 'js',
    ignore: [
      './docs',
    ],
    env: {
      ENV: 'development',
    },
  },
};
