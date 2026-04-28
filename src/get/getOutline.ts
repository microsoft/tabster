/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { OutlineAPI } from "../Outline.js";
import type * as Types from "../Types.js";

export function getOutline(tabster: Types.Tabster): Types.OutlineAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.outline) {
        tabsterCore.outline = new OutlineAPI(tabsterCore);
    }

    return tabsterCore.outline;
}
