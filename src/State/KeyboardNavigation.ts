/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createKeyborg, disposeKeyborg, Keyborg } from "keyborg";

import * as Types from "../Types";
import { Subscribable } from "./Subscribable";

export class KeyboardNavigationState
    extends Subscribable<boolean>
    implements Types.KeyboardNavigationState
{
    private _keyborg?: Keyborg;

    constructor(getWindow: Types.GetWindow) {
        super();
        this._keyborg = createKeyborg(getWindow());
        this._keyborg.subscribe(this._onChange);
    }

    dispose(): void {
        super.dispose();

        if (this._keyborg) {
            this._keyborg.unsubscribe(this._onChange);

            disposeKeyborg(this._keyborg);

            delete this._keyborg;
        }
    }

    private _onChange = (isNavigatingWithKeyboard: boolean) => {
        this.setVal(isNavigatingWithKeyboard, undefined);
    };

    setNavigatingWithKeyboard(isNavigatingWithKeyboard: boolean): void {
        this._keyborg?.setVal(isNavigatingWithKeyboard);
    }

    isNavigatingWithKeyboard(): boolean {
        return !!this._keyborg?.isNavigatingWithKeyboard();
    }
}
