/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createRootDummyManager } from "../RootDummyManager.js";
import type * as Types from "../Types.js";

/**
 * Opt the Tabster instance into root dummy-input behaviour. Registers the
 * factory used by `Root.addDummyInputs()` and runs it on every existing
 * root, then makes future roots auto-add dummy inputs as well.
 *
 * Without calling this, `controlTab: true` and `rootDummyInputs: true`
 * become no-ops — Root.addDummyInputs() finds no factory and skips. Pulled
 * out of the always-on Tabster path so apps that don't need browser Tab
 * navigation can avoid the DummyInput / FocusedElement / KeyboardNavigation
 * cost.
 */
export function getRootDummyInputs(tabster: Types.Tabster): void {
    const tabsterCore = tabster.core;

    if (!tabsterCore.rootDummyManagerFactory) {
        tabsterCore.rootDummyManagerFactory = createRootDummyManager;
        // Apply to existing roots; also flips the RootAPI flag so future
        // roots auto-add dummy inputs even without controlTab/rootDummyInputs.
        tabsterCore.root.addDummyInputs();
    }
}
