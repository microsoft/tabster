/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

module.exports = {
    launch: {
        headless: "shell",
        devtools: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
};
