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
            (element, storage, newProps) => {
                const next = newProps as Types.RestorerProps | undefined;
                if (storage.restorer) {
                    if (next) {
                        storage.restorer.setProps(next);
                    }
                } else if (next) {
                    storage.restorer = api.createRestorer(element, next);
                }
            }
        );
    }

    return tabsterCore.restorer;
}
