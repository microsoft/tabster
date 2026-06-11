/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { type GroupperMoveFocusAction, type MoverKey } from "./Types.js";
import {
    GroupperMoveFocusEvent,
    MoverMoveFocusEvent,
    MoverMemorizedElementEvent,
} from "./Events.js";
import { dispatchEvent } from "./Utils.js";

/** @deprecated This function is obsolete, use native element.dispatchEvent(new GroupperMoveFocusEvent(...)). */
export function dispatchGroupperMoveFocusEvent(
    target: HTMLElement,
    action: GroupperMoveFocusAction
) {
    return dispatchEvent(target, new GroupperMoveFocusEvent({ action }));
}

/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMoveFocusEvent(...)). */
export function dispatchMoverMoveFocusEvent(
    target: HTMLElement,
    key: MoverKey
) {
    return dispatchEvent(target, new MoverMoveFocusEvent({ key }));
}

/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMemorizedElementEvent(...)). */
export function dispatchMoverMemorizedElementEvent(
    target: HTMLElement,
    memorizedElement: HTMLElement | undefined
) {
    return dispatchEvent(
        target,
        new MoverMemorizedElementEvent({ memorizedElement })
    );
}
