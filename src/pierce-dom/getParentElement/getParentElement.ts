/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function getParentNode(node: Node | null | undefined): Node | null {
    if (!node) {
        return null;
    }

    if (
        node.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
        (node as ShadowRoot).host
    ) {
        return (node as ShadowRoot).host;
    }

    return node.parentNode;
}

export function getParentElement(
    element: HTMLElement | null | undefined
): HTMLElement | null {
    for (
        let parentNode = getParentNode(element);
        parentNode;
        parentNode = getParentNode(parentNode)
    ) {
        if (parentNode.nodeType === Node.ELEMENT_NODE) {
            return parentNode as HTMLElement;
        }
    }

    return null;
}
