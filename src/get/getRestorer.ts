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
                const next = newProps as Types.RestorerProps | undefined;
                if (existing) {
                    if (next) {
                        (existing as Types.Restorer).setProps(next);
                    }
                    return undefined;
                }
                if (next) {
                    return api.createRestorer(element, next);
                }
                return undefined;
            }
        );
    }

    return tabsterCore.restorer;
}
