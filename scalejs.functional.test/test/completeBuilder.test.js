/*global require,define,jasmine,describe,expect,it,console,runs,waits,setTimeout*/
/*jslint nomen:true*/
/// <reference path="../Scripts/jasmine.js"/>
define([
    'scalejs!core',
    'scalejs!application'
], function (core) {
    'use strict';

    var complete = core.functional.builders.complete,
        curry = core.functional.curry,
        $let = core.functional.builder.$let,
        $LET = core.functional.builder.$LET,
        $yield = core.functional.builder.$yield,
        $YIELD = core.functional.builder.$YIELD,
        $return = core.functional.builder.$return,
        $RETURN = core.functional.builder.$RETURN,
        $do = core.functional.builder.$do,
        $DO = core.functional.builder.$DO,
        $for = core.functional.builder.$for,
        $if = core.functional.builder.$if,
        $then = core.functional.builder.$then,
        $else = core.functional.builder.$else,
        $while = core.functional.builder.$while,
        $ = core.functional.builder.$;

    describe('complete builder', function () {
        it('basic', function () {
            var x = 0;

            function f(timeout, complete) {
                setTimeout(function () {
                    console.log('--->new x:', x);
                    x += 1;
                    complete(x);
                }, timeout);
            }

            function f_(timeout) {
                return $DO(curry(f)(timeout));
            }

            var c = complete(
                f_(10),
                f_(5),
                f_(20)
            );

            c(function (r) {
                console.log('--->final x:', x, ', final r:', r);
            });

            waits(100);

            runs(function () {
                expect(x).toBe(3);
            });
        });

        it('calling without `complete`', function () {
            var x = 0;

            function f(timeout, complete) {
                setTimeout(function () {
                    console.log('--->new x:', x);
                    x += 1;
                    complete();
                }, timeout);
            }

            function f_(timeout) {
                return $DO(curry(f)(timeout));
            }

            var c = complete(
                f_(10),
                f_(5),
                f_(20)
            );

            c();

            waits(100);

            runs(function () {
                expect(x).toBe(3);
            });
        });

        it('$do and $DO', function () {
            var x = 0,
                start = new Date().getTime();

            function f(timeout, complete) {
                setTimeout(function () {
                    console.log('--->before x++:', x, new Date().getTime() - start);
                    x += 1;
                    console.log('--->after x++:', x, new Date().getTime() - start);
                    complete(x);
                }, timeout);
            }

            var c = complete(
                $DO(curry(f)(10)),
                $do(function () { 
                    console.log('--->$do:', x, new Date().getTime() - start);
                    x += 1; 
                }),
                $DO(curry(f)(20))
            );

            c();

            waits(100);

            runs(function () {
                expect(x).toBe(3);
            });
        });

        it('`this` is maintained throught the chain of `$DO`-s.', function () {
            function f(timeout, complete) {
                setTimeout(function () {
                    this.x += 1;
                    complete();
                }.bind(this), timeout);
            }

            function f_(timeout) {
                return $DO(curry(f)(timeout));
            }

            var c = complete(
                f_(10),
                f_(5),
                f_(20)
            );

            var ctx = { x : 0 };
            c.call(ctx);

            waits(100);

            runs(function () {
                expect(ctx.x).toBe(3);
            });
        });

        it('`this` is maintained throught the chain of `$do`-s.', function () {
            function f(timeout) {
                return function () {
                    setTimeout(function () {
                        this.x += 1;
                        complete();
                    }.bind(this), timeout);
                };
            }

            function f_(timeout) {
                return $do(f(timeout));
            }

            var c = complete(
                f_(10),
                f_(5),
                f_(20),
                $DO(function(complete) { complete(); })
            );

            var ctx = { x: 0 };
            c.call(ctx);

            waits(15);

            runs(function () {
                // not 3 as in previous test, since 3 didn't execute yet
                expect(ctx.x).toBe(2);
            });
        });
    });
});