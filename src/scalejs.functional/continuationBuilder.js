/*global define,console,document*/
/*jslint nomen: true*/
define([
    './builder'
], function (
    builder
) {
    'use strict';

    var continuationBuilder,
        continuation;

    continuationBuilder = builder({
        bind: function (f, g) {
            // `f` is a function that would invoke a callback once they are continuationd.
            // E.g.:
            // f: function (continuationd) { 
            //        ...
            //        continuationd(result); 
            //    }
            // 
            // `g` is a function that needs to be bound to result of `f` and its result should have the same signature as `f`
            // 
            // To bind them we should return a function `h` with same signature such as `f`
            return function (onSuccess, onError) {
                f(function (fResult) {
                    var rest = g(fResult);
                    return rest(onSuccess, onError);
                }, onError);
            };
        },

        $return: function (x) {
            return function (onSuccess, onError) {
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
