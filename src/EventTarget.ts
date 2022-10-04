/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { GetWindow } from "./Types";

export function createEventTarget(getWindow: GetWindow): EventTarget {
    const global = getWindow() as unknown as typeof globalThis;
    if ("EventTarget" in global) {
        return new global.EventTarget();
    }
    return global.document.createElement("div");
}
