/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GroupperAPI } from "../Groupper.js";
import type * as Types from "../Types.js";

/**
 * Creates a new groupper instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getGroupper(tabster: Types.Tabster): Types.GroupperAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.groupper) {
        const api = new GroupperAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.groupper = api;
        tabsterCore.attrHandlers.set(
            "groupper",
            (element, existing, newProps, _oldProps, sys) => {
                const next = newProps as Types.GroupperProps;
                if (existing) {
                    (existing as Types.Groupper).setProps(next);
                    return undefined;
                }
                return api.createGroupper(element, next, sys);
            }
        );
    }

    return tabsterCore.groupper;
}
