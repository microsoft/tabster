/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ObservedElementAPI } from "../State/ObservedElement";
import type * as Types from "../Types";

export function getObservedElement(
    tabster: Types.Tabster
): Types.ObservedElementAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.observedElement) {
        tabsterCore.observedElement = new ObservedElementAPI(tabsterCore);
    }

    return tabsterCore.observedElement;
}
