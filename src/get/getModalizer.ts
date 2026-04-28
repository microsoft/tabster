/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ModalizerAPI } from "../Modalizer.js";
import type * as Types from "../Types.js";

/**
 * Creates a new modalizer instance or returns an existing one
 * @param tabster Tabster instance
 * @param alwaysAccessibleSelector When Modalizer is active, we put aria-hidden to
 * everything else to hide it from screen readers. This CSS selector allows to
 * exclude some elements from this behaviour.
 * @param accessibleCheck An optional callback used to exclude elements from
 * receiving aria-hidden when a Modalizer is active.
 */
export function getModalizer(
    tabster: Types.Tabster,
    // @deprecated use accessibleCheck.
    alwaysAccessibleSelector?: string,
    accessibleCheck?: Types.ModalizerElementAccessibleCheck
): Types.ModalizerAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.modalizer) {
        tabsterCore.modalizer = new ModalizerAPI(
            tabsterCore,
            alwaysAccessibleSelector,
            accessibleCheck
        );
    }

    return tabsterCore.modalizer;
}
