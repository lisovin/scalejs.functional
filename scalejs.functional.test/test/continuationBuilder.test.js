/*global require,define,jasmine,describe,expect,it,console,runs,waits,setTimeout*/
/*jslint nomen:true*/
/// <reference path="../Scripts/jasmine.js"/>
define([
    'scalejs!core',
    'scalejs!application'
], function (core) {
    'use strict';

    var continuation = core.functional.builders.continuation,
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

    describe('continuation builder', function () {
        it('return of function makes it completable', function () {
            var count = 0,
                completable;

            function doSomething() {
                console.log('did something');
                count += 1;
            }

            completable = continuation($return(doSomething));

            completable(function () {
                console.log('continuationd');
                count += 1;
            });

            expect(count).toBe(2);
        });

        it('single function as an argument makes it completable', function () {
            var count = 0,
                completable;

            function doSomething(continuationd) {
                console.log('did something');
                count += 1;
                continuationd();
            }

            completable = continuation(doSomething);

            completable(function () {
                console.log('continuationd');
                count += 1;
            });

            expect(count).toBe(2);
        });

        it('basic with $DO', function () {
            var x = 0;

            function f(timeout, continuation) {
                setTimeout(function () {
                    console.log('--->new x:', x);
                    x += 1;
                    continuation(x);
                }, timeout);
            }

            function f_(timeout) {
                return $DO(curry(f)(timeout));
            }

            var c = continuation(
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

        it('basic without $DO', function () {
            var x = 0;

            function f(timeout) {
                return function (continuation) {
                    setTimeout(function () {
                        console.log('--->new x:', x);
                        x += 1;
                        continuation(x);
                    }, timeout);
                };
            }

            var c = continuation(
                f(10),
                f(5),
                f(20)
            );

            c(function (r) {
                console.log('--->final x:', x, ', final r:', r);
            });

            waits(100);

            runs(function () {
                expect(x).toBe(3);
            });
        });

        it('calling without `continuation`', function () {
            var x = 0;

            function f(timeout, continuation) {
                setTimeout(function () {
                    console.log('--->new x:', x);
                    x += 1;
                    continuation();
                }, timeout);
            }

            function f_(timeout) {
                return $DO(curry(f)(timeout));
            }

            var c = continuation(
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

            function f(timeout, continuation) {
                setTimeout(function () {
                    console.log('--->before x++:', x, new Date().getTime() - start);
                    x += 1;
                    console.log('--->after x++:', x, new Date().getTime() - start);
                    continuation(x);
                }, timeout);
            }

            var c = continuation(
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
            function f(timeout, continuation) {
                setTimeout(function () {
                    this.x += 1;
                    continuation();
                }.bind(this), timeout);
            }

            function f_(timeout) {
                return $DO(curry(f)(timeout));
            }

            var c = continuation(
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
                        continuation();
                    }.bind(this), timeout);
                };
            }

            function f_(timeout) {
                return $do(f(timeout));
            }

            var c = continuation(
                f_(10),
                f_(5),
                f_(20),
                $DO(function(continuation) { continuation(); })
            );

            var ctx = { x: 0 };
            c.call(ctx);

            waits(15);

            runs(function () {
                // not 3 as in previous test, since 3 didn't execute yet
                expect(ctx.x).toBe(2);
            });
        });

        it('onError is called', function () {
            function f(timeout) {
                return function (onSuccess, onError) {
                    setTimeout(function () {
                        if (this.x === 0) {
                            this.x += 1;
                            onSuccess();
                        } else {
                            onError({ message: 'x is already greater than 0' });
                        }
                    }.bind(this), timeout);
                };
            }

            function f_(timeout) {
                return $DO(f(timeout));
            }

            var c = continuation(
                f_(10),
                f_(5),
                f_(20)
            );

            var ctx = { x: 0 },
                error;

            c.call(ctx, function () { }, function (ex) {
                console.log(ex);
                error = ex;
            });

            waits(40);

            runs(function () {
                expect(ctx.x).toBe(1);
                expect(error).toBeDefined();
                expect(error.message).toBe('x is already greater than 0');
            });
        });
    });
});