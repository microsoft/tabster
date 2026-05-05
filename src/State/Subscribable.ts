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

    const trigger = (v: A, detail: B): void => {
        callbacks.forEach((cb) => cb(v, detail));
    };

    return {
        dispose(): void {
            callbacks = [];
            val = undefined;
        },
        subscribe(cb): void {
            if (callbacks.indexOf(cb) < 0) {
                callbacks.push(cb);
            }
        },
        subscribeFirst(cb): void {
            const i = callbacks.indexOf(cb);
            if (i >= 0) {
                callbacks.splice(i, 1);
            }
            callbacks.unshift(cb);
        },
        unsubscribe(cb): void {
            const i = callbacks.indexOf(cb);
            if (i >= 0) {
                callbacks.splice(i, 1);
            }
        },
        setVal(v, detail): void {
            if (val !== v) {
                val = v;
                trigger(v, detail);
            }
        },
        getVal(): A | undefined {
            return val;
        },
        trigger,
    };
}
