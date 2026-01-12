const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production',
  target: 'electron-renderer',
  entry: './src/renderer/renderer.js',
  output: {
  path: path.resolve(__dirname, 'dist/renderer'),
  filename: 'renderer.js',
  publicPath: './'
},
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html'
    })
  ]
};