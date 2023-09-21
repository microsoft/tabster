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
    private _isTrappingFocus?: (element: HTMLElement) => boolean;

    constructor(isTrappingFocus?: (element: HTMLElement) => boolean) {
        this._isTrappingFocus = isTrappingFocus;
    }

    isTrappingFocus(element: HTMLElement): boolean {
        return !!this._isTrappingFocus?.(element);
    }
}
