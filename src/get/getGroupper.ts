/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ensureDummyInputObserver } from "../DummyInput.js";
import { createGroupperAPI } from "../Groupper.js";
import { registerMoverGroupperResolver } from "../MoverGroupperResolver.js";
import { findNextTabbableWithParentFallback } from "../State/FocusedElement.js";
import type * as Types from "../Types.js";

const groupperFindNextStrategy: Types.FindNextTabbableStrategy = (
    tabster,
    ctx,
    container,
    currentElement,
    referenceElement,
    isBackward,
    ignoreAccessibility
) => {
    const groupper = ctx.groupper;
    // Groupper claims the dispatch when there's no Mover, or when the
    // precedence flag (`groupperBeforeMover`) puts it ahead of the Mover.
    if (!groupper || (ctx.mover && !ctx.groupperBeforeMover)) {
        return undefined;
    }
    return findNextTabbableWithParentFallback(
        tabster,
        groupper,
        container,
        currentElement,
        referenceElement,
        isBackward,
        ignoreAccessibility
    );
};

/**
 * Creates a new groupper instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getGroupper(tabster: Types.Tabster): Types.GroupperAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.groupper) {
        // Per-feature dummy-input redirection should "just work" when the
        // consumer opts into a feature, regardless of whether they also
        // called `getRootDummyInputs`. The observer is idempotent.
        ensureDummyInputObserver(tabsterCore);

        const api = createGroupperAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.groupper = api;
        tabsterCore.disposers.add(api);
        tabsterCore.attrHandlers.set(
            "groupper",
            (element, existingGroupper, newProps, _oldProps, sys) => {
                if (existingGroupper) {
                    existingGroupper.setProps(newProps);
                    return existingGroupper;
                }
                return api.createGroupper(element, newProps, sys);
            }
        );
        registerMoverGroupperResolver(tabsterCore);
        (tabsterCore.findNextTabbableStrategies ??= []).push(
            groupperFindNextStrategy
        );
    }

    return tabsterCore.groupper;
}
