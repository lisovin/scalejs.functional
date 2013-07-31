/*global define,console,document*/
/*jslint nomen: true*/
define([
    './builder'
], function (
    builder
) {
    'use strict';

    var completeBuilder = builder({
        bind: function (x, f) {
            // x: function (completed) {...}
            // f: function (bound) {
            //      ...
            //      return function (completed) {...}
            //    }
            // completed: function (result) {...}
            return function (completed) {
                // Therefore to $let we pass result of x into f which would return "completable" funciton.
                // Then we simply pass completed into that function and we are done.
                return x.bind(this)(function (xResult) {
                    var rest = f(xResult);
                    rest.bind(this)(completed);
                }.bind(this));
            };
        },

        $return: function (x) {
            return function (complete) {
                if (complete) {
                    complete(x);
                }
            };
        }
    });

    return completeBuilder();
});
