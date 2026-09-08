/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const fs = require("node:fs/promises");
const { crc32 } = require("node:zlib");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const HEADER_SIZE = 33;

// Temporary Docusaurus-only replacement. See README.md for its removal criteria.
async function imageSizeFromFile(filePath) {
    const header = Buffer.alloc(HEADER_SIZE);
    const file = await fs.open(filePath, "r");
    let offset = 0;

    try {
        while (offset < header.length) {
            const { bytesRead } = await file.read(
                header,
                offset,
                header.length - offset,
                offset
            );
            if (bytesRead === 0) {
                break;
            }
            offset += bytesRead;
        }
    } finally {
        await file.close();
    }

    if (offset < 8 || !header.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error(
            `The temporary docs image-size replacement only supports PNG images: ${filePath}`
        );
    }
    if (
        offset < HEADER_SIZE ||
        header.readUInt32BE(8) !== 13 ||
        header.toString("latin1", 12, 16) !== "IHDR"
    ) {
        throw new Error(`Invalid or truncated PNG IHDR header: ${filePath}`);
    }
    if (crc32(header.subarray(12, 29)) !== header.readUInt32BE(29)) {
        throw new Error(`Invalid PNG IHDR checksum: ${filePath}`);
    }

    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    if (
        width === 0 ||
        height === 0 ||
        width > 0x7fffffff ||
        height > 0x7fffffff
    ) {
        throw new Error(`Invalid PNG dimensions: ${filePath}`);
    }

    return { width, height, type: "png" };
}

module.exports = { imageSizeFromFile };
