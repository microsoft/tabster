const path = require("path");
const webpack = require("webpack");
const version = require("../package.json").version;

module.exports = {
    stories: [
        "../src/**/*.stories.mdx",
        "../src/**/*.stories.@(js|jsx|ts|tsx)",
    ],
    addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
    webpackFinal: async (config, type) => {
        const isDev = process.env.NODE_ENV !== "production";
        const isTest = process.env.NODE_ENV !== "test";

        config.plugins.push(
            new webpack.DefinePlugin({
                __DEV__: JSON.stringify(isDev),
                __TEST__: JSON.stringify(isTest),
                __VERSION__: `'${version}'`,
            })
        );

        return config;
    },
};
