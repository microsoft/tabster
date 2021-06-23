/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { setTabsterOnElement } from './Instance';
import * as Types from './Types';

/**
 * Forces tabster to ignore any focus operations on the DOM subtree
 */
export class IgnoreAPI implements Types.IgnoreAPI {
    private _tabster: Types.TabsterCore;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
    }

    add(element: HTMLElement) {
        setTabsterOnElement(this._tabster, element, { ignore: {} });
    }

    remove(element: HTMLElement) {
        setTabsterOnElement(this._tabster, element, { ignore: undefined });
    }
}
