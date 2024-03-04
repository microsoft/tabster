/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { default as PuppeteerEnvironment } from "jest-environment-puppeteer";

export default class BroTestEnvironment extends PuppeteerEnvironment {
    setup(): Promise<void> {
        // PuppeteerEnvironment extends NodeEnvironment which doesn't have CustomEvent,
        // and we need it in the global scope so that the derived classes can use it.
        // On the Node.js side, we don't care if it works, because the actual test runs
        // in the browser, and the browser has CustomEvent. Here we need it so that the
        // test files could import types and utility functions
        this.global.CustomEvent = function () {
            /* no-op */
        };
        return super.setup();
    }
}
