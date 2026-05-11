/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createMoverAPI } from "../Mover.js";
import type * as Types from "../Types.js";

/**
 * Creates a new mover instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getMover(tabster: Types.Tabster): Types.MoverAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.mover) {
        const api = createMoverAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.mover = api;
        tabsterCore.attrHandlers.set(
            "mover",
            (element, existingMover, newProps, _oldProps, sys) => {
                if (existingMover) {
                    existingMover.setProps(newProps);
                    return existingMover;
                }
                return api.createMover(element, newProps, sys);
            }
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return tabsterCore.mover!;
}
