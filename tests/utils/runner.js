/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const { spawn, execSync } = require("child_process");
const { join } = require("path");

let stripAnsi;
import("strip-ansi").then((m) => {
    stripAnsi = m.default;
});

process.chdir(join(__filename, "../.."));

console.log("Bundling Tabster...");
execSync("npx vite build --config vite.config.js");
console.log("Bundling Tabster done.");

console.log("Serving test page...");
const serveArgs = ["vite", "preview", "--config", "vite.config.js"];
const port = parseInt(process.env.PORT || "0", 10);
if (port > 0) {
    serveArgs.push("--port", port);
}
const serve = spawn("npx", serveArgs);

let testRun;

serve.stdout.on("data", (data) => {
    if (testRun) {
        return;
    }

    const match = stripAnsi(data.toString()).match(
        /http:\/\/localhost:(\d+)\//
    );

    if (match) {
        let port = parseInt(stripAnsi(match[1]), 10);

        if (!(port > 0)) {
            port = 8080;
        }

        console.log(`Serving test page on port ${port}`);

        testRun = spawn("jest", process.argv.slice(2), {
            cwd: join(__filename, "../../.."),
            stdio: "inherit",
            env: { ...process.env, PORT: port },
        });

        testRun.on("close", () => {
            serve.kill();
        });
    }
});

serve.stderr.on("data", (data) => {
    console.error(`${data}`);
    process.exit(1);
});

serve.on("close", () => {
    console.log("Stopped serving.\n");
});
