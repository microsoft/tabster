/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function getActiveElement(doc: Document): Element | null {
    let activeElement = doc.activeElement;

    while (activeElement?.shadowRoot?.activeElement) {
        activeElement = activeElement.shadowRoot.activeElement;
    }

    return activeElement;
}

export function nodeContains(
    node: Node | null | undefined,
    otherNode: Node | null | undefined
): boolean {
    if (!node || !otherNode) {
        return false;
    }

    let currentNode: HTMLElement | Node | null | undefined = otherNode;

    while (currentNode) {
        if (currentNode === node) {
            return true;
        }

        if (
            typeof (currentNode as HTMLSlotElement).assignedElements !==
                "function" &&
            (currentNode as HTMLElement).assignedSlot?.parentNode
        ) {
            // Element is slotted
            currentNode = (currentNode as HTMLElement).assignedSlot?.parentNode;
        } else if (currentNode.nodeType === document.DOCUMENT_FRAGMENT_NODE) {
            // Element is in shadow root
            currentNode = (currentNode as ShadowRoot).host;
        } else {
            currentNode = currentNode.parentNode;
        }
    }

    return false;
}

export function getParentNode(
    node: Node | null | undefined
): ParentNode | null {
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

export function getFirstChild(node: Node | null | undefined): ChildNode | null {
    if (!node) {
        return null;
    }

    if ((node as Element).shadowRoot) {
        const child = getFirstChild((node as Element).shadowRoot);

        if (child) {
            return child;
        }

        // If the attached shadowRoot has no children, just try ordinary children,
        // that might come after.
    }

    return node.firstChild;
}

export function getLastChild(node: Node | null | undefined): ChildNode | null {
    if (!node) {
        return null;
    }

    if (!node.lastChild && (node as Element).shadowRoot) {
        return getLastChild((node as Element).shadowRoot);
    }

    return node.lastChild;
}

export function getNextSibling(
    node: Node | null | undefined
): ChildNode | null {
    return node?.nextSibling || null;
}

export function getPreviousSibling(
    node: Node | null | undefined
): ChildNode | null {
    if (!node) {
        return null;
    }

    let sibling = node.previousSibling;

    if (!sibling && node.parentElement?.shadowRoot) {
        sibling = getLastChild(node.parentElement.shadowRoot);
    }

    return sibling;
}

export function getFirstElementChild(
    element: Element | null | undefined
): Element | null {
    let child = getFirstChild(element);

    while (child && child.nodeType !== Node.ELEMENT_NODE) {
        child = getNextSibling(child);
    }

    return child as Element | null;
}

export function getLastElementChild(
    element: Element | null | undefined
): Element | null {
    let child = getLastChild(element);

    while (child && child.nodeType !== Node.ELEMENT_NODE) {
        child = getPreviousSibling(child);
    }

    return child as Element | null;
}

export function getNextElementSibling(
    element: Element | null | undefined
): Element | null {
    let sibling = getNextSibling(element);

    while (sibling && sibling.nodeType !== Node.ELEMENT_NODE) {
        sibling = getNextSibling(sibling);
    }

    return sibling as Element | null;
}

export function getPreviousElementSibling(
    element: Element | null | undefined
): Element | null {
    let sibling = getPreviousSibling(element);

    while (sibling && sibling.nodeType !== Node.ELEMENT_NODE) {
        sibling = getPreviousSibling(sibling);
    }

    return sibling as Element | null;
}

export function appendChild(parent: Node, child: Node): Node {
    const shadowRoot = (parent as Element).shadowRoot;
    return shadowRoot
        ? shadowRoot.appendChild(child)
        : parent.appendChild(child);
}

export function insertBefore(
    parent: Node,
    child: Node,
    referenceChild: Node | null
): Node {
    const shadowRoot = (parent as Element).shadowRoot;
    return shadowRoot
        ? shadowRoot.insertBefore(child, referenceChild)
        : parent.insertBefore(child, referenceChild);
}

interface ShadowRootWithGetSelection extends ShadowRoot {
    getSelection?: typeof Window.prototype.getSelection;
}

export function getSelection(ref: Node): Selection | null {
    const win = ref.ownerDocument?.defaultView;

    if (!win) {
        return null;
    }

    for (let el: Node | null = ref; el; el = el.parentNode) {
        if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            const tmp = el as ShadowRootWithGetSelection;

            // ShadowRoot.getSelection() exists only in Chrome.
            if (tmp.getSelection) {
                return tmp.getSelection() || null;
            }

            break;
        }
    }

    return win.getSelection() || null;
}
