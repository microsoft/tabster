/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type * as Types from "../Types.js";

/**
 * Internal subscribable composed by API factories. The public surface
 * (`subscribe`, `subscribeFirst`, `unsubscribe`) matches `Types.Subscribable`;
 * `setVal`/`getVal`/`trigger` are exposed for the composing factory only and
 * should not be re-exposed on the consumer's external API.
 */
export interface SubscribableCore<A, B = undefined> extends Types.Subscribable<
    A,
    B
> {
    dispose(): void;
    setVal(val: A, detail: B): void;
    getVal(): A | undefined;
    trigger(val: A, detail: B): void;
}

export function createSubscribable<A, B = undefined>(): SubscribableCore<A, B> {
    let val: A | undefined;
    let callbacks: Types.SubscribableCallback<A, B>[] = [];

    const callCallbacks = (v: A, detail: B): void => {
        callbacks.forEach((callback) => callback(v, detail));
    };

    return {
        dispose(): void {
            callbacks = [];
            val = undefined;
        },
        subscribe(callback: Types.SubscribableCallback<A, B>): void {
            const index = callbacks.indexOf(callback);
            if (index < 0) {
                callbacks.push(callback);
            }
        },
        subscribeFirst(callback: Types.SubscribableCallback<A, B>): void {
            const index = callbacks.indexOf(callback);
            if (index >= 0) {
                callbacks.splice(index, 1);
            }
            callbacks.unshift(callback);
        },
        unsubscribe(callback: Types.SubscribableCallback<A, B>): void {
            const index = callbacks.indexOf(callback);
            if (index >= 0) {
                callbacks.splice(index, 1);
            }
        },
        setVal(v: A, detail: B): void {
            if (val === v) {
                return;
            }
            val = v;
            callCallbacks(v, detail);
        },
        getVal(): A | undefined {
            return val;
        },
        trigger(v: A, detail: B): void {
            callCallbacks(v, detail);
        },
    };
}
