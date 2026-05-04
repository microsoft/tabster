#!/usr/bin/env node
/**
 * Custom bundle analyzer.
 *
 * For each fixture in bundle-size/:
 *   1. Builds it with webpack in production mode + source-map devtool
 *      using the same `tabster` alias as monosize.config.mjs.
 *   2. Walks every byte of the minified output, asks the source map which
 *      original source each byte belongs to, and aggregates per-source totals.
 *   3. Prints a sorted breakdown (source file → bytes → % of fixture).
 *
 * Usage:
 *   node scripts/analyze-bundle.mjs                  # all fixtures
 *   node scripts/analyze-bundle.mjs createTabster    # one fixture (basename match)
 */

import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import webpack from "webpack";
import TerserWebpackPlugin from "terser-webpack-plugin";
import { SourceMapConsumer } from "source-map";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fixtureDir = path.join(repoRoot, "bundle-size");
const tabsterDist = path.join(repoRoot, "dist/esm/index.js");

async function build(fixturePath, outDir) {
    return new Promise((resolve, reject) => {
        webpack(
            {
                name: "analyze",
                target: "web",
                mode: "production",
                devtool: "source-map",
                entry: fixturePath,
                output: {
                    filename: "bundle.js",
                    path: outDir,
                },
                resolve: {
                    alias: {
                        tabster: tabsterDist,
                    },
                },
                performance: { hints: false },
                externals: { react: "React", "react-dom": "ReactDOM" },
                optimization: {
                    minimizer: [
                        new TerserWebpackPlugin({
                            extractComments: false,
                            terserOptions: {
                                sourceMap: true,
                                format: { comments: false },
                            },
                        }),
                    ],
                },
            },
            (err, stats) => {
                if (err) return reject(err);
                if (stats.hasErrors()) {
                    return reject(stats.compilation.errors.join("\n"));
                }
                resolve();
            }
        );
    });
}

function normalizeSource(src) {
    if (!src) return "<unknown>";
    if (src.startsWith("webpack://")) {
        // webpack:///./relative/path or webpack:///external "..."
        const stripped = src.replace(/^webpack:\/+/, "").replace(/^[^/]+\//, "");
        return stripped.replace(/^\.\//, "");
    }
    return src;
}

function bucket(source) {
    if (source === "<unknown>") return "<unknown>";
    if (source.includes("/node_modules/")) {
        const parts = source.split("/node_modules/").pop().split("/");
        if (parts[0]?.startsWith("@")) {
            return `node_modules/${parts[0]}/${parts[1]}`;
        }
        return `node_modules/${parts[0]}`;
    }
    // bundle-size fixture path
    if (source.includes("/bundle-size/")) {
        return "bundle-size/" + source.split("/bundle-size/").pop();
    }
    // tabster src
    if (source.includes("/dist/esm/")) {
        return "tabster:" + source.split("/dist/esm/").pop();
    }
    if (source.startsWith("dist/esm/")) {
        return "tabster:" + source.slice("dist/esm/".length);
    }
    return source;
}

async function attribute(bundlePath) {
    const code = await fs.readFile(bundlePath, "utf8");
    const map = JSON.parse(await fs.readFile(bundlePath + ".map", "utf8"));

    const totals = new Map();
    const consumer = await new SourceMapConsumer(map);

    try {
        // Walk every line/column in the minified file. For each byte (a
        // single character — fine for ASCII-heavy minified output), ask the
        // map which original source it came from.
        const lines = code.split("\n");
        for (let line = 0; line < lines.length; line++) {
            const lineText = lines[line];
            if (!lineText) continue;
            // The map gives us segments; we sample at every column in the
            // minified line. SourceMapConsumer.originalPositionFor returns
            // the most recent mapping at-or-before the queried column.
            let lastSource = null;
            let runStart = 0;
            for (let col = 0; col <= lineText.length; col++) {
                const pos = consumer.originalPositionFor({
                    line: line + 1,
                    column: col,
                });
                const src = pos.source ?? null;
                if (src !== lastSource) {
                    if (lastSource !== null) {
                        const key = bucket(normalizeSource(lastSource));
                        totals.set(
                            key,
                            (totals.get(key) ?? 0) + (col - runStart)
                        );
                    }
                    lastSource = src;
                    runStart = col;
                }
            }
            if (lastSource !== null) {
                const key = bucket(normalizeSource(lastSource));
                totals.set(
                    key,
                    (totals.get(key) ?? 0) + (lineText.length - runStart)
                );
            }
            // newline byte
            const key = bucket(normalizeSource(lastSource ?? "<unknown>"));
            totals.set(key, (totals.get(key) ?? 0) + 1);
        }
    } finally {
        consumer.destroy?.();
    }

    return { totals, totalSize: code.length };
}

async function analyzeFixture(fixturePath) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tabster-analyze-"));
    try {
        await build(fixturePath, tmp);
        const { totals, totalSize } = await attribute(
            path.join(tmp, "bundle.js")
        );

        const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
        return { rows, totalSize };
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
}

function fmtBytes(b) {
    if (b >= 1024) return (b / 1024).toFixed(2) + " kB";
    return b + " B";
}

function printReport(name, { rows, totalSize }, top = 25) {
    console.log(`\n=== ${name}  (${fmtBytes(totalSize)} total)`);
    let cumulative = 0;
    for (let i = 0; i < Math.min(rows.length, top); i++) {
        const [src, bytes] = rows[i];
        cumulative += bytes;
        const pct = ((bytes / totalSize) * 100).toFixed(1);
        console.log(
            `  ${pct.padStart(5)}%  ${fmtBytes(bytes).padStart(10)}  ${src}`
        );
    }
    if (rows.length > top) {
        const rest = rows.slice(top).reduce((s, [, b]) => s + b, 0);
        console.log(
            `  ${((rest / totalSize) * 100).toFixed(1).padStart(5)}%  ${fmtBytes(
                rest
            ).padStart(10)}  (${rows.length - top} more)`
        );
    }
}

async function main() {
    const filter = process.argv[2];
    const allFixtures = (await fs.readdir(fixtureDir))
        .filter((f) => f.endsWith(".fixture.js"))
        .map((f) => ({
            name: f.replace(/\.fixture\.js$/, ""),
            path: path.join(fixtureDir, f),
        }));

    const fixtures = filter
        ? allFixtures.filter((f) => f.name === filter)
        : allFixtures;

    if (fixtures.length === 0) {
        console.error(
            `No fixtures matched ${filter ?? "anything"}. Available:`,
            allFixtures.map((f) => f.name).join(", ")
        );
        process.exit(1);
    }

    for (const fx of fixtures) {
        const report = await analyzeFixture(fx.path);
        printReport(fx.name, report);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
