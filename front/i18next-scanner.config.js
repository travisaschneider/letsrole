module.exports = {
    input: [
        'views/*.html.njk',
        'views/**/*.html.njk',
        'src/**/*.ts'
    ],
    output: './locales/',
    options: {
        debug: true,
        func: {
            list: ['__'],
            extensions: ['.html', '.html.njk', '.njk', '.ts'],
        },
        trans: {
            component: 'Trans',
            extensions: [],
        },
        lngs: ['en', 'fr', 'de', 'it', 'pt', 'es'],
        ns: ['locale'],
        defaultLng: 'en',
        defaultNs: 'locale',
        defaultValue: '',
        resource: {
            loadPath: './locales/{{lng}}.json',
            savePath: './{{lng}}.json',
            jsonIndent: 2,
            lineEnding: '\n',
        },
        nsSeparator: false, // namespace separator
        keySeparator: false, // key separator
        interpolation: {
            prefix: '{{',
            suffix: '}}',
        },
    },
};