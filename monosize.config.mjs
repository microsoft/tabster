import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import gitStorage from "monosize-storage-git";
import webpackBundler from "monosize-bundler-webpack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localBaseReport = process.env.MONOSIZE_BASE_REPORT;

/** @type {import('monosize').StorageAdapter} */
const storage = localBaseReport
    ? {
          async getRemoteReport() {
              const { name: packageName } = JSON.parse(
                  fs.readFileSync(
                      path.resolve(__dirname, "package.json"),
                      "utf8"
                  )
              );
              const report = JSON.parse(
                  fs.readFileSync(path.resolve(localBaseReport), "utf8")
              );

              return {
                  commitSHA: process.env.MONOSIZE_BASE_SHA || "",
                  remoteReport: report.map((entry) => ({
                      packageName,
                      ...entry,
                  })),
              };
          },
          async uploadReportToRemote() {
              throw new Error("Local bundle-size storage is read-only.");
          },
      }
    : gitStorage({
          owner: "microsoft",
          repo: "tabster",
          workflowFileName: "bundle-size-base.yml",
          outputPath: path.resolve(__dirname, "monosize-report.json"),
      });

/** @type {import('monosize').MonoSizeConfig} */
const config = {
    repository: "https://github.com/microsoft/tabster",
    storage,
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
