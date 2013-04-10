/*global define*/
define([
    'scalejs!core',
    './scalejs.functional/functional',
    './scalejs.functional/builder',
    './scalejs.functional/completeBuilder'
], function (
    core,
    functional,
    builder,
    complete
) {
    'use strict';

    var merge = core.object.merge;

    core.registerExtension({
        functional: merge(functional, {
            builder: builder,
            builders: {
                complete: complete
            }
        })
    });
});

