import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import sourceMaps from "rollup-plugin-sourcemaps";
import { babel } from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

import pkg from "./package.json";

const extensions = [".ts"];

/**
 * @type {import('rollup').RollupOptions}
 */
const config = [
    {
        input: "./src/index.ts",
        output: [
            { file: pkg.main, format: "cjs", sourcemap: true },
            { file: pkg.module, format: "es", sourcemap: true },
        ],
        external: ["tslib", "keyborg"],
        plugins: [
            typescript({
                tsconfig: "./src/tsconfig.lib.json",
                emitDeclarationOnly: true,
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
            sourceMaps(),
        ],
    },
    {
        // path to your declaration files root
        input: "./dist/dts/index.d.ts",
        output: [{ file: "dist/index.d.ts", format: "es" }],
        plugins: [dts()],
    },
];

export default config;
