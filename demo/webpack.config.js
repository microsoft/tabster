const webpack = require('webpack');

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

    module: {
        rules: [

            { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' }
        ]
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: isDev ? "'development'" : "'production'"
            },
            '__DEV__': isDev
        })
    ],

    optimization: {
        // minimize: false,
        // removeEmptyChunks: true,
        // usedExports: true
    },

    externals: {
        'react': 'React',
        'react-dom': 'ReactDOM'
    }
};
