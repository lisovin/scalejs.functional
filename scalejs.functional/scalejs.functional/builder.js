/*global define,console,document*/
/*jslint nomen: true*/
/**
 * Based on F# computation expressions http://msdn.microsoft.com/en-us/library/dd233182.aspx
 **/
define([
    'scalejs!core'
], function (
    core
) {
    'use strict';

    var merge = core.object.merge,
        array = core.array;

    function builder(opts) {
        var build;

        function buildContext() {
            return {};
        }

        function callExpr(context, expr) {
            if (!expr || expr.kind !== '$') {
                return expr;
            }

            if (typeof expr.expr === 'function') {
                return expr.expr.call(context);
            }

            if (typeof expr.expr === 'string') {
                return context[expr.expr];
            }

            throw new Error('Parameter in $(...) must be either a function or a string referencing a binding.');
        }

        function combine(method, context, expr, cexpr) {
            function isReturnLikeMethod(method) {
                return method === '$return' ||
                        method === '$RETURN' ||
                        method === '$yield' ||
                        method === '$YIELD';
            }

            if (typeof opts[method] !== 'function') {
                throw new Error('This control construct may only be used if the computation expression builder ' +
                                'defines a `' + method + '` method.');
            }

            var e = callExpr(context, expr);

            if (cexpr.length > 0) {
                if (typeof opts.combine !== 'function') {
                    throw new Error('This control construct may only be used if the computation expression builder ' +
                                    'defines a `combine` method.');
                }
                // if it's not a return then simply combine the operations (e.g. no `delay` needed)
                if (!isReturnLikeMethod(method)) {
                    if (method === '$for') {
                        return opts.combine(opts.$for(expr.items, function (item) {
                            var cexpr = array.copy(expr.cexpr),
                                ctx = merge(context);
                            ctx[expr.name] = item;
                            return build(ctx, cexpr);
                        }), build(context, cexpr));
                    }

                    return opts.combine(opts[method].call(context, e), build(context, cexpr));
                }

                if (typeof opts.delay !== 'function') {
                    throw new Error('This control construct may only be used if the computation expression builder ' +
                                    'defines a `delay` method.');
                }


                // combine with delay
                return opts.combine(opts[method].call(context, e), opts.delay.call(context, function () {
                    return build(context, cexpr);
                }));
            }

            // if it's return then simply return
            if (isReturnLikeMethod(method)) {
                return opts[method].call(context, e);
            }

            // combine non-return operation with `zero`                
            return opts.combine(opts[method].call(context, e), build(context, cexpr));
        }

        if (!opts.missing) {
            opts.missing = function (expr) {
                if (expr.kind) {
                    throw new Error('Unknown operation "' + expr.kind + '". ' +
                                    'Either define `missing` method on the builder or fix the spelling of the operation.');
                }

                throw new Error('Expression ' + JSON.stringify(expr) + ' cannot be processed. ' +
                                'Either define `missing` method on the builder or convert expression to a function.');
            };
        }

        build = function (context, cexpr) {
            if (cexpr.length === 0) {
                if (opts.zero) {
                    return opts.zero();
                }

                throw new Error('Computation expression builder must define `zero` method.');
            }

            var expr = cexpr.shift();

            if (expr.kind === 'let') {
                context[expr.name] = callExpr(context, expr.expr);
                return build(context, cexpr);
            }

            if (expr.kind === 'do') {
                expr.expr.call(context);
                return build(context, cexpr);
            }

            if (expr.kind === 'letBind') {
                return opts.bind.call(context, callExpr(context, expr.expr), function (bound) {
                    context[expr.name] = bound;
                    return build(context, cexpr);
                });
            }

            if (expr.kind === 'doBind' || expr.kind === '$') {
                return opts.bind.call(context, expr.expr.bind(context), function () {
                    return build(context, cexpr);
                });
            }

            if (expr.kind === '$return' ||
                    expr.kind === '$RETURN' ||
                    expr.kind === '$yield' ||
                    expr.kind === '$YIELD') {
                return combine(expr.kind, context, expr.expr, cexpr);
            }

            if (expr.kind === '$for') {
                return combine('$for', context, expr, cexpr);
            }

            if (typeof expr === 'function' && opts.call) {
                opts.call(context, expr);
                return build(context, cexpr);
            }

            if (typeof expr === 'function') {
                expr.call(context, expr);
                return build(context, cexpr);
            }

            return combine('missing', context, expr, cexpr);
        };

        return function () {
            var args = array.copy(arguments),
                expression = function () {
                    var operations = Array.prototype.slice.call(arguments, 0),
                        context = buildContext(),
                        result,
                        toRun;

                    if (this.mixins) {
                        this.mixins.forEach(function (mixin) {
                            if (mixin.beforeBuild) {
                                mixin.beforeBuild(context, operations);
                            }
                        });
                    }

                    if (opts.delay) {
                        toRun = opts.delay(function () {
                            return build(context, operations);
                        });
                    } else {
                        toRun = build(context, operations);
                    }

                    if (opts.run) {
                        result = opts.run.apply(null, [toRun].concat(args));
                    } else {
                        result = toRun;
                    }

                    if (this.mixins) {
                        this.mixins.forEach(function (mixin) {
                            if (mixin.afterBuild) {
                                result = mixin.afterBuild(result);
                            }
                        });
                    }

                    return result;
                };

            function mixin() {
                var context = {mixins: Array.prototype.slice.call(arguments, 0)},
                    bound = expression.bind(context);
                bound.mixin = function () {
                    Array.prototype.push.apply(context.mixins, arguments);
                    return bound;
                };

                return bound;
            }

            expression.mixin = mixin;

            return expression;
        };
    }

    builder.$let = function (name, expr) {
        return {
            kind: 'let',
            name: name,
            expr: expr
        };
    };

    builder.$LET = function (name, expr) {
        return {
            kind: 'letBind',
            name: name,
            expr: expr
        };
    };

    builder.$do = function (expr) {
        return {
            kind: 'do',
            expr: expr
        };
    };

    builder.$DO = function (expr) {
        return {
            kind: 'doBind',
            expr: expr
        };
    };

    builder.$return = function (expr) {
        return {
            kind: '$return',
            expr: expr
        };
    };

    builder.$RETURN = function (expr) {
        return {
            kind: '$RETURN',
            expr: expr
        };
    };

    builder.$yield = function (expr) {
        return {
            kind: '$yield',
            expr: expr
        };
    };

    builder.$YIELD = function (expr) {
        return {
            kind: '$YIELD',
            expr: expr
        };
    };

    builder.$for = function (name, items) {
        var cexpr = Array.prototype.slice.call(arguments, 2);

        return {
            kind: '$for',
            name: name,
            items: items,
            cexpr: cexpr
        };
    };

    builder.$ = function (expr) {
        return {
            kind: '$',
            expr: expr
        };
    };

    return builder;
});
