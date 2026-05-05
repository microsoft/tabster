/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DummyInputManager, createDummyInputObserver } from "../DummyInput.js";
import { createRootDummyManager } from "../RootDummyManager.js";
import { installTabKeyHandler } from "../Tab.js";
import type * as Types from "../Types.js";

/**
 * Opt the Tabster instance into Tab-key control + root-level dummy
 * inputs.
 *
 * Registers the root dummy-manager factory, the dummy-input observer,
 * the `moveOutOfRoot` routing, and the Tab-key keydown handler — all of
 * which used to be eagerly installed by `createTabster`. They now only
 * enter the bundle when the consumer calls this function.
 *
 * Per-part dummy factories (Mover, Groupper, Modalizer) are registered
 * by their respective `getX` factories, so consumers only pay for the
 * dummy code of features they actually use.
 *
 * Default `createTabster(win)` is the slim baseline (no Tab control, no
 * root dummies, no phantom-dummy machinery). Pair it with
 * `getRootDummyInputs(tabster)` for "Tab just works" behaviour.
 */
export function getRootDummyInputs(tabster: Types.Tabster): void {
    const tabsterCore = tabster.core;

    if (!tabsterCore.rootDummyManagerFactory) {
        tabsterCore.rootDummyManagerFactory = createRootDummyManager;

        // The DOM observer that tracks dummy-input positions through layout
        // changes only matters once dummy inputs exist. Without this opt-in
        // it's never created, keeping createDummyInputObserver and its
        // closure (~900 B) out of the always-on bundle.
        const dummyObserver = createDummyInputObserver(tabsterCore.getWindow);
        tabsterCore._dummyObserver = dummyObserver;
        tabsterCore.disposers.add(dummyObserver);

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

        // The Tab-key handler and root dummy inputs are gated on the
        // `controlTab` / `rootDummyInputs` flags so callers can use this
        // function purely to register the per-feature dummy infrastructure
        // (factories + observer) needed by Mover/Groupper/Modalizer dummies
        // in uncontrolled mode without paying for keyhandler/root-dummy
        // wiring they don't want.
        if (tabsterCore.controlTab || tabsterCore.rootDummyInputs) {
            // Install the Tab-key handler. Lives in src/Tab.ts so its
            // dependencies (`findNextTabbable`, `DummyInputManager`'s phantom
            // helpers, the keydown wiring) only enter the bundle here.
            const stopTabKeyHandler = installTabKeyHandler(
                tabsterCore,
                tabsterCore.getWindow
            );
            tabsterCore.disposers.add({ dispose: stopTabKeyHandler });

            // Apply to existing roots; per-part Mover/Groupper/Modalizer
            // dummies are picked up lazily via the registered factories when
            // each part instance is constructed.
            tabsterCore.root.addDummyInputs();
        }
    }
}
