const FileManagerPlugin = require('filemanager-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CKEditorWebpackPlugin = require( '@ckeditor/ckeditor5-dev-webpack-plugin' );
const { styles } = require( '@ckeditor/ckeditor5-dev-utils' );

module.exports = {
    entry: './src/app.ts',
    mode: 'development',
    plugins: [
        new FileManagerPlugin({
            events: {
                onEnd: {
                    copy: [
                        { source: './build/main.js', destination: './../website/public/js/main.js' },
                        { source: './node_modules/lamejs/lame.min.js', destination: './../website/public/js/lame.min.js' },
                        { source: './node_modules/tunajs/tuna-min.js', destination: './../website/public/js/tuna-min.js' },
                        { source: './locales', destination: './../website/locales/app'}
                    ],
                }
            }
        }),
        new CKEditorWebpackPlugin( {
            // See https://ckeditor.com/docs/ckeditor5/latest/features/ui-language.html
            language: 'en'
        } )
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
    watch: true,
    watchOptions: {
        aggregateTimeout: 300,
        poll: 1000,
        ignored: /node_modules/
    }
};