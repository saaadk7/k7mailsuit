const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/pages/popup/index.js',
    options: './src/pages/options/index.js',
    onboarding: './src/pages/onboarding/index.js',
    background: './src/background/index.js',
    content: './src/content/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/pages/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: './src/pages/options/options.html',
      filename: 'options.html',
      chunks: ['options']
    }),
    new HtmlWebpackPlugin({
      template: './src/pages/onboarding/onboarding.html',
      filename: 'onboarding.html',
      chunks: ['onboarding']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: 'public' },
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/icons', to: 'icons' },
        { from: 'src/content/content.css', to: 'content.css' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
