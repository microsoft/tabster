/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { setTabsterOnElement } from './Instance';
import * as Types from './Types';

/**
 * Allows default or user focus behaviour on the DOM subtree
 * i.e. Tabster will not control focus events within an uncontrolled area
 */
export class UncontrolledAPI implements Types.UncontrolledAPI {
    private _tabster: Types.TabsterCore;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
    }

    add(element: HTMLElement) {
        setTabsterOnElement(this._tabster, element, { uncontrolled: {} });
    }

    remove(element: HTMLElement) {
        setTabsterOnElement(this._tabster, element, { uncontrolled: undefined });
    }
}
