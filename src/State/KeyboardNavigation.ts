/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createKeyborg, disposeKeyborg, type Keyborg } from "keyborg";

import type * as Types from "../Types.js";
import { createSubscribable } from "./Subscribable.js";

export function createKeyboardNavigationState(
    getWindow: Types.GetWindow
): Types.KeyboardNavigationState {
    const sub = createSubscribable<boolean>();
    let keyborg: Keyborg | undefined = createKeyborg(getWindow());

    const onChange = (isNavigatingWithKeyboard: boolean) => {
        sub.setVal(isNavigatingWithKeyboard, undefined);
    };

    keyborg.subscribe(onChange);

    return {
        subscribe: sub.subscribe,
        subscribeFirst: sub.subscribeFirst,
        unsubscribe: sub.unsubscribe,

        dispose(): void {
            sub.dispose();

            if (keyborg) {
                keyborg.unsubscribe(onChange);
                disposeKeyborg(keyborg);
                keyborg = undefined;
            }
        },

        setNavigatingWithKeyboard(isNavigatingWithKeyboard: boolean): void {
            keyborg?.setVal(isNavigatingWithKeyboard);
        },

        isNavigatingWithKeyboard(): boolean {
            return !!keyborg?.isNavigatingWithKeyboard();
        },
    };
}
