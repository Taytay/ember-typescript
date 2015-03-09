module.exports = function(config) {

    //var browserToUse = 'Chrome';
    var browserToUse = 'Chrome_nolazy';
    var browserPluginToUse = 'karma-chrome-launcher';

    var isRunningInVagrant = process.env['USER'] == "vagrant";
    if (isRunningInVagrant){
        console.log("Vagrant detected...We'll use PhantomJS instead of Chrome");
        browserToUse = 'PhantomJS';
        browserPluginToUse = 'karma-phantomjs-launcher';
    }

    config.set({

        // base path, that will be used to resolve files and exclude
        basePath: '../',

        frameworks: ['mocha'],
        client: {
            mocha: {
                timeout: 60000
            }
        },

        // list of files / patterns to load in the browser
        files: [
            'node_modules/lodash/index.js',
            'node_modules/jquery/dist/jquery.js',
            'node_modules/handlebars/handlebars.runtime.js',
            'node_modules/ember/ember.js',
            'node_modules/chai/chai.js',
            'bin/EmberBaseobject.js',
            'bin/TestsContainer.js',

            // This makes sure that the sourcemap files are served too, so debugging unit tests is possible
            {pattern: 'bin/*.map', watched: false, included: false, served: true},
            {pattern: 'src/**/*.ts', watched: false, included: false, served: true}
        ],

        // This makes sure it loads the source maps for the above files, if any
        preprocessors: {
            '**/*.js': ['sourcemap']
        },

        // list of files to exclude
        exclude: [],

        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit'
        reporters: ['spec'],

        // web server port
        // CLI --port 9876
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        // CLI --log-level debug
        logLevel: config.LOG_DEBUG,

        // enable / disable watching file and executing tests whenever any file changes
        // CLI --auto-watch --no-auto-watch
        autoWatch: true,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        // CLI --browsers Chrome,Firefox,Safari
        browsers: [browserToUse],

        customLaunchers: {
            Chrome_nolazy: {
                base: 'Chrome',
                flags: ['--js-flags="--nolazy"']
            }
        },

        // If browser does not capture in given timeout [ms], kill it
        // CLI --capture-timeout 5000
        captureTimeout: 60000,
        browserNoActivityTimeout: 120000,

        // Auto run tests on start (when browsers are captured) and exit
        // CLI --single-run --no-single-run
        singleRun: true,

        plugins: [
            'karma-mocha',
            'karma-sourcemap-loader',
            'karma-spec-reporter',
            browserPluginToUse
        ]
    });
};
