// import storageAdapter from "monosize-storage-azure";
import webpackBundler from "monosize-bundler-webpack";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/** @type {import('monosize').MonoSizeConfig} */
const config = {
    repository: "https://github.com/microsoft/tabster",
    // storage: storageAdapter(),
    bundler: webpackBundler((config) => {
        const root = dirname(fileURLToPath(import.meta.url));
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...config.resolve.alias,
            "tabster/lite": join(root, "./dist/lite/index.esm.js"),
            tabster: join(root, "./dist/tabster.esm.js"),
        };
        return config;
    }),
    threshold: "20kB", // default is "10%"
};

export default config;
