/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { RestorerAPI } from "../Restorer.js";
import type * as Types from "../Types.js";

export function getRestorer(tabster: Types.Tabster): Types.RestorerAPI {
    const tabsterCore = tabster.core;
    if (!tabsterCore.restorer) {
        const api = new RestorerAPI(tabsterCore);
        tabsterCore.restorer = api;
        tabsterCore.attrHandlers.set(
            "restorer",
            (element, existing, newProps) => {
                if (existing) {
                    existing.setProps(newProps);
                    return undefined;
                }
                return api.createRestorer(element, newProps);
            }
        );
    }

    return tabsterCore.restorer;
}
