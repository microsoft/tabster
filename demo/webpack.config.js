const webpack = require('webpack');
const TerserPlugin = require("terser-webpack-plugin");

const isDev = (process.env.NODE_ENV !== 'production');

module.exports = {
    mode: isDev ? 'development' : 'production',

    entry: './src/demo.tsx',

    output: {
        filename: 'bundle.js',
        path: __dirname + '/dist'
    },

    devtool: 'source-map',

    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json']
    },
    stats: {
        errorDetails:true
    },

    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'ts-loader' },
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' }
        ]
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: isDev ? '"development"' : '"production"'
            },
            '__DEV__': isDev
        })
    ],

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    compress: {
                        passes: 2,
                        pure_getters: true,
                    },
                    mangle: !isDev,
                    output: {
                        beautify: isDev,
                        comments: isDev,
                        preserve_annotations: isDev,
                    }
                }
            })
        ],
        usedExports: true
    },

    externals: {
        'react': 'React',
        'react-dom': 'ReactDOM'
    }
};
