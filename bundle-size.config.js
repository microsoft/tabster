/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const path = require("path");

module.exports = {
    webpack: (config) => {
        return {
            ...config,
            resolve: {
                ...config.resolve,
                alias: {
                    tabster: path.resolve(__dirname, "./dist/tabster.esm.js"),
                },
            },
        };
    },
};
