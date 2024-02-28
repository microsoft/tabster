/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

/**
 * Allows default or user focus behaviour on the DOM subtree
 * i.e. Tabster will not control focus events within an uncontrolled area
 */
export class UncontrolledAPI implements Types.UncontrolledAPI {
    private _isUncontrolledCompletely?: (
        element: HTMLElement,
        completely: boolean
    ) => boolean | undefined;

    constructor(
        isUncontrolledCompletely?: (
            element: HTMLElement,
            completely: boolean
        ) => boolean | undefined
    ) {
        this._isUncontrolledCompletely = isUncontrolledCompletely;
    }

    isUncontrolledCompletely(
        element: HTMLElement,
        completely: boolean
    ): boolean {
        const isUncontrolledCompletely = this._isUncontrolledCompletely?.(
            element,
            completely
        );
        // If isUncontrolledCompletely callback is not defined or returns undefined, then the default
        // behaviour is to return the uncontrolled.completely value from the element.
        return isUncontrolledCompletely === undefined
            ? completely
            : isUncontrolledCompletely;
    }
}
