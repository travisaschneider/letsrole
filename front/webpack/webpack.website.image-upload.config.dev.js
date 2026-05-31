const FileManagerPlugin = require('filemanager-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    entry: './src/Website/image-upload.ts',
    mode: 'development',
    plugins: [
        new FileManagerPlugin({
            onEnd: {
                copy: [
                    { source: './build/image-upload.js', destination: './../website/public/build/image-upload.js' }
                ],
            }
        })
    ],
    output: {
        path: __dirname + '/../build/',
        filename: 'image-upload.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        alias: {
            handlebars: 'handlebars/dist/handlebars.min.js'
        },
        plugins: [
            new TsconfigPathsPlugin()
        ],
        symlinks: false
    },
    performance: {
        maxEntrypointSize: 5120000,
        maxAssetSize: 5120000
    },
    devtool: 'inline-source-map',
    module: {
        rules: [
            { test: /\.ts?$/, loader: 'ts-loader' }
        ]
    },
    watch: true,
    watchOptions: {
        aggregateTimeout: 300,
        poll: 1000,
        ignored: /node_modules/
    }
};