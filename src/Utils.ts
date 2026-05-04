/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    type GetWindow,
    type RadioButtonGroup,
    type TabsterAttributeProps,
    type TabsterCore,
    type TabsterPart as TabsterPartInterface,
    type Visibility,
    type WeakHTMLElement as WeakHTMLElementInterface,
} from "./Types.js";
import {
    FOCUSABLE_SELECTOR,
    TABSTER_ATTRIBUTE_NAME,
    Visibilities,
} from "./Consts.js";
import { dom } from "./DOMAPI.js";

interface HTMLElementWithBoundingRectCacheId extends HTMLElement {
    __tabsterCacheId?: string;
}

interface FocusedElementWithIgnoreFlag extends HTMLElement {
    __shouldIgnoreFocus: boolean;
}

export interface WindowWithUID extends Window {
    __tabsterCrossOriginWindowUID?: string;
}

export interface HTMLElementWithUID extends HTMLElement {
    __tabsterElementUID?: string;
}

export interface TabsterDOMRect {
    bottom: number;
    left: number;
    right: number;
    top: number;
}

export interface InstanceContext {
    elementByUId: { [uid: string]: WeakHTMLElement<HTMLElementWithUID> };
    containerBoundingRectCache: {
        [id: string]: {
            rect: TabsterDOMRect;
            element: HTMLElementWithBoundingRectCacheId;
        };
    };
    lastContainerBoundingRectCacheId: number;
    containerBoundingRectCacheTimer: Timer;
}

let _uidCounter = 0;

interface WindowWithUtilsConext extends Window {
    __tabsterInstanceContext?: InstanceContext;
}

export function getInstanceContext(getWindow: GetWindow): InstanceContext {
    const win = getWindow() as WindowWithUtilsConext;

    let ctx = win.__tabsterInstanceContext;

    if (!ctx) {
        ctx = {
            elementByUId: {},
            containerBoundingRectCache: {},
            lastContainerBoundingRectCacheId: 0,
            containerBoundingRectCacheTimer: createTimer(),
        };

        win.__tabsterInstanceContext = ctx;
    }

    return ctx;
}

export function disposeInstanceContext(win: Window): void {
    const ctx = (win as WindowWithUtilsConext).__tabsterInstanceContext;

    if (ctx) {
        ctx.elementByUId = {};

        ctx.containerBoundingRectCache = {};

        clearTimer(ctx.containerBoundingRectCacheTimer, win);

        delete (win as WindowWithUtilsConext).__tabsterInstanceContext;
    }
}

export function hasSubFocusable(element: HTMLElement): boolean {
    return !!element.querySelector(FOCUSABLE_SELECTOR);
}

export class WeakHTMLElement<
    T extends HTMLElement = HTMLElement,
    D = undefined,
> implements WeakHTMLElementInterface<D> {
    private _ref: WeakRef<T> | undefined;
    private _data: D | undefined;

    constructor(element: T, data?: D) {
        this._ref = new WeakRef(element);
        this._data = data;
    }

    get(): T | undefined {
        const ref = this._ref;
        let element: T | undefined;

        if (ref) {
            element = ref.deref();

            if (!element) {
                delete this._ref;
            }
        }

        return element;
    }

    getData(): D | undefined {
        return this._data;
    }
}

export function createElementTreeWalker(
    doc: Document,
    root: Node,
    acceptNode: (node: Node) => number
): TreeWalker | undefined {
    if (root.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
    }

    return dom.createTreeWalker(doc, root, NodeFilter.SHOW_ELEMENT, {
        acceptNode,
    });
}

export function getBoundingRect(
    getWindow: GetWindow,
    element: HTMLElementWithBoundingRectCacheId
): TabsterDOMRect {
    let cacheId = element.__tabsterCacheId;
    const context = getInstanceContext(getWindow);
    const cached = cacheId
        ? context.containerBoundingRectCache[cacheId]
        : undefined;

    if (cached) {
        return cached.rect;
    }

    const scrollingElement =
        element.ownerDocument && element.ownerDocument.documentElement;

    if (!scrollingElement) {
        return new DOMRect();
    }

    // A bounding rect of the top-level element contains the whole page regardless of the
    // scrollbar. So, we improvise a little and limiting the final result...
    let left = 0;
    let top = 0;
    let right = scrollingElement.clientWidth;
    let bottom = scrollingElement.clientHeight;

    if (element !== scrollingElement) {
        const r = element.getBoundingClientRect();
        left = Math.max(left, r.left);
        top = Math.max(top, r.top);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
    }

    const rect = new DOMRect(
        left < right ? left : -1,
        top < bottom ? top : -1,
        left < right ? right - left : 0,
        top < bottom ? bottom - top : 0
    );

    if (!cacheId) {
        cacheId = "r-" + ++context.lastContainerBoundingRectCacheId;
        element.__tabsterCacheId = cacheId;
    }

    context.containerBoundingRectCache[cacheId] = {
        rect,
        element,
    };

    if (!isTimerActive(context.containerBoundingRectCacheTimer)) {
        setTimer(
            context.containerBoundingRectCacheTimer,
            window,
            () => {
                for (const cId of Object.keys(
                    context.containerBoundingRectCache
                )) {
                    delete context.containerBoundingRectCache[cId].element
                        .__tabsterCacheId;
                }

                context.containerBoundingRectCache = {};
            },
            50
        );
    }

    return rect;
}

