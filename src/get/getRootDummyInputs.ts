/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DummyInputManager, ensureDummyInputObserver } from "../DummyInput.js";
import { createRootDummyManager } from "../RootDummyManager.js";
import { installTabKeyHandler } from "../Tab.js";
import type * as Types from "../Types.js";

/**
 * Opt the Tabster instance into Tab-key and dummy-input infrastructure.
 *
 * Calling this function *is* the opt-in. It registers the dummy-input
 * observer, the `moveOutOfRoot` routing, and the Tab-key keydown handler.
 * When `controlTab` or `rootDummyInputs` is enabled, it also registers the
 * root dummy-manager factory and adds root-level dummy inputs to existing
 * roots. All of this used to be eagerly installed by `createTabster`.
 *
 * Per-feature dummies (Mover/Groupper/Modalizer) don't need this:
 * `getMover`/`getGroupper`/`getModalizer` ensure their own dummy
 * infrastructure when called.
 *
 * Default `createTabster(win)` is the slim baseline (no Tab handling, no
 * root dummies, no phantom-dummy machinery). Pair it with
 * `getRootDummyInputs(tabster)` for Tabster-managed Tab behaviour.
 */
export function getRootDummyInputs(tabster: Types.Tabster): void {
    const tabsterCore = tabster.core;

    if (!tabsterCore.rootDummyManagerFactory) {
        tabsterCore.rootDummyManagerFactory = createRootDummyManager;

        // Shared with the per-feature `get*` factories so opting into
        // either path gets the observer.
        ensureDummyInputObserver(tabsterCore);

        // Routes Root.moveOutWithDefaultAction either through the root's
        // dummy manager (controlTab=true / rootDummyInputs=true) or the
        // phantom-dummy fallback (uncontrolled mode where Root has no
        // persistent dummies). Both paths only enter the bundle when the
        // consumer opts in here.
        tabsterCore.moveOutOfRoot = (
            tabster,
            rootElement,
            dummyManager,
            isBackward,
            relatedEvent
        ) => {
            if (dummyManager) {
                dummyManager.moveOutWithDefaultAction(isBackward, relatedEvent);
            } else if (rootElement) {
                DummyInputManager.moveWithPhantomDummy(
                    tabster,
                    rootElement,
                    true,
                    isBackward,
                    relatedEvent
                );
            }
        };

        // Install the Tab-key handler. Lives in src/Tab.ts so its
        // dependencies (`findNextTabbable`, `DummyInputManager`'s phantom
        // helpers, the keydown wiring) only enter the bundle here.
        const stopTabKeyHandler = installTabKeyHandler(
            tabsterCore,
            tabsterCore.getWindow
        );
        tabsterCore.disposers.add({ dispose: stopTabKeyHandler });

        if (tabsterCore.controlTab || tabsterCore.rootDummyInputs) {
            // Apply to existing roots and force future roots to add dummies.
            tabsterCore.root.addDummyInputs();
        }
    }
}
