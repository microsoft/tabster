const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = {
    mode: 'development',

    entry: path.resolve(__dirname, 'src/index.ts'),

    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },

    devtool: 'source-map',

    devServer: {
        port: 8080,
        contentBase: path.join(__dirname, 'dist'),
        writeToDisk: true,
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin()],
    },
    stats: {
        errorDetails: true,
    },

    module: {
        rules: [
            // TODO replace with babel loader, this project really doesn't need to care about types
            { test: /\.ts?$/, loader: 'ts-loader' },
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
        ],
    },

    plugins: [
        new webpack.DefinePlugin({
            __DEV__: true,
        }),
        new HtmlWebpackPlugin({ title: 'Tabster Test' }),
        new CopyPlugin({
            patterns: [{ from: 'public' }],
        }),
    ],
};