export function isElementVerticallyVisibleInContainer(
    getWindow: GetWindow,
    element: HTMLElement,
    tolerance: number
): boolean {
    const container = getScrollableContainer(element);
    if (!container) {
        return false;
    }

    const containerRect = getBoundingRect(getWindow, container);
    const elementRect = element.getBoundingClientRect();
    const intersectionTolerance = elementRect.height * (1 - tolerance);
    const topIntersection = Math.max(0, containerRect.top - elementRect.top);
    const bottomIntersection = Math.max(
        0,
        elementRect.bottom - containerRect.bottom
    );
    const totalIntersection = topIntersection + bottomIntersection;

    return (
        totalIntersection === 0 || totalIntersection <= intersectionTolerance
    );
}

export function isElementVisibleInContainer(
    getWindow: GetWindow,
    element: HTMLElement,
    gap = 0
): Visibility {
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
        const elementRect = element.getBoundingClientRect();

        if (
            elementRect.left > containerRect.right ||
            elementRect.top > containerRect.bottom ||
            elementRect.bottom < containerRect.top ||
            elementRect.right < containerRect.left
        ) {
            return Visibilities.Invisible;
        }

        if (
            elementRect.top + gap >= containerRect.top &&
            elementRect.top <= containerRect.bottom &&
            elementRect.bottom >= containerRect.top &&
            elementRect.bottom - gap <= containerRect.bottom &&
            elementRect.left + gap >= containerRect.left &&
            elementRect.left <= containerRect.right &&
            elementRect.right >= containerRect.left &&
            elementRect.right - gap <= containerRect.right
        ) {
            return Visibilities.Visible;
        }

        return Visibilities.PartiallyVisible;
    }

    return Visibilities.Invisible;
}

export function scrollIntoView(
    getWindow: GetWindow,
    element: HTMLElement,
    alignToTop: boolean
): void {
    // Built-in DOM's scrollIntoView() is cool, but when we have nested containers,
    // it scrolls all of them, not just the deepest one. So, trying to work it around.
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
        const elementRect = element.getBoundingClientRect();

        if (alignToTop) {
            container.scrollTop += elementRect.top - containerRect.top;
        } else {
            container.scrollTop += elementRect.bottom - containerRect.bottom;
        }
    }
}

export function getScrollableContainer(
    element: HTMLElement
): HTMLElement | null {
    const doc = element.ownerDocument;

    if (doc) {
        for (
            let el: HTMLElement | null = dom.getParentElement(element);
            el;
            el = dom.getParentElement(el)
        ) {
            if (
                el.scrollWidth > el.clientWidth ||
                el.scrollHeight > el.clientHeight
            ) {
                return el;
            }
        }

        return doc.documentElement;
    }

    return null;
}

export function makeFocusIgnored(element: HTMLElement): void {
    (element as FocusedElementWithIgnoreFlag).__shouldIgnoreFocus = true;
}

export function shouldIgnoreFocus(element: HTMLElement): boolean {
    return !!(element as FocusedElementWithIgnoreFlag).__shouldIgnoreFocus;
}

export function getUId(wnd: Window): string {
    const rnd = new Uint32Array(4);

    wnd.crypto.getRandomValues(rnd);

    const srnd: string[] = [];

    for (let i = 0; i < rnd.length; i++) {
        srnd.push(rnd[i].toString(36));
    }

    srnd.push("|");
    srnd.push((++_uidCounter).toString(36));
    srnd.push("|");
    srnd.push(Date.now().toString(36));

    return srnd.join("");
}

