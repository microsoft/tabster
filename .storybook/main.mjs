// .storybook/main.js
import { mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
    framework: {
        name: "@storybook/html-vite",
        options: {},
    },

    stories: ["../stories/**/*.stories.@(js|jsx|ts|tsx)"],

    addons: [],

    viteFinal: async (viteConfig, { configType }) => {
        const isDev = configType === "DEVELOPMENT";

        return mergeConfig(viteConfig, {
            define: {
                __DEV__: JSON.stringify(isDev),
                __VERSION__: JSON.stringify(version),
            },
            plugins: [tsconfigPaths()],
        });
    },

    docs: {},
};

export default config;
