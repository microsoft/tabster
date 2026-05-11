/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createMoverAPI } from "../Mover.js";
import { registerMoverGroupperResolver } from "../MoverGroupperResolver.js";
import { findNextTabbableWithParentFallback } from "../State/FocusedElement.js";
import type * as Types from "../Types.js";

const moverFindNextStrategy: Types.FindNextTabbableStrategy = (
    tabster,
    ctx,
    container,
    currentElement,
    referenceElement,
    isBackward,
    ignoreAccessibility
) => {
    const mover = ctx.mover;
    // Mover yields to a Groupper that wins the precedence flag
    // (`groupperBeforeMover`); otherwise it owns the dispatch.
    if (!mover || (ctx.groupper && ctx.groupperBeforeMover)) {
        return undefined;
    }
    return findNextTabbableWithParentFallback(
        tabster,
        mover,
        container,
        currentElement,
        referenceElement,
        isBackward,
        ignoreAccessibility
    );
};

/**
 * Creates a new mover instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getMover(tabster: Types.Tabster): Types.MoverAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.mover) {
        const api = createMoverAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.mover = api;
        tabsterCore.disposers.add(api);
        tabsterCore.attrHandlers.set(
            "mover",
            (element, existingMover, newProps, _oldProps, sys) => {
                if (existingMover) {
                    existingMover.setProps(newProps);
                    return existingMover;
                }
                return api.createMover(element, newProps, sys);
            }
        );
        registerMoverGroupperResolver(tabsterCore);
        (tabsterCore.findNextTabbableStrategies ??= []).push(
            moverFindNextStrategy
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return tabsterCore.mover!;
}
