import path from "node:path";
import { fileURLToPath } from "node:url";
import gitStorage from "monosize-storage-git";
import webpackBundler from "monosize-bundler-webpack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('monosize').MonoSizeConfig} */
const config = {
    repository: "https://github.com/microsoft/tabster",
    storage: gitStorage({
        owner: "microsoft",
        repo: "tabster",
        workflowFileName: "bundle-size-base.yml",
        outputPath: path.resolve(__dirname, "monosize-report.json"),
    }),
    bundler: webpackBundler((config) => {
        config.resolve = config.resolve ?? {};
        config.resolve.alias = {
            ...(config.resolve.alias ?? {}),
            tabster: path.resolve(__dirname, "./dist/esm/index.js"),
        };
        return config;
    }),
};

export default config;
