/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createGroupperAPI } from "../Groupper.js";
import type * as Types from "../Types.js";

/**
 * Creates a new groupper instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getGroupper(tabster: Types.Tabster): Types.GroupperAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.groupper) {
        const api = createGroupperAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.groupper = api;
        tabsterCore.disposers.add(api);
        tabsterCore.attrHandlers.set(
            "groupper",
            (element, existingGroupper, newProps, _oldProps, sys) => {
                if (existingGroupper) {
                    existingGroupper.setProps(newProps);
                    return existingGroupper;
                }
                return api.createGroupper(element, newProps, sys);
            }
        );
    }

    return tabsterCore.groupper;
}
