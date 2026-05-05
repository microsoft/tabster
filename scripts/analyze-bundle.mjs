#!/usr/bin/env node
/**
 * Custom bundle analyzer.
 *
 * Modes:
 *   bytes (default)     Per-source byte attribution. Builds the fixture with
 *                       webpack (production + source-map), walks every byte
 *                       of the minified output, asks the source map which
 *                       original module each byte came from, and totals per
 *                       source.
 *
 *   functions           `bytes` plus a per-function drilldown. Parses each
 *                       referenced dist/esm/*.js with @babel/parser to find
 *                       function/method/arrow ranges, then attributes
 *                       source-mapped bytes to the enclosing function so we
 *                       can see which methods inside a heavy file dominate
 *                       its size.
 *
 *   identifiers         Per-identifier frequency. Tokenizes the minified
 *                       output and reports the most-common identifiers by
 *                       occurrence × length. Surfaces names that survived
 *                       minification (typically property keys, since Terser
 *                       preserves those by default).
 *
 *   exports             Used-exports report. Rebuilds the fixture with
 *                       optimization.usedExports = true and
 *                       concatenateModules = false, then dumps each tabster
 *                       module's provided exports plus which ones the
 *                       fixture actually used.
 *
 *   both                `bytes` + `identifiers` for the same build.
 *
 * Diff:
 *   --diff <baseline> <target>
 *                       Build both fixtures and print a per-source delta
 *                       sorted by |delta|. Combine with --mode=functions to
 *                       also drill into per-function deltas, or
 *                       --mode=exports to diff used exports per module.
 *
 * Usage:
 *   node scripts/analyze-bundle.mjs                                 # all fixtures, bytes
 *   node scripts/analyze-bundle.mjs createTabster                   # one fixture, bytes
 *   node scripts/analyze-bundle.mjs createTabster --mode=identifiers
 *   node scripts/analyze-bundle.mjs getModalizer  --mode=functions
 *   node scripts/analyze-bundle.mjs getModalizer  --mode=exports
 *   node scripts/analyze-bundle.mjs --diff createTabster getModalizer
 *   node scripts/analyze-bundle.mjs --diff createTabster getModalizer --mode=functions
 *   node scripts/analyze-bundle.mjs --diff createTabster getModalizer --mode=exports
 */

import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import webpack from "webpack";
import TerserWebpackPlugin from "terser-webpack-plugin";
import { SourceMapConsumer } from "source-map";
import { parse as babelParse } from "@babel/parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fixtureDir = path.join(repoRoot, "bundle-size");
const tabsterDist = path.join(repoRoot, "dist/esm/index.js");

function baseWebpackConfig(fixturePath, outDir) {
    return {
        name: "analyze",
        target: "web",
        mode: "production",
        devtool: "source-map",
        entry: fixturePath,
        output: { filename: "bundle.js", path: outDir },
        resolve: { alias: { tabster: tabsterDist } },
        performance: { hints: false },
        externals: { react: "React", "react-dom": "ReactDOM" },
    };
}

async function build(fixturePath, outDir) {
    return new Promise((resolve, reject) => {
        const config = baseWebpackConfig(fixturePath, outDir);
        config.optimization = {
            minimizer: [
                new TerserWebpackPlugin({
                    extractComments: false,
                    terserOptions: {
                        sourceMap: true,
                        format: { comments: false },
                    },
                }),
            ],
        };
        webpack(config, (err, stats) => {
            if (err) return reject(err);
            if (stats.hasErrors()) {
                return reject(stats.compilation.errors.join("\n"));
            }
            resolve();
        });
    });
}

