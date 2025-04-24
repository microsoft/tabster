const version = require("../package.json").version;
const webpack = require("webpack");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
    framework: {
        name: "@storybook/html-webpack5",
        options: {},
    },

    core: {
        builder: "@storybook/builder-webpack5",
    },

    stories: [
        "../stories/**/*.mdx",
        "../stories/**/*.stories.@(js|jsx|ts|tsx)",
    ],
    addons: [
        "@storybook/addon-links",
        "@storybook/addon-essentials",
        "@storybook/addon-webpack5-compiler-babel",
        "@storybook/html-webpack5",
    ],

    webpackFinal: async (config, type) => {
        const isDev = process.env.NODE_ENV !== "production";
        const isTest = process.env.NODE_ENV !== "test";
        config.plugins.push(
            new webpack.DefinePlugin({
                __DEV__: JSON.stringify(isDev),
                __VERSION__: `'${version}'`,
            })
        );
        const tsConfigPathsPlugin = new TsconfigPathsPlugin();
        if (config.resolve.plugins) {
            config.resolve.plugins.push(tsConfigPathsPlugin);
        } else {
            config.resolve.plugins = [tsConfigPathsPlugin];
        }

        return config;
    },

    docs: {},
};
