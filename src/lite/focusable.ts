/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FOCUSABLE_SELECTOR } from "../Consts";
import {
    isDisplayNone,
    matchesSelector,
    createElementTreeWalker,
} from "../Utils";
import type { DOMAPI } from "../Types";

export { FOCUSABLE_SELECTOR };

export interface FindOptions {
    container?: HTMLElement | ShadowRoot;
    filter?: (el: HTMLElement) => boolean;
    includeInert?: boolean;
    includeProgrammaticallyFocusable?: boolean;
    acceptShadowRoots?: boolean;
    /**
     * Walk in document-reverse order. Mirrors full Tabster's `isBackward`
     * option on findAll/findFirst/findNext/findPrev so the same test suite
     * can drive both implementations.
     */
    isBackward?: boolean;
    /**
     * Start the walk after this element (in the requested direction).
     * The element itself is excluded from the result.
     */
    currentElement?: HTMLElement;
    /**
     * Called for each focusable element discovered in walk order. Returning
     * `false` stops the walk (the element on which `false` is returned is
     * still included in the result).
     */
    onElement?: (el: HTMLElement) => boolean;
    domAPI?: DOMAPI;
}

export function isVisible(element: HTMLElement): boolean {
    if (!element.ownerDocument || element.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }

    if (isDisplayNone(element)) {
        return false;
    }

    const rect = element.ownerDocument.body.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        return false;
    }

    return true;
}

export function isFocusable(
    element: HTMLElement,
    includeProgrammaticallyFocusable = false
): boolean {
    return (
        matchesSelector(element, FOCUSABLE_SELECTOR) &&
        (includeProgrammaticallyFocusable || element.tabIndex !== -1) &&
        isVisible(element) &&
        isAccessible(element)
    );
}

export function isAccessible(element: HTMLElement): boolean {
    const d = element.ownerDocument?.defaultView;
    if (!d) {
        return false;
    }

    for (let e: HTMLElement | null = element; e; e = e.parentElement) {
        if ((e as HTMLElement & { inert?: boolean }).inert) {
            return false;
        }

        const ariaHidden = e.getAttribute("aria-hidden");
        if (ariaHidden && ariaHidden.toLowerCase() === "true") {
            return false;
        }
    }

    return true;
}

function _getContainer(options?: FindOptions): HTMLElement | ShadowRoot {
    return options?.container ?? document.body;
}

function _getDoc(container: HTMLElement | ShadowRoot): Document {
    if (container instanceof ShadowRoot) {
        return container.ownerDocument;
    }
    return container.ownerDocument ?? document;
}

function _accept(
    el: HTMLElement,
    includeInert: boolean,
    includeProgrammaticallyFocusable: boolean,
    filter?: (el: HTMLElement) => boolean
): boolean {
    if (!matchesSelector(el, FOCUSABLE_SELECTOR)) {
        return false;
    }
    if (!includeProgrammaticallyFocusable && el.tabIndex === -1) {
        return false;
    }
    if (!includeInert && !isAccessible(el)) {
        return false;
    }
    if (!isVisible(el)) {
        return false;
    }
    if (filter && !filter(el)) {
        return false;
    }
    return true;
}

export function findAll(options?: FindOptions): HTMLElement[] {
    const container = _getContainer(options);
    const includeInert = options?.includeInert ?? false;
    const filter = options?.filter;
    const includeProgrammaticallyFocusable =
        options?.includeProgrammaticallyFocusable ?? false;
    const isBackward = options?.isBackward ?? false;
    const currentElement = options?.currentElement;
    const onElement = options?.onElement;
    const doc = _getDoc(container);
    const result: HTMLElement[] = [];

    const walker = createElementTreeWalker(doc, container as Node, (node) => {
        const el = node as HTMLElement;
        if (
            _accept(el, includeInert, includeProgrammaticallyFocusable, filter)
        ) {
            return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
    });

    if (!walker) {
        return result;
    }

    // Collect all matches in document order first; reverse + slice afterwards
    // to keep the tree-walk simple. The post-processing cost is negligible
    // compared to the walk itself.
    const all: HTMLElement[] = [];
    let node = walker.nextNode();
    while (node) {
        all.push(node as HTMLElement);
        node = walker.nextNode();
    }

    let ordered = isBackward ? all.slice().reverse() : all;

    if (currentElement) {
        const idx = ordered.indexOf(currentElement);
        if (idx !== -1) {
            ordered = ordered.slice(idx + 1);
        }
    }

    if (!onElement) {
        return ordered;
    }

    for (const el of ordered) {
        result.push(el);
        if (onElement(el) === false) {
            break;
        }
    }

    return result;
}

export function findFirst(options?: FindOptions): HTMLElement | null {
    // Honour isBackward / currentElement by routing through findAll. The cost
    // of materialising the whole list is small for typical containers and
    // keeps a single source of truth for ordering semantics.
    if (options?.isBackward || options?.currentElement) {
        return findAll(options)[0] ?? null;
    }

    const container = _getContainer(options);
    const includeInert = options?.includeInert ?? false;
    const filter = options?.filter;
    const includeProgrammaticallyFocusable =
        options?.includeProgrammaticallyFocusable ?? false;
    const doc = _getDoc(container);

    const walker = createElementTreeWalker(doc, container as Node, (node) => {
        const el = node as HTMLElement;
        if (
            _accept(el, includeInert, includeProgrammaticallyFocusable, filter)
        ) {
            return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
    });

    if (!walker) {
        return null;
    }

    return (walker.nextNode() as HTMLElement | null) ?? null;
}

export function findLast(options?: FindOptions): HTMLElement | null {
    const all = findAll(options);
    return all[all.length - 1] ?? null;
}

export function findNext(
    from: HTMLElement,
    options?: FindOptions
): HTMLElement | null {
    const all = findAll(options);
    const idx = all.indexOf(from);
    if (idx === -1) {
        return null;
    }
    return all[idx + 1] ?? null;
}

export function findPrev(
    from: HTMLElement,
    options?: FindOptions
): HTMLElement | null {
    const all = findAll(options);
    const idx = all.indexOf(from);
    if (idx === -1) {
        return null;
    }
    return all[idx - 1] ?? null;
}

export function findDefault(options?: FindOptions): HTMLElement | null {
    const container = _getContainer(options);

    const byAttr = container.querySelector(
        "[data-tabster-lite-default]"
    ) as HTMLElement | null;

    if (byAttr && isFocusable(byAttr)) {
        return byAttr;
    }

    const byAutofocus = container.querySelector(
        "[autofocus]"
    ) as HTMLElement | null;

    if (byAutofocus && isFocusable(byAutofocus)) {
        return byAutofocus;
    }

    return null;
}