async function buildForExports(fixturePath, outDir) {
    return new Promise((resolve, reject) => {
        const config = baseWebpackConfig(fixturePath, outDir);
        // Disable concatenation + minification so each module shows up as a
        // distinct stats entry with its providedExports/usedExports intact.
        config.optimization = {
            usedExports: true,
            providedExports: true,
            concatenateModules: false,
            minimize: false,
            sideEffects: true,
        };
        webpack(config, (err, stats) => {
            if (err) return reject(err);
            if (stats.hasErrors()) {
                return reject(stats.compilation.errors.join("\n"));
            }
            resolve(
                stats.toJson({
                    all: false,
                    modules: true,
                    usedExports: true,
                    providedExports: true,
                })
            );
        });
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

/**
 * Parses an ESM source file and returns a flat list of function-like ranges
 * with resolved names. Each entry is `{ name, startLine, startCol, endLine,
 * endCol }` (1-based lines, 0-based columns — matching the source-map
 * convention used by SourceMapConsumer).
 */
function extractFunctions(code) {
    let ast;
    try {
        ast = babelParse(code, {
            sourceType: "module",
            errorRecovery: true,
        });
    } catch {
        return [];
    }

    const funcs = [];

    function visit(node, ctx) {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
            for (const c of node) visit(c, ctx);
            return;
        }
        if (typeof node.type !== "string") return;

        let funcName = null;
        switch (node.type) {
            case "FunctionDeclaration":
                funcName = node.id?.name ?? "<anonymous>";
                break;
            case "FunctionExpression":
                funcName = node.id?.name ?? ctx.parentName ?? "<anonymous>";
                break;
            case "ArrowFunctionExpression":
                funcName = ctx.parentName ?? "<arrow>";
                break;
            case "ClassMethod":
            case "ClassPrivateMethod": {
                const className = ctx.className ?? "<class>";
                const methodName =
                    node.key?.name ??
                    node.key?.id?.name ??
                    node.key?.value ??
                    "<computed>";
                funcName =
                    node.kind === "constructor"
                        ? `${className}.constructor`
                        : `${className}.${methodName}`;
                break;
            }
            case "ObjectMethod":
                funcName = node.key?.name ?? "<obj-method>";
                break;
        }

        if (funcName !== null && node.loc) {
            funcs.push({
                name: funcName,
                startLine: node.loc.start.line,
                startCol: node.loc.start.column,
                endLine: node.loc.end.line,
                endCol: node.loc.end.column,
            });
        }

        // Threaded context: name hints for the next anonymous function and
        // the enclosing class name for methods.
        let nextCtx = ctx;
        if (
            node.type === "ClassDeclaration" ||
            node.type === "ClassExpression"
        ) {
            nextCtx = {
                ...ctx,
                className: node.id?.name ?? ctx.className ?? "<class>",
            };
        } else if (
            node.type === "VariableDeclarator" &&
            node.id?.type === "Identifier"
        ) {
            nextCtx = { ...ctx, parentName: node.id.name };
        } else if (
            node.type === "AssignmentExpression" &&
            node.left?.type === "Identifier"
        ) {
            nextCtx = { ...ctx, parentName: node.left.name };
        } else if (
            (node.type === "ObjectProperty" || node.type === "Property") &&
            node.key?.type === "Identifier"
        ) {
            nextCtx = { ...ctx, parentName: node.key.name };
        }

        for (const key of Object.keys(node)) {
            if (
                key === "loc" ||
                key === "range" ||
                key === "start" ||
                key === "end" ||
                key === "type" ||
                key === "extra" ||
                key === "leadingComments" ||
                key === "trailingComments" ||
                key === "innerComments"
            )
                continue;
            visit(node[key], nextCtx);
        }
    }

    visit(ast.program, {});
    return funcs;
}

/**
 * Returns the smallest function range enclosing (line, col), or
 * "<top-level>" if no function contains the position. Lines are 1-based,
 * columns 0-based.
 */
function findEnclosingFunction(funcs, line, col) {
    let best = null;
    let bestSize = Infinity;
    for (const f of funcs) {
        if (line < f.startLine || line > f.endLine) continue;
        if (line === f.startLine && col < f.startCol) continue;
        if (line === f.endLine && col > f.endCol) continue;
        const size =
            (f.endLine - f.startLine) * 100000 + (f.endCol - f.startCol);
        if (size < bestSize) {
            best = f;
            bestSize = size;
        }
    }
    return best?.name ?? "<top-level>";
}

async function attribute(bundlePath, { withFunctions = false } = {}) {
    const code = await fs.readFile(bundlePath, "utf8");
    const map = JSON.parse(await fs.readFile(bundlePath + ".map", "utf8"));

    const totals = new Map(); // bucketKey -> bytes
    const funcTotals = new Map(); // bucketKey -> Map<funcName, bytes>
    const consumer = await new SourceMapConsumer(map);

    // Lazy per-source function ranges keyed by the exact `pos.source` string
    // returned by the consumer (avoids string-mismatch with map.sources[i]).
    const funcRanges = new Map();
    function rangesFor(src) {
        if (!withFunctions || !src) return null;
        if (funcRanges.has(src)) return funcRanges.get(src);
        let content = null;
        try {
            content = consumer.sourceContentFor(src, true);
        } catch {
            content = null;
        }
        const ranges = content ? extractFunctions(content) : [];
        funcRanges.set(src, ranges);
        return ranges;
    }

    // Memoize function lookups: src -> Map<line*100000+col, funcName>.
    const funcCache = new Map();
    function lookupFunc(src, line, col) {
        if (!withFunctions || !src) return null;
        const ranges = rangesFor(src);
        if (!ranges || ranges.length === 0) return "<top-level>";
        let cache = funcCache.get(src);
        if (!cache) {
            cache = new Map();
            funcCache.set(src, cache);
        }
        const key = line * 100000 + col;
        const hit = cache.get(key);
        if (hit !== undefined) return hit;
        const name = findEnclosingFunction(ranges, line, col);
        cache.set(key, name);
        return name;
    }

    const addBytes = (bucketKey, bytes, funcName) => {
        totals.set(bucketKey, (totals.get(bucketKey) ?? 0) + bytes);
        if (withFunctions) {
            let fmap = funcTotals.get(bucketKey);
            if (!fmap) {
                fmap = new Map();
                funcTotals.set(bucketKey, fmap);
            }
            const fn = funcName ?? "<top-level>";
            fmap.set(fn, (fmap.get(fn) ?? 0) + bytes);
        }
    };

    try {
        // Walk every line/column in the minified file. For each byte (a
        // single character — fine for ASCII-heavy minified output), ask the
        // map which original source it came from.
        const lines = code.split("\n");
        for (let line = 0; line < lines.length; line++) {
            const lineText = lines[line];
            if (!lineText) continue;
            let lastSource = null;
            let lastFunc = null;
            let runStart = 0;
            for (let col = 0; col <= lineText.length; col++) {
                const pos = consumer.originalPositionFor({
                    line: line + 1,
                    column: col,
                });
                const src = pos.source ?? null;
                const func = withFunctions
                    ? lookupFunc(src, pos.line ?? 0, pos.column ?? 0)
                    : null;
                if (src !== lastSource || func !== lastFunc) {
                    if (lastSource !== null) {
                        addBytes(
                            bucket(normalizeSource(lastSource)),
                            col - runStart,
                            lastFunc
                        );
                    }
                    lastSource = src;
                    lastFunc = func;
                    runStart = col;
                }
            }
            if (lastSource !== null) {
                addBytes(
                    bucket(normalizeSource(lastSource)),
                    lineText.length - runStart,
                    lastFunc
                );
            }
            // newline byte
            addBytes(
                bucket(normalizeSource(lastSource ?? "<unknown>")),
                1,
                lastFunc
            );
        }
    } finally {
        consumer.destroy?.();
    }

    return { totals, funcTotals, totalSize: code.length };
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
        if (mode === "exports") {
            const stats = await buildForExports(fixturePath, tmp);
            return { exports: stats };
        }

        await build(fixturePath, tmp);
        const bundlePath = path.join(tmp, "bundle.js");
        const code = await fs.readFile(bundlePath, "utf8");

        const result = { totalSize: code.length };
        const wantBytes =
            mode === "bytes" || mode === "both" || mode === "functions";
        const wantFunctions = mode === "functions";
        const wantIdentifiers = mode === "identifiers" || mode === "both";

        if (wantBytes) {
            const { totals, funcTotals } = await attribute(bundlePath, {
                withFunctions: wantFunctions,
            });
            result.bytes = [...totals.entries()].sort((a, b) => b[1] - a[1]);
            if (wantFunctions) {
                result.functions = funcTotals;
            }
        }

        if (wantIdentifiers) {
            result.identifiers = analyzeIdentifiers(code);
        }

        return result;
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
}

function fmtBytes(b) {
    const sign = b < 0 ? "-" : "";
    const abs = Math.abs(b);
    if (abs >= 1024) return sign + (abs / 1024).toFixed(2) + " kB";
    return sign + abs + " B";
}

function fmtSigned(b) {
    if (b > 0) return "+" + fmtBytes(b);
    return fmtBytes(b);
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

function printFunctionsReport(
    name,
    rows,
    funcTotals,
    totalSize,
    { topSources = 8, topFunctions = 8, minBytes = 80 } = {}
) {
    console.log(
        `\n=== ${name}  bytes by source / function  (${fmtBytes(totalSize)} total)`
    );
    for (let i = 0; i < Math.min(rows.length, topSources); i++) {
        const [src, bytes] = rows[i];
        const pct = ((bytes / totalSize) * 100).toFixed(1);
        console.log(
            `  ${pct.padStart(5)}%  ${fmtBytes(bytes).padStart(10)}  ${src}`
        );
        const fmap = funcTotals.get(src);
        if (!fmap) continue;
        const fns = [...fmap.entries()].sort((a, b) => b[1] - a[1]);
        const shownFns = fns
            .filter(([, b]) => b >= minBytes)
            .slice(0, topFunctions);
        for (const [fn, b] of shownFns) {
            const sub = ((b / bytes) * 100).toFixed(1);
            console.log(
                `         ${sub.padStart(5)}%  ${fmtBytes(b).padStart(9)}    ${fn}`
            );
        }
        const shownTotal = shownFns.reduce((s, [, b]) => s + b, 0);
        const rest = bytes - shownTotal;
        if (rest > minBytes && fns.length > shownFns.length) {
            const sub = ((rest / bytes) * 100).toFixed(1);
            console.log(
                `         ${sub.padStart(5)}%  ${fmtBytes(rest).padStart(9)}    (${fns.length - shownFns.length} more)`
            );
        }
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

function printDiffReport(
    baselineName,
    targetName,
    base,
    tgt,
    { topSources = 25 } = {}
) {
    const baseMap = new Map(base.bytes);
    const tgtMap = new Map(tgt.bytes);
    const allKeys = new Set([...baseMap.keys(), ...tgtMap.keys()]);
    const rows = [...allKeys]
        .map((k) => {
            const a = baseMap.get(k) ?? 0;
            const b = tgtMap.get(k) ?? 0;
            return { source: k, baseline: a, target: b, delta: b - a };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const totalDelta = tgt.totalSize - base.totalSize;
    console.log(
        `\n=== diff ${baselineName} → ${targetName}  (${fmtBytes(base.totalSize)} → ${fmtBytes(tgt.totalSize)}, ${fmtSigned(totalDelta)})`
    );
    console.log(
        `  ${"delta".padStart(10)}  ${"baseline".padStart(10)}  ${"target".padStart(10)}  source`
    );
    let shown = 0;
    let nonZero = 0;
    for (const r of rows) {
        if (r.delta === 0) continue;
        nonZero++;
        if (shown >= topSources) continue;
        const tag =
            r.baseline === 0
                ? "  (new)"
                : r.target === 0
                  ? "  (gone)"
                  : "";
        console.log(
            `  ${fmtSigned(r.delta).padStart(10)}  ${fmtBytes(r.baseline).padStart(10)}  ${fmtBytes(r.target).padStart(10)}  ${r.source}${tag}`
        );
        shown++;
    }
    if (nonZero > shown) {
        console.log(`  ...  (${nonZero - shown} more non-zero deltas)`);
    }
    const unchanged = rows.length - nonZero;
    if (unchanged > 0) {
        console.log(`  (${unchanged} sources unchanged)`);
    }
}

function printDiffFunctionsReport(
    baselineName,
    targetName,
    base,
    tgt,
    { topSources = 6, topFunctions = 8, minBytes = 50 } = {}
) {
    if (!base.functions || !tgt.functions) return;
    const allSources = new Set([
        ...base.functions.keys(),
        ...tgt.functions.keys(),
    ]);
    const sourceDeltas = [...allSources].map((src) => {
        const baseFns = base.functions.get(src) ?? new Map();
        const tgtFns = tgt.functions.get(src) ?? new Map();
        const allFns = new Set([...baseFns.keys(), ...tgtFns.keys()]);
        let totalDelta = 0;
        for (const fn of allFns) {
            totalDelta += (tgtFns.get(fn) ?? 0) - (baseFns.get(fn) ?? 0);
        }
        return { src, totalDelta, baseFns, tgtFns, allFns };
    });
    sourceDeltas.sort(
        (a, b) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta)
    );

    console.log(
        `\n=== diff ${baselineName} → ${targetName}  per-function deltas`
    );
    let shown = 0;
    for (const s of sourceDeltas) {
        if (s.totalDelta === 0) continue;
        if (shown >= topSources) break;
        console.log(`  ${fmtSigned(s.totalDelta).padStart(10)}  ${s.src}`);
        const fnRows = [...s.allFns]
            .map((fn) => {
                const a = s.baseFns.get(fn) ?? 0;
                const b = s.tgtFns.get(fn) ?? 0;
                return { fn, a, b, delta: b - a };
            })
            .filter((r) => Math.abs(r.delta) >= minBytes)
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .slice(0, topFunctions);
        for (const r of fnRows) {
            const tag =
                r.a === 0 ? "  (new)" : r.b === 0 ? "  (gone)" : "";
            console.log(
                `         ${fmtSigned(r.delta).padStart(10)}    ${r.fn}${tag}`
            );
        }
        shown++;
    }
}

function tabsterModuleId(identifier) {
    if (!identifier) return null;
    const idx = identifier.lastIndexOf("/dist/esm/");
    if (idx === -1) return null;
    // Strip resolution suffix like "|module" or "|esm" if present.
    let p = identifier.slice(idx + "/dist/esm/".length);
    p = p.split("|")[0];
    return "tabster:" + p;
}

function exportsFromStats(statsJson) {
    /** @type {Map<string, { provided: string[], used: string[], unused: string[] }>} */
    const byModule = new Map();
    for (const m of statsJson.modules ?? []) {
        const id = tabsterModuleId(m.identifier);
        if (!id) continue;
        const provided = Array.isArray(m.providedExports)
            ? m.providedExports.slice()
            : m.providedExports === true
              ? ["<all>"]
              : [];
        let used;
        if (Array.isArray(m.usedExports)) {
            used = m.usedExports.slice();
        } else if (m.usedExports === true) {
            used = provided.slice();
        } else {
            used = [];
        }
        const usedSet = new Set(used);
        const unused = provided.filter((e) => !usedSet.has(e));
        byModule.set(id, { provided, used, unused });
    }
    return byModule;
}

function printExportsReport(name, statsJson) {
    console.log(`\n=== ${name}  used exports`);
    const byModule = exportsFromStats(statsJson);
    const ids = [...byModule.keys()].sort();
    for (const id of ids) {
        const r = byModule.get(id);
        console.log(`  ${id}`);
        console.log(
            `    provided (${r.provided.length}): ${r.provided.join(", ") || "<none>"}`
        );
        console.log(
            `    used     (${r.used.length}): ${r.used.join(", ") || "<none>"}`
        );
        if (r.unused.length > 0) {
            console.log(
                `    unused   (${r.unused.length}): ${r.unused.join(", ")}`
            );
        }
    }
}

function printDiffExportsReport(baselineName, targetName, base, tgt) {
    console.log(`\n=== diff ${baselineName} → ${targetName}  used exports`);
    const baseExp = exportsFromStats(base);
    const tgtExp = exportsFromStats(tgt);
    const allIds = new Set([...baseExp.keys(), ...tgtExp.keys()]);
    let printed = 0;
    for (const id of [...allIds].sort()) {
        const baseUsed = new Set(baseExp.get(id)?.used ?? []);
        const tgtUsed = new Set(tgtExp.get(id)?.used ?? []);
        const added = [...tgtUsed].filter((e) => !baseUsed.has(e));
        const removed = [...baseUsed].filter((e) => !tgtUsed.has(e));
        if (added.length === 0 && removed.length === 0) continue;
        const tag = !baseExp.has(id)
            ? "  (new module)"
            : !tgtExp.has(id)
              ? "  (gone)"
              : "";
        console.log(`  ${id}${tag}`);
        if (added.length > 0) {
            console.log(`    +used: ${added.join(", ")}`);
        }
        if (removed.length > 0) {
            console.log(`    -used: ${removed.join(", ")}`);
        }
        printed++;
    }
    if (printed === 0) {
        console.log("  (no used-export differences)");
    }
}

async function main() {
    const args = process.argv.slice(2);
    let mode = "bytes";
    let diffPair = null;
    const positional = [];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith("--mode=")) {
            mode = a.slice("--mode=".length);
        } else if (a === "--diff") {
            const baseline = args[++i];
            const target = args[++i];
            if (!baseline || !target) {
                console.error("--diff requires <baseline> <target>");
                process.exit(1);
            }
            diffPair = { baseline, target };
        } else if (a === "--help" || a === "-h") {
            console.log(
                "usage: analyze-bundle [<fixture>] [--mode=bytes|identifiers|functions|exports|both]\n" +
                    "       analyze-bundle --diff <baseline> <target> [--mode=bytes|functions|exports]"
            );
            return;
        } else {
            positional.push(a);
        }
    }
    if (
        !["bytes", "identifiers", "functions", "exports", "both"].includes(
            mode
        )
    ) {
        console.error(`unknown mode: ${mode}`);
        process.exit(1);
    }

    const allFixtures = (await fs.readdir(fixtureDir))
        .filter((f) => f.endsWith(".fixture.js"))
        .map((f) => ({
            name: f.replace(/\.fixture\.js$/, ""),
            path: path.join(fixtureDir, f),
        }));

    if (diffPair) {
        const baseline = allFixtures.find((f) => f.name === diffPair.baseline);
        const target = allFixtures.find((f) => f.name === diffPair.target);
        if (!baseline || !target) {
            console.error(
                `--diff: fixture not found. Available: ${allFixtures.map((f) => f.name).join(", ")}`
            );
            process.exit(1);
        }
        if (mode === "exports") {
            const [b, t] = await Promise.all([
                analyzeFixture(baseline.path, "exports"),
                analyzeFixture(target.path, "exports"),
            ]);
            printDiffExportsReport(
                baseline.name,
                target.name,
                b.exports,
                t.exports
            );
            return;
        }
        const fixtureMode = mode === "functions" ? "functions" : "bytes";
        const [b, t] = await Promise.all([
            analyzeFixture(baseline.path, fixtureMode),
            analyzeFixture(target.path, fixtureMode),
        ]);
        printDiffReport(baseline.name, target.name, b, t);
        if (fixtureMode === "functions") {
            printDiffFunctionsReport(baseline.name, target.name, b, t);
        }
        return;
    }

    const filter = positional[0];
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
        if (mode === "functions") {
            printFunctionsReport(
                fx.name,
                report.bytes,
                report.functions,
                report.totalSize
            );
        } else if (report.bytes) {
            printBytesReport(fx.name, report.bytes, report.totalSize);
        }
        if (report.identifiers) {
            printIdentifiersReport(
                fx.name,
                report.identifiers,
                report.totalSize
            );
        }
        if (report.exports) {
            printExportsReport(fx.name, report.exports);
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
