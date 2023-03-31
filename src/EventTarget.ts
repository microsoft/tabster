/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { GetWindow } from "./Types";

export function createEventTarget(getWindow: GetWindow): EventTarget {
    const global = getWindow() as unknown as typeof globalThis;

    try {
        if (global.EventTarget) {
            return new global.EventTarget();
        }
    } catch (error) {
        // thrown if EventTarget is not constructable or doesn't exit
        if (!(error instanceof TypeError)) {
            throw error;
        }
    }

    return global.document.createElement("div");
}
