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
            (element, existingRestorer, newProps) => {
                if (existingRestorer) {
                    existingRestorer.setProps(newProps);
                    return existingRestorer;
                }
                return api.createRestorer(element, newProps);
            }
        );
    }

    return tabsterCore.restorer;
}
