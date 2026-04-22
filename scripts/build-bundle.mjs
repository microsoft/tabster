// Replaces Rollup. Run after `tsc -p src/tsconfig.lib.json` has emitted
// ESM .js + .d.ts files to dist/esm/. This script then:
//   1. inlines __DEV__ and __VERSION__ in dist/esm/*.js (TSC does not
//      substitute ambient globals);
//   2. converts every emitted dist/esm/*.js into a CJS sibling under
//      dist/cjs/*.cjs via @swc/core;
//   3. rewrites relative ".js" require specifiers in the CJS output to
//      ".cjs", since the root package is "type": "module".
//
// Inspired by microsoft/griffel's tools/build-cjs.mjs — the key idea
// is to let TSC do the TypeScript→JavaScript work once, and SWC only
// handles the ESM→CJS module-format translation.

import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformFile as swcTransformFile } from "@swc/core";

const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);
const esmDir = path.join(projectRoot, "dist", "esm");
const cjsDir = path.join(projectRoot, "dist", "cjs");

const pkg = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8")
);

async function walk(dir, matcher) {
    const out = [];
    for (const name of await readdir(dir)) {
        const full = path.join(dir, name);
        const info = await stat(full);
        if (info.isDirectory()) {
            out.push(...(await walk(full, matcher)));
        } else if (matcher(full)) {
            out.push(full);
        }
    }
    return out;
}

async function inlineGlobalsInEsm() {
    const jsFiles = await walk(esmDir, (p) => p.endsWith(".js"));
    const versionLiteral = JSON.stringify(pkg.version);
    const devExpr = "(process.env.NODE_ENV === 'development')";
    for (const file of jsFiles) {
        const original = await readFile(file, "utf8");
        const replaced = original
            .replace(/\b__VERSION__\b/g, versionLiteral)
            .replace(/\b__DEV__\b/g, devExpr);
        if (replaced !== original) {
            await writeFile(file, replaced);
        }
    }
}

async function buildCjs() {
    const jsFiles = await walk(esmDir, (p) => p.endsWith(".js"));
    for (const absInput of jsFiles) {
        const rel = path.relative(esmDir, absInput);
        const absOutput = path.join(cjsDir, rel.replace(/\.js$/, ".cjs"));
        const result = await swcTransformFile(absInput, {
            module: { type: "commonjs", strict: true },
            jsc: {
                parser: { syntax: "ecmascript" },
                target: "es2019",
            },
            sourceMaps: true,
        });
        const cjsCode = result.code.replace(
            /(require\(["']\.\.?\/[^"']+)\.js(["']\))/g,
            "$1.cjs$2"
        );
        await mkdir(path.dirname(absOutput), { recursive: true });
        await writeFile(absOutput, cjsCode);
        if (result.map) {
            await writeFile(absOutput + ".map", result.map);
        }
    }
}

await inlineGlobalsInEsm();
await buildCjs();
