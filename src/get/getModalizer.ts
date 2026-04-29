/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ModalizerAPI } from "../Modalizer.js";
import type * as Types from "../Types.js";

/**
 * Creates a new modalizer instance or returns an existing one
 * @param tabster Tabster instance
 * @param alwaysAccessibleSelector When Modalizer is active, we put aria-hidden to
 * everything else to hide it from screen readers. This CSS selector allows to
 * exclude some elements from this behaviour.
 * @param accessibleCheck An optional callback used to exclude elements from
 * receiving aria-hidden when a Modalizer is active.
 */
export function getModalizer(
    tabster: Types.Tabster,
    // @deprecated use accessibleCheck.
    alwaysAccessibleSelector?: string,
    accessibleCheck?: Types.ModalizerElementAccessibleCheck
): Types.ModalizerAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.modalizer) {
        const api = new ModalizerAPI(
            tabsterCore,
            alwaysAccessibleSelector,
            accessibleCheck
        );
        tabsterCore.modalizer = api;
        tabsterCore.attrHandlers.set(
            "modalizer",
            (element, existing, newProps, oldProps, sys) => {
                if (existing) {
                    if (newProps.id && oldProps?.id !== newProps.id) {
                        // Modalizer id is changed, given the modalizers have
                        // complex logic and could be composite, it is easier
                        // to recreate the Modalizer instance than to implement
                        // the id update.
                        existing.dispose();
                        return api.createModalizer(element, newProps, sys);
                    }
                    existing.setProps(newProps);
                    return existing;
                }
                return api.createModalizer(element, newProps, sys);
            }
        );
    }

    return tabsterCore.modalizer;
}
