import { mkdirSync, writeFileSync } from "node:fs";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { babel } from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import typescript from "rollup-plugin-typescript2";
import dts from "rollup-plugin-dts";

import pkg from "./package.json" with { type: "json" };

const extensions = [".ts"];

const SUBPATH_GETTERS = [
    "getCrossOrigin",
    "getDeloser",
    "getGroupper",
    "getModalizer",
    "getMover",
    "getObservedElement",
    "getOutline",
    "getRestorer",
];

/**
 * Emits per-subpath .d.ts stubs that re-export from the rolled-up
 * `dist/index.d.ts`, so `tabster/mover` etc. share a single declaration
 * site with the main entry (avoids duplicate-type-with-different-shape
 * mismatches when mixing main and subpath imports).
 */
const subpathTypeStubs = () => ({
    name: "emit-subpath-dts-stubs",
    writeBundle() {
        mkdirSync("dist/get", { recursive: true });
        for (const name of SUBPATH_GETTERS) {
            writeFileSync(
                `dist/get/${name}.d.ts`,
                `export { ${name} } from "../index";\n`
            );
        }
    },
});

/**
 * @type {import('rollup').RollupOptions}
 */
const config = [
    {
        input: "./src/index.ts",
        output: [
            {
                dir: "dist/cjs",
                format: "cjs",
                sourcemap: true,
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "[name].js",
                exports: "named",
            },
            {
                dir: "dist/esm",
                format: "es",
                sourcemap: true,
                preserveModules: true,
                preserveModulesRoot: "src",
                entryFileNames: "[name].js",
            },
        ],
        external: ["tslib", "keyborg"],
        plugins: [
            typescript({
                useTsconfigDeclarationDir: true,
                tsconfig: "src/tsconfig.lib.json",
                tsconfigOverride: {
                    compilerOptions: {
                        // https://github.com/ezolenko/rollup-plugin-typescript2/issues/268
                        emitDeclarationOnly: false,
                        stripInternal: true,
                    },
                },
            }),
            babel({
                babelHelpers: "bundled",
                extensions,
                exclude: "node_modules/**",
            }),
            json(),
            replace({
                preventAssignment: true,
                __DEV__: `process.env.NODE_ENV === 'development'`,
                __VERSION__: JSON.stringify(pkg.version),
            }),
            commonjs({ extensions }),
            resolve({ extensions, mainFields: ["module", "main"] }),
        ],
    },
    {
        input: "./dist/dts/index.d.ts",
        output: [{ file: "dist/index.d.ts", format: "es" }],
        // rolls up all dts files into a single dts file
        // so that internal types don't leak
        plugins: [dts(), subpathTypeStubs()],
    },
];

export default config;
