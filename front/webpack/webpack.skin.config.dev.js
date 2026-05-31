const FileManagerPlugin = require('filemanager-webpack-plugin');

module.exports = env => {
    return {
        entry: './sass/skin/' + env.skin + '.scss',
        plugins: [
            new FileManagerPlugin({
                events: {
                    onEnd: {
                        copy: [
                            {
                                source: './build/css/skin/' + env.skin + '.css',
                                destination: './../website/public/css/skin/' + env.skin + '/sheet.css'
                            },
                            {
                                source: './build/css/skin/' + env.skin + '.css',
                                destination: './../website/public/css/character-skin/' + env.skin + '/sheet.css'
                            },
                        ],
                    }
                }
            })
        ],
        output: {
            path: __dirname + '/../build/',
            filename: 'css/skin/[name].css'
        },
        module: {
            rules: [{
                test: /\.scss$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'css/skin/[name].css',
                        }
                    },
                    {
                        loader: 'extract-loader'
                    },
                    {
                        loader: 'css-loader?-url'
                    },
                    {
                        loader: 'sass-loader'
                    }
                ]
            }]
        },
        devtool: false,
        watch: true,
        watchOptions: {
            aggregateTimeout: 300,
            poll: 1000,
            ignored: /node_modules/
        }
    }
};