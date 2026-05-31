const FileManagerPlugin = require('filemanager-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const {styles} = require("@ckeditor/ckeditor5-dev-utils");

module.exports = {
    entry: './src/app.ts',
    mode: 'production',
    plugins: [
        new FileManagerPlugin({
            events: {
                onEnd: {
                    copy: [
                        { source: './build/main.js', destination: './dist/main.js' },
                        { source: './build/main.js', destination: './../website/public/js/main.js' },
                        { source: './node_modules/lamejs/lame.min.js', destination: './dist/lame.min.js' },
                        { source: './node_modules/tunajs/tuna-min.js', destination: './dist/tuna-min.js' },
                    ],
                }
            }
        })
    ],
    output: {
        path: __dirname + '/../build/',
        filename: '[name].js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
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
            { test: /\.ts?$/, loader: 'ts-loader' },
            {
                test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
                use: [ 'raw-loader' ]
            },
            {
                test: /ckeditor5-[^/\\]+[/\\]theme[/\\].+\.css$/,
                use: [
                    {
                        loader: 'style-loader',
                        options: {
                            injectType: 'singletonStyleTag',
                            attributes: {
                                'data-cke': true
                            }
                        }
                    },
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: styles.getPostCssConfig( {
                                themeImporter: {
                                    themePath: require.resolve( '@ckeditor/ckeditor5-theme-lark' )
                                },
                                minify: true
                            } )
                        }
                    },
                ]
            }
        ]
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    watch: false
};