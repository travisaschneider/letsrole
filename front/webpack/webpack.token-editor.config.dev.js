const FileManagerPlugin = require('filemanager-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    entry: './src/token-editor.ts',
    mode: 'development',
    plugins: [
        new FileManagerPlugin({
            events: {
                onEnd: {
                    copy: [
                        { source: './build/token-editor.js', destination: './../website/public/js/token-editor.js' }
                    ],
                }
            }
        })
    ],
    output: {
        path: __dirname + '/../build/',
        filename: 'token-editor.js'
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
    watch: true,
    watchOptions: {
        aggregateTimeout: 300,
        poll: 1000,
        ignored: /node_modules/
    }
};