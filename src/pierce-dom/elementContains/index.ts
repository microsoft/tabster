/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// Node.elementContains with shadow DOM support!
export function elementContains(
    element: HTMLElement | Node | null | undefined,
    otherNode: HTMLElement | Node | null | undefined
): boolean {
    if (!element || !otherNode) {
        return false;
    }

    let node: HTMLElement | Node | null | undefined = otherNode;
    while (node) {
        if (node === element) {
            return true;
        }

        if (
            typeof (node as HTMLSlotElement).assignedElements !== "function" &&
            (node as HTMLElement).assignedSlot?.parentNode
        ) {
            // Element is slotted
            node = (node as HTMLElement).assignedSlot?.parentNode;
        } else if (node.nodeType === 11) {
            // DOCUMENT_FRAGMENT
            // Element is in shadow root
            node = (node as ShadowRoot).host;
        } else {
            node = node.parentNode;
        }
    }

    return false;
}
