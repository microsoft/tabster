/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { RestorerAPI } from "../Restorer.js";
import type * as Types from "../Types.js";

export function getRestorer(tabster: Types.Tabster): Types.RestorerAPI {
    const tabsterCore = tabster.core;
    if (!tabsterCore.restorer) {
        tabsterCore.restorer = new RestorerAPI(tabsterCore);
    }

    return tabsterCore.restorer;
}
