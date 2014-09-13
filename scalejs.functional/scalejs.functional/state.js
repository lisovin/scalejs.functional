/*global define,console,document*/
/*jslint nomen: true*/
define([
    './builder'
], function (
    builder
) {
    'use strict';

    var stateBuilder,
        state;

    stateBuilder = builder({
        bind: function (x, f) {
            return function (s) {
                x(s);
                var r = f();
                r(s);
            };
        },

        $return: function (x) {
            return function (s) {
                if (onSuccess) {
                    if (typeof x === 'function') {
                        x = x();
                    }
                    onSuccess(x);
                }
            };
        },

        delay: function (f) {
            return f;
        },

        run: function (f) {
            return function (onSuccess, onError) {
                var delayed = f.call(this);
                delayed.call(this, onSuccess, onError);
            };
        }
    });

    continuation = continuationBuilder().mixin({
        beforeBuild: function (ops) {
            //console.log('--->INTERCEPTED!', ops);
            ops.forEach(function (op, i) {
                if (typeof op === 'function') {
                    ops[i] = builder.$DO(op);
                }
            });
        }
    });

    return continuation;
});
