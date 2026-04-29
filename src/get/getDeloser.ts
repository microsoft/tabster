/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DeloserAPI } from "../Deloser.js";
import type * as Types from "../Types.js";

/**
 * Creates a new deloser instance or returns an existing one
 * @param tabster Tabster instance
 * @param props Deloser props
 */
export function getDeloser(
    tabster: Types.Tabster,
    props?: { autoDeloser: Types.DeloserProps }
): Types.DeloserAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.deloser) {
        const api = new DeloserAPI(tabsterCore, props);
        tabsterCore.deloser = api;
        tabsterCore.attrHandlers.set(
            "deloser",
            (element, existingDeloser, newProps) => {
                if (existingDeloser) {
                    existingDeloser.setProps(newProps);
                    return existingDeloser;
                }
                return api.createDeloser(element, newProps);
            }
        );
    }

    return tabsterCore.deloser;
}
