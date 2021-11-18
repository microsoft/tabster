/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createKeyborg, disposeKeyborg, Keyborg } from '../Keyborg';

import { Subscribable } from './Subscribable';
import * as Types from '../Types';

export class KeyboardNavigationState extends Subscribable<boolean> implements Types.KeyboardNavigationState {
    private _keyborg?: Keyborg;

    constructor(getWindow: Types.GetWindow) {
        super();
        this._keyborg = createKeyborg(getWindow());
        this._keyborg.subscribe(this._onChange);
    }

    protected dispose(): void {
        super.dispose();

        if (this._keyborg) {
            this._keyborg.unsubscribe(this._onChange);

            disposeKeyborg(this._keyborg);

            delete this._keyborg;
        }
    }

    private _onChange = (isNavigatingWithKeyboard: boolean) => {
        this.setVal(isNavigatingWithKeyboard, undefined);
    }

    static dispose(instance: Types.KeyboardNavigationState): void {
        (instance as KeyboardNavigationState).dispose();
    }

    static setVal(instance: Types.KeyboardNavigationState, val: boolean): void {
        (instance as KeyboardNavigationState)._keyborg?.setVal(val);
    }

    isNavigatingWithKeyboard(): boolean {
        return !!this._keyborg?.isNavigatingWithKeyboard();
    }
}
