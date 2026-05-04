#!/usr/bin/env node
/**
 * Custom bundle analyzer with two modes:
 *
 *   bytes (default)       Per-source attribution. Builds each fixture with
 *                         webpack (production + source-map), then walks
 *                         every byte of the minified output and asks the
 *                         source map which original module each byte came
 *                         from. Aggregates per-source totals.
 *
 *   identifiers           Per-identifier frequency. Tokenizes the minified
 *                         output and reports the most-common identifiers by
 *                         occurrence × length. Surfaces names that survived
 *                         minification (typically property keys, since
 *                         Terser preserves those by default) so you can spot
 *                         long, frequently-touched names worth shortening.
 *
 *   both                  Run both reports for the same build.
 *
 * Usage:
 *   node scripts/analyze-bundle.mjs                          # all fixtures, bytes
 *   node scripts/analyze-bundle.mjs createTabster            # one fixture, bytes
 *   node scripts/analyze-bundle.mjs createTabster --mode=identifiers
 *   node scripts/analyze-bundle.mjs --mode=both              # all, both reports
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
        const stripped = src
            .replace(/^webpack:\/+/, "")
            .replace(/^[^/]+\//, "");
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

// JS reserved words + ubiquitous globals that we don't want cluttering the
// identifier-frequency report. They're not actionable: you can't rename
// them and they don't represent your code's surface.
const SKIP_IDENTIFIERS = new Set([
    "function",
    "return",
    "const",
    "let",
    "var",
    "void",
    "this",
    "true",
    "false",
    "null",
    "undefined",
    "typeof",
    "instanceof",
    "for",
    "while",
    "switch",
    "case",
    "default",
    "break",
    "continue",
    "new",
    "delete",
    "throw",
    "catch",
    "finally",
    "try",
    "class",
    "extends",
    "super",
    "static",
    "yield",
    "await",
    "async",
    "import",
    "export",
    "from",
    "as",
    "in",
    "of",
    "Object",
    "Array",
    "String",
    "Number",
    "Boolean",
    "Function",
    "Symbol",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "WeakRef",
    "Promise",
    "Date",
    "Math",
    "JSON",
    "Error",
    "RegExp",
    "globalThis",
    "window",
    "document",
    "console",
    "Node",
    "Element",
    "HTMLElement",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "FocusEvent",
    "NodeFilter",
    "module",
    "exports",
    "require",
]);

/**
 * Tokenizes the minified bundle to count identifiers by occurrence × length.
 * Marks each name as a property access (`.foo` / `["foo"]`) when every
 * occurrence appears in that position — those are the ones the minifier
 * leaves alone, so they're the actionable rename targets.
 */
function analyzeIdentifiers(code, minLen = 3) {
    /** @type {Map<string, { count: number; propCount: number }>} */
    const stats = new Map();

    const re = /[A-Za-z_$][\w$]*/g;
    let m;
    while ((m = re.exec(code)) !== null) {
        const name = m[0];
        if (name.length < minLen) continue;
        if (SKIP_IDENTIFIERS.has(name)) continue;
        // Skip numeric-looking suffixes from minified vars (they slip in rarely).
        if (/^\d/.test(name)) continue;

        const idx = m.index;
        const prev = idx > 0 ? code[idx - 1] : "";
        // Look back past a single quote to also catch `["foo"]` and `'foo':`.
        const isQuoted = prev === '"' || prev === "'";
        const isDot = prev === ".";

        const entry = stats.get(name) ?? { count: 0, propCount: 0 };
        entry.count++;
        if (isDot || isQuoted) entry.propCount++;
        stats.set(name, entry);
    }

    let totalIdentBytes = 0;
    const rows = [...stats.entries()]
        .map(([name, { count, propCount }]) => {
            const total = count * name.length;
            totalIdentBytes += total;
            return {
                name,
                count,
                len: name.length,
                total,
                kind:
                    propCount === count
                        ? "property"
                        : propCount === 0
                          ? "free"
                          : "mixed",
            };
        })
        .sort((a, b) => b.total - a.total);

    return { rows, totalIdentBytes };
}

async function analyzeFixture(fixturePath, mode) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tabster-analyze-"));
    try {
        await build(fixturePath, tmp);
        const bundlePath = path.join(tmp, "bundle.js");
        const code = await fs.readFile(bundlePath, "utf8");

        const result = { totalSize: code.length };

        if (mode === "bytes" || mode === "both") {
            const { totals } = await attribute(bundlePath);
            result.bytes = [...totals.entries()].sort((a, b) => b[1] - a[1]);
        }

        if (mode === "identifiers" || mode === "both") {
            result.identifiers = analyzeIdentifiers(code);
        }

        return result;
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
}

function fmtBytes(b) {
    if (b >= 1024) return (b / 1024).toFixed(2) + " kB";
    return b + " B";
}

function printBytesReport(name, rows, totalSize, top = 25) {
    console.log(`\n=== ${name}  bytes  (${fmtBytes(totalSize)} total)`);
    for (let i = 0; i < Math.min(rows.length, top); i++) {
        const [src, bytes] = rows[i];
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

function printIdentifiersReport(
    name,
    { rows, totalIdentBytes },
    totalSize,
    top = 30
) {
    console.log(
        `\n=== ${name}  identifiers  (${fmtBytes(totalIdentBytes)} of ${fmtBytes(totalSize)} = ${(
            (totalIdentBytes / totalSize) *
            100
        ).toFixed(1)}%)`
    );
    console.log(
        `  ${"count".padStart(6)} ${"len".padStart(4)} ${"total".padStart(8)}  kind      name`
    );
    for (let i = 0; i < Math.min(rows.length, top); i++) {
        const r = rows[i];
        console.log(
            `  ${String(r.count).padStart(6)} ${String(r.len).padStart(4)} ${fmtBytes(
                r.total
            ).padStart(8)}  ${r.kind.padEnd(8)}  ${r.name}`
        );
    }
}

async function main() {
    const args = process.argv.slice(2);
    let mode = "bytes";
    const positional = [];
    for (const a of args) {
        if (a.startsWith("--mode=")) {
            mode = a.slice("--mode=".length);
        } else if (a === "--help" || a === "-h") {
            console.log(
                "usage: analyze-bundle [<fixture>] [--mode=bytes|identifiers|both]"
            );
            return;
        } else {
            positional.push(a);
        }
    }
    if (!["bytes", "identifiers", "both"].includes(mode)) {
        console.error(`unknown mode: ${mode}`);
        process.exit(1);
    }

    const filter = positional[0];
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
        const report = await analyzeFixture(fx.path, mode);
        if (report.bytes) {
            printBytesReport(fx.name, report.bytes, report.totalSize);
        }
        if (report.identifiers) {
            printIdentifiersReport(
                fx.name,
                report.identifiers,
                report.totalSize
            );
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
