/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DeloserAPI } from "../Deloser";
import type * as Types from "../Types";

/**
 * Creates a new deloser instance or returns an existing one
 * @param tabster Tabster instance
 * @param props Deloser props
 */
export function getDeloser(
    tabster: Types.Tabster,
    props?: { autoDeloser: Types.DeloserProps }
): Types.DeloserAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.deloser) {
        tabsterCore.deloser = new DeloserAPI(tabsterCore, props);
    }

    return tabsterCore.deloser;
}
