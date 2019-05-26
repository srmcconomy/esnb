const webpack = require('webpack');

function watch() {
  webpack(require('./webpack.config'))
    .watch({}, (err, stats) => {
      err && console.log(err);
      console.log(stats.toString({ colors: true }));
    });
}

function build() {
  webpack(require('./webpack.config')).run();
}

switch (process.argv[2]) {
  case 'build':
    build();
    break;
  case 'watch':
    watch();
    break;
  default:
    throw new Error('invalid argument');
}