export function getElementUId(
    getWindow: GetWindow,
    element: HTMLElementWithUID
): string {
    const context = getInstanceContext(getWindow);
    let uid = element.__tabsterElementUID;

    if (!uid) {
        uid = element.__tabsterElementUID = getUId(getWindow());
    }

    if (
        !context.elementByUId[uid] &&
        documentContains(element.ownerDocument, element)
    ) {
        context.elementByUId[uid] = new WeakHTMLElement(element);
    }

    return uid;
}

export function getElementByUId(
    context: InstanceContext,
    uid: string
): WeakHTMLElement<HTMLElementWithUID, undefined> | undefined {
    return context.elementByUId[uid];
}

export function getWindowUId(win: WindowWithUID): string {
    let uid = win.__tabsterCrossOriginWindowUID;

    if (!uid) {
        uid = win.__tabsterCrossOriginWindowUID = getUId(win);
    }

    return uid;
}

export function clearElementCache(
    getWindow: GetWindow,
    parent?: HTMLElement
): void {
    const context = getInstanceContext(getWindow);

    for (const key of Object.keys(context.elementByUId)) {
        const wel = context.elementByUId[key];
        const el = wel && wel.get();

        if (el && parent) {
            if (!dom.nodeContains(parent, el)) {
                continue;
            }
        }

        delete context.elementByUId[key];
    }
}

// Uses `dom.nodeContains` so the shadow-DOM / iframe abstraction can override it.
export function documentContains(
    doc: Document | null | undefined,
    element: HTMLElement
): boolean {
    return dom.nodeContains(doc?.body, element);
}

export function matchesSelector(
    element: HTMLElement,
    selector: string
): boolean {
    return typeof element.matches === "function" && element.matches(selector);
}

let _lastTabsterPartId = 0;

export abstract class TabsterPart<
    P,
    D = undefined,
> implements TabsterPartInterface<P> {
    protected _tabster: TabsterCore;
    protected _element: WeakHTMLElement<HTMLElement, D>;
    protected _props: P;

    readonly id: string;

    constructor(tabster: TabsterCore, element: HTMLElement, props: P) {
        this._tabster = tabster;
        this._element = new WeakHTMLElement(element);
        this._props = { ...props };
        this.id = "i" + ++_lastTabsterPartId;
    }

    getElement(): HTMLElement | undefined {
        return this._element.get();
    }

    getProps(): P {
        return this._props;
    }

    setProps(props: P): void {
        this._props = { ...props };
    }
}

export function getLastChild(container: HTMLElement): HTMLElement | undefined {
    let lastChild: HTMLElement | null = null;

    for (
        let i = dom.getLastElementChild(container);
        i;
        i = dom.getLastElementChild(i)
    ) {
        lastChild = i as HTMLElement;
    }

    return lastChild || undefined;
}

export function getAdjacentElement(
    from: HTMLElement,
    prev?: boolean
): HTMLElement | undefined {
    let cur: HTMLElement | null = from;
    let adjacent: HTMLElement | null = null;

    while (cur && !adjacent) {
        adjacent = (
            prev
                ? dom.getPreviousElementSibling(cur)
                : dom.getNextElementSibling(cur)
        ) as HTMLElement | null;
        cur = dom.getParentElement(cur);
    }

    return adjacent || undefined;
}

export function augmentAttribute(
    tabster: TabsterCore,
    element: HTMLElement,
    name: string,
    value?: string | null // Restore original value when undefined.
): boolean {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const entry = tabster.storageEntry(element, true)!;
    let ret = false;

    if (!entry.aug) {
        if (value === undefined) {
            return ret;
        }

        entry.aug = {};
    }

    if (value === undefined) {
        if (name in entry.aug) {
            const origVal = entry.aug[name];

            delete entry.aug[name];

            if (origVal === null) {
                element.removeAttribute(name);
            } else {
                element.setAttribute(name, origVal);
            }

            ret = true;
        }
    } else {
        let origValue: string | null | undefined;

        if (!(name in entry.aug)) {
            origValue = element.getAttribute(name);
        }

        if (origValue !== undefined && origValue !== value) {
            entry.aug[name] = origValue;

            if (value === null) {
                element.removeAttribute(name);
            } else {
                element.setAttribute(name, value);
            }

            ret = true;
        }
    }

    if (value === undefined && Object.keys(entry.aug).length === 0) {
        delete entry.aug;
        tabster.storageEntry(element, false);
    }

    return ret;
}

