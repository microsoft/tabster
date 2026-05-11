/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type * as Types from "./Types.js";

/**
 * Allows default or user focus behaviour on the DOM subtree
 * i.e. Tabster will not control focus events within an uncontrolled area
 */
export function createUncontrolledAPI(
    isUncontrolledCompletely?: (
        element: HTMLElement,
        completely: boolean
    ) => boolean | undefined
): Types.UncontrolledAPI {
    return {
        isUncontrolledCompletely(
            element: HTMLElement,
            completely: boolean
        ): boolean {
            const result = isUncontrolledCompletely?.(element, completely);
            // If isUncontrolledCompletely callback is not defined or returns undefined, then the default
            // behaviour is to return the uncontrolled.completely value from the element.
            return result === undefined ? completely : result;
        },
    };
}
