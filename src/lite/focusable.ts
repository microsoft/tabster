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

    let node = walker.nextNode();
    while (node) {
        result.push(node as HTMLElement);
        node = walker.nextNode();
    }

    return result;
}

export function findFirst(options?: FindOptions): HTMLElement | null {
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
