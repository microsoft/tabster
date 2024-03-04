/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GroupperMoveFocusAction, MoverKey } from "./Types";
import {
    GroupperMoveFocusEvent,
    MoverMoveFocusEvent,
    MoverMemorizedElementEvent,
} from "./Events";

/** @deprecated This function is obsolete, use native element.dispatchEvent(new GroupperMoveFocusEvent(...)). */
export function dispatchGroupperMoveFocusEvent(
    target: HTMLElement,
    action: GroupperMoveFocusAction
) {
    return target.dispatchEvent(new GroupperMoveFocusEvent({ action }));
}

/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMoveFocusEvent(...)). */
export function dispatchMoverMoveFocusEvent(
    target: HTMLElement,
    key: MoverKey
) {
    return target.dispatchEvent(new MoverMoveFocusEvent({ key }));
}

/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMemorizedElementEvent(...)). */
export function dispatchMoverMemorizedElementEvent(
    target: HTMLElement,
    memorizedElement: HTMLElement | undefined
) {
    return target.dispatchEvent(
        new MoverMemorizedElementEvent({ memorizedElement })
    );
}
