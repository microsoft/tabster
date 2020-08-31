/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from '../Types';

export abstract class Subscribable<A, B = undefined> implements Types.Subscribable<A, B> {
    protected _val: A | undefined;
    private _callbacks: (Types.SubscribableCallback<A, B>)[] = [];

    protected dispose(): void {
        delete this._callbacks;
        delete this._val;
    }

    subscribe(callback: Types.SubscribableCallback<A, B>): void {
        const index = this._callbacks.indexOf(callback);

        if (index < 0) {
            this._callbacks.push(callback);
        }
    }

    unsubscribe(callback: Types.SubscribableCallback<A, B>): void {
        const index = this._callbacks.indexOf(callback);

        if (index >= 0) {
            this._callbacks.splice(index, 1);
        }
    }

    protected setVal(val: A, details: B): void {
        if (this._val === val) {
            return;
        }

        this._val = val;

        this._callCallbacks(val, details);
    }

    protected getVal(): A | undefined {
        return this._val;
    }

    protected trigger(val: A, details: B): void {
        this._callCallbacks(val, details);
    }

    private _callCallbacks(val: A, details: B): void {
        this._callbacks.forEach(callback => callback(val, details));
    }
}
