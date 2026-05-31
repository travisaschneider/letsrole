const FileManagerPlugin = require('filemanager-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    entry: './src/Website/image-upload.ts',
    mode: 'production',
    plugins: [
        new FileManagerPlugin({
            onEnd: {
                copy: [
                    { source: './build/image-upload.js', destination: './dist/image-upload.js' }
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
    devtool: false,
    module: {
        rules: [
            { test: /\.ts?$/, loader: 'ts-loader' }
        ]
    },
    watch: false
};