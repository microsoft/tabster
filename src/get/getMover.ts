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
        const api = new MoverAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.mover = api;
        tabsterCore.attrHandlers.set(
            "mover",
            (element, existing, newProps, _oldProps, sys) => {
                if (existing) {
                    existing.setProps(newProps);
                    return undefined;
                }
                return api.createMover(element, newProps, sys);
            }
        );
    }

    return tabsterCore.mover;
}
