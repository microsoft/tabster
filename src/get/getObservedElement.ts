/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createObservedElementAPI } from "../State/ObservedElement.js";
import type * as Types from "../Types.js";

export function getObservedElement(
    tabster: Types.Tabster
): Types.ObservedElementAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.observedElement) {
        tabsterCore.observedElement = createObservedElementAPI(tabsterCore);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return tabsterCore.observedElement!;
}
