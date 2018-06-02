const path = require('path');
const webpack = require('webpack');
module.exports = {
    context: path.resolve(__dirname, './src'),
    devServer: {
        contentBase: __dirname + '/test-suite', // `__dirname` is root of the project
        compress: true,
    },
    entry: {
        "stream": './workers/stream/worker.js',
        "decoder": './workers/decoder/Decoder.orig.min.js',
        "app": './player.js'
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/\.min.js$/, /\.asm.js$/],
                use: 'babel-loader',
            }
        ]
    },
    plugins: [
        new webpack.LoaderOptionsPlugin({
            debug: true
        }),
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify('development')
            }
        })
    ]

    /*plugins: [
     new webpack.optimize.CommonsChunkPlugin({
     name: 'commons',
     filename: 'commons.js',
     minChunks: 2,
     }),
     ]*/
    /*plugins: [ //extract-text-webpack-plugin
     new ExtractTextPlugin({
     filename: '[name].bundle.css',
     allChunks: true,
     }),
     ],*/
};