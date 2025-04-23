import fs from "node:fs";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import sourceMaps from "rollup-plugin-sourcemaps2";
import { babel } from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import typescript from "rollup-plugin-typescript2";
import dts from "rollup-plugin-dts";

const pkg = JSON.parse(
    fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")
);
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
            sourceMaps(),
        ],
    },
    {
        input: "./dist/dts/index.d.ts",
        output: [{ file: "dist/index.d.ts", format: "es" }],
        // rolls up all dts files into a single dts file
        // so that internal types don't leak
        plugins: [dts()],
    },
];

export default config;
