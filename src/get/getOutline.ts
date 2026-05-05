/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createOutlineAPI } from "../Outline.js";
import type * as Types from "../Types.js";

export function getOutline(tabster: Types.Tabster): Types.OutlineAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.outline) {
        const api = createOutlineAPI(tabsterCore);
        tabsterCore.outline = api;
        tabsterCore.disposers.add(api);
    }

    return tabsterCore.outline;
}
