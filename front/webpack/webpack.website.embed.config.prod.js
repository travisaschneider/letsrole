const FileManagerPlugin = require('filemanager-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: './src/Website/website-embed.ts',
    mode: 'production',
    plugins: [
        new FileManagerPlugin({
            events: {
                onEnd: {
                    copy: [
                        { source: './build/website-embed.js', destination: './../website/public/js/embed.js' }
                    ],
                }
            }
        })
    ],
    output: {
        path: __dirname + '/../build/',
        filename: 'website-embed.js'
    },
    resolve: {
        extensions: ['.ts', '.js'],
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
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    watch: false
};