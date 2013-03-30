/*global define*/
define([
    'scalejs!core',
    './scalejs.functional/functional',
    './scalejs.functional/builder'
], function (
    core,
    functional,
    builder
) {
    'use strict';

    core.registerExtension({
        functional: core.object.merge(functional, { builder: builder })
    });
});

