/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    DummyInputManager,
    createDummyInputObserver,
} from "../DummyInput.js";
import { createGroupperDummyManager } from "../GroupperDummyManager.js";
import { createModalizerDummyManager } from "../ModalizerDummyManager.js";
import { createMoverDummyManager } from "../MoverDummyManager.js";
import { createRootDummyManager } from "../RootDummyManager.js";
import type * as Types from "../Types.js";

/**
 * Opt the Tabster instance into dummy-input behaviour. Registers the four
 * dummy-manager factories (root, mover, groupper, modalizer) and triggers
 * root dummy creation if `controlTab` or `rootDummyInputs` is set.
 *
 * Without calling this, every part's dummy code is absent from the bundle:
 * Root.addDummyInputs() finds no factory and skips; Mover/Groupper/Modalizer
 * instances created in the uncontrolled (`controlTab: false`) mode also
 * skip dummy creation. Apps that don't need browser-Tab navigation can
 * avoid the DummyInput / FocusedElement / KeyboardNavigation cost
 * entirely.
 */
export function getRootDummyInputs(tabster: Types.Tabster): void {
    const tabsterCore = tabster.core;

    if (!tabsterCore.rootDummyManagerFactory) {
        tabsterCore.rootDummyManagerFactory = createRootDummyManager;
        tabsterCore.moverDummyManagerFactory = createMoverDummyManager;
        tabsterCore.groupperDummyManagerFactory = createGroupperDummyManager;
        tabsterCore.modalizerDummyManagerFactory = createModalizerDummyManager;

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
