/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ElementVisibility } from './Types';

let _isBrokenIE11: boolean;

try {
    // IE11 only accepts `filter` argument as a function (not object with the `acceptNode`
    // property as the docs define). Also `entityReferenceExpansion` argument is not
    // optional. And it throws exception when the above arguments aren't there.
    document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
    _isBrokenIE11 = false;
} catch (e) {
    _isBrokenIE11 = true;
}

export function createElementTreeWalker(doc: Document, root: Node, acceptNode: (node: Node) => number): TreeWalker | undefined {
    // IE11 will throw an exception when the TreeWalker root is not an Element.
    if (root.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
    }

    // TypeScript isn't aware of IE11 behaving badly.
    const filter = (_isBrokenIE11 ? acceptNode : ({ acceptNode } as NodeFilter)) as any as NodeFilter;

    return doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter, false /* Last argument is not optional for IE11! */);
}

export function getBoundingRect(element: HTMLElement): DOMRect {
    const scrollingElement = element.ownerDocument && element.ownerDocument.scrollingElement;

    if (element === scrollingElement) {
        // A bounding rect of the top-level element contains the whole page regardless of the
        // scrollbar. So, we improvise a little...
        return new DOMRect(0, 0, scrollingElement.clientWidth, scrollingElement.clientHeight);
    }

    return element.getBoundingClientRect();
}

export function isElementVerticallyVisibleInContainer(element: HTMLElement): boolean {
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(container);
        const elementRect = element.getBoundingClientRect();

        return (elementRect.top >= containerRect.top) &&
            (elementRect.bottom <= containerRect.bottom);
    }

    return false;
}

export function isElementVisibleInContainer(element: HTMLElement): ElementVisibility {
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(container);
        const elementRect = element.getBoundingClientRect();

        let top = false;
        let bottom = false;
        let left = false;
        let right = false;

        if ((elementRect.top >= containerRect.top) && (elementRect.top <= containerRect.bottom)) {
            top = true;
        }

        if ((elementRect.bottom >= containerRect.top) && (elementRect.bottom <= containerRect.bottom)) {
            bottom = true;
        }

        if ((elementRect.left >= containerRect.left) && (elementRect.left <= containerRect.right)) {
            left = true;
        }

        if ((elementRect.right >= containerRect.left) && (elementRect.right <= containerRect.right)) {
            right = true;
        }

        if (top && bottom && left && right) {
            return ElementVisibility.Visible;
        }

        if ((top && left) || (bottom && right)) {
            return ElementVisibility.PartiallyVisible;
        }
    }

    return ElementVisibility.Invisible;
}

export function scrollIntoView(element: HTMLElement, alignToTop: boolean): void {
    // Built-in DOM's scrollIntoView() is cool, but when we have nested containers,
    // it scrolls all of them, not just the deepest one. So, trying to work it around.
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(container);
        const elementRect = element.getBoundingClientRect();

        if (alignToTop) {
            container.scrollTop += (elementRect.top - containerRect.top);
        } else {
            container.scrollTop += (elementRect.bottom - containerRect.bottom);
        }
    }
}

export function getScrollableContainer(element: HTMLElement): HTMLElement | null {
    const doc = element.ownerDocument;

    if (doc) {
        for (let el: HTMLElement | null = element.parentElement; el; el = el.parentElement) {
            if (el.scrollHeight > el.clientHeight) {
                return el;
            }
        }

        return doc.body;
    }

    return null;
}
