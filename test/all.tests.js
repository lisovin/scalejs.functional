require.config({
    paths: {
        boot: "../lib/jasmine/boot",
        "jasmine-html": "../lib/jasmine/jasmine-html",
        jasmine: "../lib/jasmine/jasmine",
        'scalejs.functional': '../build/scalejs.functional'
    },
    shim: {
        jasmine: {
            exports: "window.jasmineRequire"
        },
        "jasmine-html": {
            deps: [
                "jasmine"
            ],
            exports: "window.jasmineRequire"
        },
        boot: {
            deps: [
                "jasmine",
                "jasmine-html"
            ],
            exports: "window.jasmineRequire"
        }
    },
    scalejs: {
        extensions: [
            "scalejs.functional"
        ]
    }
});

require(['boot'], function () {
    require ([
        './functional.test',
        './builder.test',
        './continuationBuilder.test'
    ], function () {
        window.onload();
    });
});
