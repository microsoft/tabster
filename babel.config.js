/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = (api) => {
    const isTest = api.env("test");

    const presetEnv = isTest
        ? ["@babel/preset-env", { targets: { node: "current" } }]
        : [
              "@babel/preset-env",
              {
                  modules: false,
                  loose: true,
                  forceAllTransforms: true,
              },
          ];

    return {
        presets: ["@babel/preset-typescript", presetEnv],
        plugins: [
            [
                "@babel/plugin-transform-react-jsx",
                { pragma: "BroTest.createElementString" },
            ],
            "babel-plugin-annotate-pure-calls",
        ],
    };
};
