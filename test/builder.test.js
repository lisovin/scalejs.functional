﻿/*global require,define,jasmine,describe,expect,it,console,runs,waits,setTimeout*/
/*jslint nomen:true*/
/// <reference path="../Scripts/jasmine.js"/>
define([
    'scalejs!core',
    'scalejs!application'
], function (core) {
    'use strict';

    var merge = core.object.merge,
        builder = core.functional.builder,
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

    describe('computation expression builder', function () {
        it('with no operations and no `zero` throws an exception.', function () {
            var testBuilder, test, t;

            testBuilder = builder({
            });

            test = testBuilder();

            expect(test).toThrow();
        });

        it('with single operation and no `zero` throws an exception.', function () {
            var testBuilder, test, t;

            testBuilder = builder({
            });

            test = testBuilder();

            expect(function () {
                test(
                    console.log('testing...')
                );
            }).toThrow();
        });

        it('with no operations and defined `zero` returns "zero" value.', function () {
            var testBuilder, test, t;

            testBuilder = builder({
                zero: function () {
                    return 5;
                }
            });

            test = testBuilder();

            expect(test()).toBe(5);
        });

        it('with single JS expresion calls it and returns "zero" value.', function () {
            var testBuilder, test, t, op = jasmine.createSpy();

            testBuilder = builder({
                zero: function () {
                    return 1;
                }
            });

            test = testBuilder();

            expect(test(op)).toBe(1);
            expect(op).toHaveBeenCalled();
        });

        it('with multiple JS expressions calls them and returns "zero" value.', function () {
            var testBuilder, test, t, op = jasmine.createSpy();

            testBuilder = builder({
                zero: function () {
                    return 'test';
                }
            });

            test = testBuilder();

            expect(test(op, op, op)).toBe('test');
            expect(op.calls.count()).toBe(3);
        });

        it('single $DO with no $return throws an exception', function () {
            var testBuilder, test;

            testBuilder = builder({
                bind: function (x, f) {
                    return x(f);
                }
            });

            test = testBuilder();

            expect(function () { test($DO(function () { })); }).toThrow();
        });

        it('single $DO', function () {
            var testBuilder,
                test,
                x = 0,
                t;

            testBuilder = builder({
                bind: function (x, f) {
                    return x(f);
                },
                $return: function (x) {
                    return x;
                }
            });

            test = testBuilder();

            t = test(
                $DO(function () { x += 1; })
            );

            expect(x).toBe(1);
        });

        it('bound value can be referenced in JS expressions.', function () {
            var testBuilder, test, t, op = jasmine.createSpy();

            testBuilder = builder({
                zero: function () {
                }
            });

            test = testBuilder();

            test(
                $let('foo', 5),
                function () { op(this.foo); });
            expect(op).toHaveBeenCalledWith(5);
        });

        it('with "$return" operation but no `$return` defined on the builder throws an exception.', function () {
            var testBuilder, test;

            testBuilder = builder({
            });

            test = testBuilder();

            expect(function () { test($return(5)); }).toThrow();
        });

        it('with "$return" operation and `$return` defined on the builder returns the value.', function () {
            var testBuilder, test;

            testBuilder = builder({
                $return: function (x) {
                    return x;
                }
            });

            test = testBuilder();

            expect(test($return(5))).toBe(5);
            expect(test(
                $let('x', 10),
                $return($('x'))
            )).toBe(10);
        });

        it('with multiple "$return" operations but no `combine` defined on the builder throws an exception.', function () {
            var testBuilder, test;

            testBuilder = builder({
                $return: function (x) {
                    return x;
                }
            });

            test = testBuilder();

            expect(function () {
                test(
                    $return(5),
                    $return('test')
                );
            }).toThrow();
        });

        it('with multiple "$return" operations but no `delay` defined on the builder throws an exception.', function () {
            var testBuilder, test;

            testBuilder = builder({
                combine: function (x, y) {
                    return x;
                },

                $return: function (x) {
                    return x;
                }
            });

            test = testBuilder();

            expect(function () {
                test(
                    $return(5),
                    $return('test')
                );
            }).toThrow();
        });

        it('with multiple "$return" operations but no `run` defined returns a function that evaluates to correct value.', function () {
            var testBuilder, test, t;

            testBuilder = builder({
                delay: function (f) {
                    return f;
                },

                combine: function (x, f) {
                    if (x === 5) {
                        return x;
                    }

                    return f();
                },

                $return: function (x) {
                    console.log('--->$return:', x);
                    return x;
                }
            });

            test = testBuilder();
            t = test(
                $return('foo'),
                $return(5),
                $return('test')
            );

            expect(typeof t).toBe('function');
            expect(t()).toBe(5);
        });

        it('with multiple "$return" operations evaluates to correct value.', function () {
            var testBuilder, test, t;

            testBuilder = builder({
                delay: function (f) {
                    return f;
                },

                run: function (f) {
                    return f();
                },

                combine: function (x, f) {
                    if (x === 5) {
                        return x;
                    }

                    return f();
                },

                $return: function (x) {
                    console.log('--->$return:', x);
                    return x;
                }
            });

            test = testBuilder();
            t = test(
                $return('foo'),
                $return(5),
                $return('test')
            );

            expect(t).toBe(5);
        });

        it('bound value with "$LET" can be referenced.', function (done) {
            var asyncBuilder, async, complete = jasmine.createSpy(), start = new Date().getTime();

            // async
            asyncBuilder = builder({
                bind: function (x, f) {
                    // every x is function (completed) {...} where completed is function (result) {...}
                    // (e.g. M<T> = (T -> unit) -> unit)
                    // Therefore to $let we pass result of x into f which would return "completable" funciton.
                    // Then we simply pass completed into that function and we are done.
                    return function (completed) {
                        return x(function (xResult) {
                            var inner = f(xResult);
                            inner(completed);
                        });
                    };
                },

                run: function (f) {
                    var r = f;

                    r.timeout = function(n) {
                        return function (complete) {
                            setTimeout(function () {
                                r(complete);
                            }, n);
                        };
                    };

                    return r;
                },

                $return: function (x) {
                    // convert T to M<T>
                    return function (complete) {
                        console.log('--->$return:', x, ((new Date()).getTime() - start));
                        complete(x);
                    };
                }
            });

            async = asyncBuilder();

            var a = async(
                $LET('x', async($return($(function () { return 2; }))).timeout(20)),
                $LET('y', async($return($(function () { return 3; }))).timeout(20)),
                $return($(function () {
                    return this.x + this.y;
                }))
            );

            a(complete);

            setTimeout(function () {
                expect(complete).toHaveBeenCalledWith(5);
                done();
            }, 60);
        });

        it('`$yield` and `$YIELD` return correct values.', function () {
            var arrayBuilder, array, a;

            arrayBuilder = builder({
                delay: function (f) {
                    return f();
                },

                combine: function (x, xs) {
                    return x.concat(xs);
                },

                $yield: function (x) {
                    return [x];
                },

                $YIELD: function (xs) {
                    return xs;
                }
            });

            array = arrayBuilder();
            a = array(
                $yield('foo'),
                $YIELD([1, 3, 10]),
                $yield('bar')
            );

            expect(a).toEqual(['foo', 1, 3, 10, 'bar']);
        });

        it('$YIELD of nested computation expression', function () {
            var arrayBuilder, array, a;

            arrayBuilder = builder({
                delay: function (f) {
                    return f();
                },

                combine: function (x, xs) {
                    return x.concat(xs);
                },

                $yield: function (x) {
                    return [x];
                },

                $YIELD: function (xs) {
                    return xs;
                }
            });

            array = arrayBuilder();
            a = array(
                $yield('foo'),
                $YIELD(array(
                    $yield(1),
                    $yield(3),
                    $yield(10)
                )),
                $yield('bar')
            );

            expect(a).toEqual(['foo', 1, 3, 10, 'bar']);
        });
        it('`$for` generates correct values.', function () {
            var arrayBuilder, array, a;

            arrayBuilder = builder({
                delay: function (f) {
                    return f();
                },

                combine: function (x, xs) {
                    return x.concat(xs);
                },

                $yield: function (x) {
                    return [x];
                },

                $YIELD: function (xs) {
                    return xs;
                },

                $for: function (xs, f) {
                    return xs.reduce(function (acc, x) {
                        return acc.concat(f(x));
                    }, []);
                }
            });

            array = arrayBuilder();
            a = array(
                $yield(0),
                $for('x', [1, 2],
                    $yield($('x')),
                    $YIELD($(function () {
                        return [this.x * 2];
                    }))),
                $yield(5)
            );

            expect(a).toEqual([0, 1, 2, 2, 4, 5]);
        });



        it('`$if` filters values.', function () {
            var arrayBuilder, array, a;

            arrayBuilder = builder({
                delay: function (f) {
                    return f();
                },

                zero: function () {
                    return [];
                },

                combine: function (x, xs) {
                    return x.concat(xs);
                },

                $yield: function (x) {
                    return [x];
                },

                $YIELD: function (xs) {
                    return xs;
                },

                $for: function (xs, f) {
                    return xs.reduce(function (acc, x) {
                        console.log('--->x: ', x);
                        return acc.concat(f(x));
                    }, []);
                }
            });

            array = arrayBuilder();
            a = array(
                $yield(0),
                $for('x', [1, 2, 3],
                    $if(function () { return this.x % 2 === 0; },
                        $then(
                            $yield($('x')),
                            $YIELD($(function () {
                                return [this.x * 2];
                            }))),
                        $else(
                            $do(function () {
                                console.log('--->else', this.x);
                            }),
                            $yield($(function () { return -this.x; }))))),
                $yield(5)
            );

            expect(a).toEqual([0, -1, 2, 4, -3, 5]);
        });

        it('`$while` generates values.', function () {
            var arrayBuilder, array, a;

            arrayBuilder = builder({
                bind: function (x, f) {
                    return x.concat(f());
                },
                delay: function (f) {
                    return f;
                },
                run: function (f) {
                    return f();
                },
                combine: function (x, f) {
                    return this.bind(x, f);
                },
                zero: function () {
                    return [];
                },
                $yield: function (x) {
                    return [x];
                },
                $while: function (condition, body) {
                    var self = this;
                    console.log(this);
                    if (condition()) {
                        return this.bind(body(), function () {
                            return self.$while(condition, body);
                        });
                    }
                    return this.zero();
                }
            });

            array = arrayBuilder();
            var x = 5;
            a = array(
                $while(function () { return x > 0; },
                    $yield($(function () { return x; })),
                    $do(function () {
                        x -= 1;
                    }))
            );

            expect(a).toEqual([5, 4, 3, 2, 1]);
        });
    }),

    describe('sample builders', function () {
        it('object builder', function () {
            var objectBuilder, o, my;

            objectBuilder = builder({
                delay: function (f) {
                    return f();
                },

                combine: function (x, xs) {
                    return merge(x, xs);
                },

                $yield: function (x) {
                    return x;
                }
            });

            o = objectBuilder();

            function p(name, value) {
                var r = {};
                r[name] = value;
                return $yield(r);
            }

            my = o(
                p('id', 'parent'),
                p('values', [1, 'test']),
                p('child', o(
                    p('id', 'child'),
                    p('more', [
                        o(p('id', 'child1')),
                        o(p('id', 'child2'))]))));

            console.log('result', JSON.stringify(my));

        });

        it('maybe builder', function () {
            var maybeBuilder,
                maybe,
                m;

            maybeBuilder = builder({
                bind: function (x, f) {
                    var v = x();
                    console.log('--->v: ', v);

                    if (v === undefined) {
                        return undefined;
                    }

                    return f(v);
                },

                $return: function (x) {
                    return x;
                }
            });

            maybe = maybeBuilder();

            function divideBy(x, y) {
                return function () {
                    if (y === 0) {
                        return undefined;
                    }

                    if (typeof x === 'string') {
                        return this[x] / y;
                    }

                    return x / y;
                };
            }

            function safeDivide(n, x, y, z) {
                return maybe (
                    $LET('a', divideBy(n, x)),
                    $LET('b', divideBy('a', y)),
                    $LET('c', divideBy('b', z)),
                    $return($('c'))
                );
            }

            expect(safeDivide(12, 2, 3, 2)).toBe(1);
            //expect(safeDivide(12, 2, 0, 2)).not.toBeDefined();
        });

        it('orElse', function () {
            var orElseBuilder,
                orElse,
                m1 = { '1': 'One' },
                m2 = { '2': 'Two' },
                m3 = { '3': 'Three' };

            orElseBuilder = builder({
                $RETURN: function (x) {
                    console.log('-->returning ', x);
                    return x;
                },
                combine: function (x, y)  {
                    return x === undefined ? y : x;
                },
                delay: function (f) {
                    return f();
                }
            });

            orElse = orElseBuilder();

            function multiLookup(key) {
                function tryFind(m) {
                    return $RETURN(m[key]);
                }

                return orElse(
                    tryFind(m1),
                    tryFind(m2),
                    tryFind(m3)
                );
            }

            expect(multiLookup('2')).toBe('Two');
        });

        it('trace', function () {
            var traceBuilder,
                trace,
                t;

            traceBuilder = builder({
                bind: function (x, f) {
                    if (x === undefined) {
                        console.log('--->$leting with undefined. exiting.');
                        return undefined;
                    }

                    console.log('--->$leting with', x, '. continuing.');
                    return f(x.call(this));
                },
                $return: function (x) {
                    console.log('--->returning', x);
                    return x;
                }
            });

            trace = traceBuilder();

            t = trace(
                $LET('x', function () { return 1; }),
                function () {
                    console.log('-->x', this.x);
                },
                $(function () {
                    console.log('--->x', this.x);
                    this.x += 2;
                }),
                function () {
                    this.x += 3;
                },
                $return($('x'))
            );

            expect(t).toBe(6);
        });

        it('state', function () {
            var stateBuilder,
                state,
                s;

            stateBuilder = builder({
                bind: function (x, f) {
                    return function (state) {
                        x(state);
                        var s = f();
                        s(state);
                    };
                },

                $return: function (x) {
                    return x;
                }
            });

            state = stateBuilder();


            s = state(
                $let('state', {}),
                function () {
                    this.state.foo = 'bar';
                },
                function (state) {
                    this.state.bar = 'foo';
                },
                $return(function () { return this.state; })
            );

            console.log('--->final state', s);
        });

        it('mixin', function () {
            var stateBuilder,
                state,
                s,
                interceptor;

            interceptor = {
                beforeBuild: function (ctx, ops) {
                    console.log('--->INTERCEPTED!', ops);
                },
                afterBuild: function (state) {
                    state.intercepted = 'yes';
                    return state;
                }
            }

            stateBuilder = builder({
                bind: function (x, f) {
                    return function (state) {
                        x(state);
                        var s = f();
                        s(state);
                    };
                },

                $return: function (x) {
                    return x;
                }
            });

            var state1 = stateBuilder();
            var state2 = state1.mixin(interceptor);

            s = state2(
                $let('state', {}),
                function () {
                    this.state.foo = 'bar';
                },
                function () {
                    this.state.bar = 'foo';
                },
                $return(function () { return this.state; })
            );

            console.log('--->final state', s);

        });

    });
});
