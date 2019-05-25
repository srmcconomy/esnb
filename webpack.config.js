const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/server.ts',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  target: 'node',
  node: {
    __dirname: false,
  },
  externals: nodeExternals(),
  context: __dirname,
  devtool: process.env.production ? false : 'eval-source-map',
  mode: process.env.production ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/env',
                {
                  targets: { node: 'current' },
                  modules: false,
                },
              ],
              '@babel/typescript',
            ],
            plugins: [
              '@babel/syntax-dynamic-import',
            ],
          },
        },
      },
      {
        test: /\.ejs$/,
        use: 'raw-loader',
      },
      {
        test: /\.otf$/,
        use: {
          loader: 'file-loader',
          options: {
            outputPath: 'assets',
          },
        },
      },
      {
        test: /\.svg$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].svg',
            outputPath: 'assets/flags',
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  stats: {
    colors: true,
  },
};