export function getTabsterAttributeOnElement(
    element: HTMLElement
): TabsterAttributeProps | null {
    if (!element.hasAttribute(TABSTER_ATTRIBUTE_NAME)) {
        return null;
    }

    // We already checked the presence with `hasAttribute`
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rawAttribute = element.getAttribute(TABSTER_ATTRIBUTE_NAME)!;
    let tabsterAttribute: TabsterAttributeProps;
    try {
        tabsterAttribute = JSON.parse(rawAttribute);
    } catch {
        console.error("Tabster: failed to parse attribute", rawAttribute);
        tabsterAttribute = {};
    }

    return tabsterAttribute;
}

export function isDisplayNone(element: HTMLElement): boolean {
    const elementDocument = element.ownerDocument;
    const computedStyle =
        elementDocument.defaultView?.getComputedStyle(element);

    // offsetParent is null for elements with display:none, display:fixed and for <body>.
    if (
        element.offsetParent === null &&
        elementDocument.body !== element &&
        computedStyle?.position !== "fixed"
    ) {
        return true;
    }

    // For our purposes of looking for focusable elements, visibility:hidden has the same
    // effect as display:none.
    if (computedStyle?.visibility === "hidden") {
        return true;
    }

    // if an element has display: fixed, we need to check if it is also hidden with CSS,
    // or within a parent hidden with CSS
    if (computedStyle?.position === "fixed") {
        if (computedStyle.display === "none") {
            return true;
        }

        if (
            element.parentElement?.offsetParent === null &&
            elementDocument.body !== element.parentElement
        ) {
            return true;
        }
    }

    return false;
}

export function isRadio(element: HTMLElement): boolean {
    return (
        element.tagName === "INPUT" &&
        !!(element as HTMLInputElement).name &&
        (element as HTMLInputElement).type === "radio"
    );
}

export function getRadioButtonGroup(
    element: HTMLElement
): RadioButtonGroup | undefined {
    if (!isRadio(element)) {
        return;
    }

    const name = (element as HTMLInputElement).name;
    let radioButtons = Array.from(dom.getElementsByName(element, name));
    let checked: HTMLInputElement | undefined;

    radioButtons = radioButtons.filter((el) => {
        if (isRadio(el)) {
            if ((el as HTMLInputElement).checked) {
                checked = el as HTMLInputElement;
            }
            return true;
        }
        return false;
    });

    return {
        name,
        buttons: new Set(radioButtons as HTMLInputElement[]),
        checked,
    };
}

/**
 * Opaque handle for a single setTimeout id. Use {@link setTimer},
 * {@link clearTimer}, and {@link isTimerActive} to operate on it.
 *
 * Built as a free-function API rather than methods because the function names
 * mangle to single characters (1 char per call site) while property names like
 * `.clear` would be preserved by the minifier (~5 chars per call site).
 */
export interface Timer {
    id: number | null;
}

export function createTimer(): Timer {
    return { id: null };
}

/** Cancels any pending timer on `t` and schedules `callback` after `delay` ms. */
export function setTimer(
    t: Timer,
    window: Window,
    callback: () => void,
    delay: number
): void {
    if (t.id !== null) {
        window.clearTimeout(t.id);
    }
    t.id = window.setTimeout(() => {
        t.id = null;
        callback();
    }, delay) as unknown as number;
}

/** Cancels the pending timer on `t`; no-op if there isn't one. */
export function clearTimer(t: Timer, window: Window): void {
    if (t.id !== null) {
        window.clearTimeout(t.id);
        t.id = null;
    }
}

/** Whether `t` has a pending timer. */
export function isTimerActive(t: Timer): boolean {
    return t.id !== null;
}

/**
 * Thin wrappers around `addEventListener` / `removeEventListener`. Their
 * names get mangled to single chars by the minifier, while the inlined
 * property accesses on `target` would not — so each call site shrinks by
 * the difference between the helper's mangled name and the property name.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEventHandler = (event: any) => void;

export function addListener(
    target: EventTarget | null | undefined,
    type: string,
    handler: AnyEventHandler,
    options?: boolean | AddEventListenerOptions
): void {
    target?.addEventListener(type, handler, options);
}

export function removeListener(
    target: EventTarget | null | undefined,
    type: string,
    handler: AnyEventHandler,
    options?: boolean | EventListenerOptions
): void {
    target?.removeEventListener(type, handler, options);
}

/**
 * If the passed element is Tabster dummy input, returns the container element this dummy input belongs to.
 * @param element Element to check for being dummy input.
 * @returns Dummy input container element (if the passed element is a dummy input) or null.
 */
