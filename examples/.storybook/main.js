const path = require('path');
const webpack = require('webpack');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = {
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [],
  webpackFinal: async (config, type) => {
    config.resolve.plugins.push(new TsconfigPathsPlugin({ extensions: config.resolve.extensions }));

    const isDev = (process.env.NODE_ENV !== 'production');

    config.plugins.push(new webpack.DefinePlugin({
      __DEV__: JSON.stringify(isDev),
    }));

    return config;
  }
}
