/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DummyInputManager, createDummyInputObserver } from "../DummyInput.js";
import { createRootDummyManager } from "../RootDummyManager.js";
import type * as Types from "../Types.js";

/**
 * Opt the Tabster instance into root-level dummy-input behaviour.
 * Registers the root dummy-manager factory plus the dummy-input observer
 * and the `moveOutOfRoot` routing, then triggers root dummy creation when
 * `controlTab` or `rootDummyInputs` is set. Per-part dummy factories
 * (Mover, Groupper, Modalizer) are registered by their respective `getX`
 * factories, so consumers only pay for the dummy code of features they
 * actually use.
 *
 * `createTabster` calls this automatically when `controlTab` (default
 * `true`) or `rootDummyInputs` is on, so the default
 * `createTabster(window)` "just works." Apps that opt out
 * (`createTabster(win, { controlTab: false })` without calling this) keep
 * the slim, dummy-free baseline.
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

        // Apply to existing roots when the controlTab/rootDummyInputs flags
        // say root should host dummies; per-part Mover/Groupper/Modalizer
        // dummies are picked up lazily via the registered factories when
        // each part instance is constructed.
        if (tabsterCore.controlTab || tabsterCore.rootDummyInputs) {
            tabsterCore.root.addDummyInputs();
        }
    }
}
