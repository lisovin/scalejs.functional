/*global define*/
define([
    'scalejs!core',
    './scalejs.functional/functional',
    './scalejs.functional/builder',
    './scalejs.functional/continuationBuilder'
], function (
    core,
    functional,
    builder,
    continuation
) {
    'use strict';

    var merge = core.object.merge;

    core.registerExtension({
        functional: merge(functional, {
            builder: builder,
            builders: {
                continuation: continuation
            }
        })
    });
});

