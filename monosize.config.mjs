import path from "node:path";
import { fileURLToPath } from "node:url";
import webpackBundler from "monosize-bundler-webpack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    bundler: webpackBundler((config) => {
        config.resolve = config.resolve ?? {};
        config.resolve.alias = {
            ...(config.resolve.alias ?? {}),
            tabster: path.resolve(__dirname, "./dist/tabster.esm.js"),
        };
        return config;
    }),
};
