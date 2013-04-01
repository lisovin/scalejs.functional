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
        clone = core.object.clone,
        array = core.array;

    function builder(opts) {
        var build;

        function buildContext() {
            return {};
        }

        function callExpr(context, expr) {
            if (!expr || expr.kind !== '$') {
                return typeof expr === 'function' ? expr.bind(context) : expr;
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

            if (typeof opts[method] !== 'function' &&
                    method !== '$then' &&
                    method !== '$else') {
                throw new Error('This control construct may only be used if the computation expression builder ' +
                                'defines a `' + method + '` method.');
            }

            var e = callExpr(context, expr),
                contextCopy,
                cexprCopy;

            if (cexpr.length > 0 && typeof opts.combine !== 'function') {
                throw new Error('This control construct may only be used if the computation expression builder ' +
                                'defines a `combine` method.');
            }

            // if it's return then simply return
            if (isReturnLikeMethod(method)) {
                if (cexpr.length === 0) {
                    return opts[method](e);
                }

                if (typeof opts.delay !== 'function') {
                    throw new Error('This control construct may only be used if the computation expression builder ' +
                                    'defines a `delay` method.');
                }

                // combine with delay
                return opts.combine(opts[method](e), opts.delay(function () {
                    return build(context, cexpr);
                }));
            }

            // if it's not a return then simply combine the operations (e.g. no `delay` needed)
            if (method === '$for') {
                return opts.combine(opts.$for(expr.items, function (item) {
                    var cexpr = array.copy(expr.cexpr),
                        ctx = merge(context);
                    ctx[expr.name] = item;
                    return build(ctx, cexpr);
                }), build(context, cexpr));
            }

            if (method === '$while') {
                if (typeof opts.delay !== 'function') {
                    throw new Error('This control construct may only be used if the computation expression builder ' +
                                    'defines a `delay` method.');
                }

                e = opts.$while(expr.condition.bind(context), opts.delay(function () {
                    var contextCopy = clone(context),
                        cexprCopy = array.copy(expr.cexpr);
                    return build(contextCopy, cexprCopy);
                }));

                if (cexpr.length > 0) {
                    return opts.combine(e, build(context, cexpr));
                }

                return e;
            }

            if (method === '$then' || method === '$else') {
                contextCopy = clone(context);
                cexprCopy = array.copy(expr.cexpr);
                return opts.combine(build(contextCopy, cexprCopy), cexpr);
            }

            return opts.combine(opts[method](e), build(context, cexpr));
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
            var expr;

            if (cexpr.length === 0) {
                if (opts.zero) {
                    return opts.zero();
                }

                throw new Error('Computation expression builder must define `zero` method.');
            }

            expr = cexpr.shift();

            if (expr.kind === 'let') {
                context[expr.name] = callExpr(context, expr.expr);
                return build(context, cexpr);
            }

            if (expr.kind === 'do') {
                expr.expr.call(context);
                return build(context, cexpr);
            }

            if (expr.kind === 'letBind') {
                return opts.bind(callExpr(context, expr.expr), function (bound) {
                    context[expr.name] = bound;
                    return build(context, cexpr);
                });
            }

            if (expr.kind === 'doBind' || expr.kind === '$') {
                return opts.bind(callExpr(context, expr.expr), function () {
                    return build(context, cexpr);
                });
            }

            if (expr.kind === '$return' ||
                    expr.kind === '$RETURN' ||
                    expr.kind === '$yield' ||
                    expr.kind === '$YIELD') {
                return combine(expr.kind, context, expr.expr, cexpr);
            }

            if (expr.kind === '$for' ||
                    expr.kind === '$while') {
                return combine(expr.kind, context, expr, cexpr);
            }

            if (expr.kind === '$if') {
                if (expr.condition.call(context)) {
                    return combine('$then', context, expr.thenExpr, cexpr);
                }

                if (expr.elseExpr) {
                    return combine('$else', context, expr.elseExpr, cexpr);
                }

                return combine(build(context, []), cexpr);
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

    builder.$while = function (condition) {
        if (arguments.length < 2) {
            throw new Error('Incomplete `while`. Expected "$while(<condition>, <expr>)".');
        }

        var cexpr = Array.prototype.slice.call(arguments, 1);

        return {
            kind: '$while',
            condition: condition,
            cexpr: cexpr
        };
    };

    builder.$if = function (condition, thenExpr, elseExpr) {
        if (arguments.length < 2) {
            throw new Error('Incomplete conditional. Expected "$if(<expr>, $then(expr))" or ' +
                            '"$if(<expr>, $then(<expr>), $else(<expr>)"');
        }

        if (typeof condition !== 'function') {
            throw new Error('First argument must be a function that defines the condition of $if.');
        }

        if (thenExpr.kind !== '$then') {
            throw new Error('Unexpected "' + thenExpr.kind + '" in the place of "$then"');
        }

        if (elseExpr) {
            if (elseExpr.kind !== '$else') {
                throw new Error('Unexpected "' + elseExpr.kind + '" in the place of "$else"');
            }
        }

        return {
            kind: '$if',
            condition: condition,
            thenExpr: thenExpr,
            elseExpr: elseExpr
        };
    };

    builder.$then = function () {
        var cexpr = Array.prototype.slice.call(arguments, 0);

        if (cexpr.length === 0) {
            throw new Error('$then should contain at least one expression.');
        }

        return {
            kind: '$then',
            cexpr: cexpr
        };
    };

    builder.$else = function () {
        var cexpr = Array.prototype.slice.call(arguments, 0);

        if (cexpr.length === 0) {
            throw new Error('$else should contain at least one expression.');
        }

        return {
            kind: '$else',
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
