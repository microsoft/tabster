/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const { createRequire } = require("node:module");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { crc32 } = require("node:zlib");

const siteDir = path.resolve(__dirname, "..");
const mdxLoaderPath = require.resolve("@docusaurus/mdx-loader");
const requireFromMdxLoader = createRequire(mdxLoaderPath);
const fromFilePath = requireFromMdxLoader.resolve("image-size/fromFile");
const { imageSizeFromFile } = requireFromMdxLoader("image-size/fromFile");
const favicon = fs.readFileSync(
    path.join(siteDir, "static", "img", "favicon.png")
);

function temporaryDirectory(t) {
    const directory = fs.mkdtempSync(
        path.join(tmpdir(), "tabster-image-size-")
    );
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}

test("Docusaurus's image API preserves dimensions for every docs image", async () => {
    const images = fs
        .readdirSync(path.join(siteDir, "static", "img"), {
            recursive: true,
            withFileTypes: true,
        })
        .filter((entry) => entry.isFile());
    assert.ok(images.length > 0);

    for (const image of images) {
        assert.equal(
            path.extname(image.name),
            ".png",
            "The temporary image-size replacement only supports PNGs"
        );
        const file = path.join(image.parentPath, image.name);
        const png = fs.readFileSync(file);
        const result = imageSizeFromFile(file);
        assert.equal(typeof result.then, "function");
        assert.deepEqual(
            await result,
            {
                width: png.readUInt32BE(16),
                height: png.readUInt32BE(20),
                type: "png",
            },
            image.name
        );
    }
});

test("Docusaurus adds dimensions when transforming a Markdown image", async () => {
    const transformImage = require(
        path.join(
            path.dirname(mdxLoaderPath),
            "remark",
            "transformImage",
            "index.js"
        )
    ).default;
    const image = {
        type: "image",
        url: "/img/favicon.png",
        alt: "Tabster",
        title: null,
    };
    const tree = {
        type: "root",
        children: [{ type: "paragraph", children: [image] }],
    };
    const transform = transformImage({
        siteDir,
        staticDirs: [path.join(siteDir, "static")],
        onBrokenMarkdownImages: "throw",
    });
    await transform(tree, {
        path: path.join(siteDir, "docs", "intro.md"),
        data: { compilerName: "server" },
    });

    assert.equal(image.type, "mdxJsxTextElement");
    assert.equal(image.name, "img");
    for (const [name, offset] of [
        ["width", 16],
        ["height", 20],
    ]) {
        assert.equal(
            image.attributes.find((attribute) => attribute.name === name)
                ?.value,
            String(favicon.readUInt32BE(offset))
        );
    }
});

test("PNG reads are bounded to 33 bytes even when reads are short", async (t) => {
    let totalBytes = 0;
    const close = t.mock.fn(async () => {});
    t.mock.method(fsPromises, "open", async () => ({
        async read(buffer, offset, length, position) {
            assert.ok(position + length <= 33);
            const bytesRead = Math.min(3, length);
            favicon.copy(buffer, offset, position, position + bytesRead);
            totalBytes += bytesRead;
            return { bytesRead };
        },
        close,
    }));

    assert.deepEqual(await imageSizeFromFile("short-reads.png"), {
        width: favicon.readUInt32BE(16),
        height: favicon.readUInt32BE(20),
        type: "png",
    });
    assert.equal(totalBytes, 33);
    assert.equal(close.mock.callCount(), 1);
});

test("read failures propagate and close the file", async (t) => {
    const failure = new Error("Read failed");
    const close = t.mock.fn(async () => {});
    t.mock.method(fsPromises, "open", async () => ({
        async read() {
            throw failure;
        },
        close,
    }));
    await assert.rejects(imageSizeFromFile("failed-read.png"), failure);
    assert.equal(close.mock.callCount(), 1);
});

test("missing files reject with the filesystem error", async (t) => {
    await assert.rejects(
        imageSizeFromFile(path.join(temporaryDirectory(t), "missing.png")),
        { code: "ENOENT" }
    );
});

test("unsupported formats and malformed PNG headers reject explicitly", async (t) => {
    const directory = temporaryDirectory(t);
    const invalid = [
        ["unsupported", Buffer.from("GIF89a"), /only supports PNG/],
        ["truncated", favicon.subarray(0, 32), /truncated PNG IHDR/],
    ];
    for (const [name, offset, value, error] of [
        ["length", 8, 12, /PNG IHDR header/],
        ["chunk", 12, 0x49444154, /PNG IHDR header/],
        ["non-ascii-chunk", 12, 0xc9c8c4d2, /PNG IHDR header/],
        ["checksum", 29, 0, /PNG IHDR checksum/],
        ["zero-width", 16, 0, /PNG dimensions/],
        ["zero-height", 20, 0, /PNG dimensions/],
        ["large-width", 16, 0x80000000, /PNG dimensions/],
        ["large-height", 20, 0x80000000, /PNG dimensions/],
    ]) {
        const header = Buffer.from(favicon.subarray(0, 33));
        header.writeUInt32BE(value, offset);
        if (offset >= 12 && offset <= 20) {
            header.writeUInt32BE(crc32(header.subarray(12, 29)), 29);
        }
        invalid.push([name, header, error]);
    }
    for (const [name, bytes, error] of invalid) {
        const file = path.join(directory, name);
        fs.writeFileSync(file, bytes);
        await assert.rejects(imageSizeFromFile(file), error, name);
    }
});

function box(name, data, size = data.length + 8) {
    const result = Buffer.alloc(data.length + 8);
    result.writeUInt32BE(size, 0);
    result.write(name, 4, "ascii");
    data.copy(result, 8);
    return result;
}

const icns = Buffer.alloc(16);
icns.write("icns");
icns.writeUInt32BE(16, 4);
icns.write("is32", 8);
const ispe = Buffer.alloc(12);
ispe.writeUInt32BE(640, 4);
ispe.writeUInt32BE(480, 8);

const malformed = {
    "zero-entry.icns": icns,
    "zero-partial-stream.jxl": Buffer.concat([
        box("JXL ", Buffer.from([13, 10, 135, 10])),
        box("jxlp", Buffer.alloc(4), 0),
    ]),
    "zero-image-property.avif": Buffer.concat([
        box("ftyp", Buffer.from("avif0000")),
        box(
            "meta",
            Buffer.concat([
                Buffer.alloc(4),
                box("iprp", box("ipco", box("ispe", ispe, 0))),
            ])
        ),
    ]),
};

for (const [name, bytes] of Object.entries(malformed)) {
    test(`image parsing terminates for ${name}`, (t) => {
        const file = path.join(temporaryDirectory(t), name);
        fs.writeFileSync(file, bytes);

        // An in-process timeout cannot interrupt a synchronous parser loop.
        const result = spawnSync(
            process.execPath,
            [
                "--max-old-space-size=64",
                "-e",
                `const { imageSizeFromFile } = require(process.argv[1]);
                 imageSizeFromFile(process.argv[2]).then(
                     () => console.log("parsed"),
                     () => console.log("rejected")
                 );`,
                fromFilePath,
                file,
            ],
            { timeout: 5000, encoding: "utf8" }
        );
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout.trim(), /^(parsed|rejected)$/);
    });
}
