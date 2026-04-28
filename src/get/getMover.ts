/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { MoverAPI } from "../Mover.js";
import type * as Types from "../Types.js";

/**
 * Creates a new mover instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getMover(tabster: Types.Tabster): Types.MoverAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.mover) {
        tabsterCore.mover = new MoverAPI(tabsterCore, tabsterCore.getWindow);
    }

    return tabsterCore.mover;
}
