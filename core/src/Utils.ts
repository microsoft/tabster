/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from './Types';
import { GetWindow, Visibilities, Visibility } from './Types';

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
    basics: Types.InternalBasics;
    WeakRef?: WeakRefConstructor;
    containerBoundingRectCache: { [id: string]: { rect: TabsterDOMRect, element: HTMLElementWithBoundingRectCacheId } };
    lastContainerBoundingRectCacheId: number;
    containerBoundingRectCacheTimer?: number;
    weakElementStorage: { [id: string]: TabsterWeakRef; };
    lastWeakElementId: number;
    weakCleanupTimer?: number;
    weakCleanupStarted: boolean;
}

let _isBrokenIE11: boolean;

const _DOMRect = typeof DOMRect !== 'undefined' ? DOMRect : class {
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
    readonly top: number;

    constructor(x?: number, y?: number, width?: number, height?: number) {
        this.left = x || 0;
        this.top = y || 0;
        this.right = (x || 0) + (width || 0);
        this.bottom = (y || 0) + (height || 0);
    }
};

let _uidCounter = 0;

try {
    // IE11 only accepts `filter` argument as a function (not object with the `acceptNode`
    // property as the docs define). Also `entityReferenceExpansion` argument is not
    // optional. And it throws exception when the above arguments aren't there.
    document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
    _isBrokenIE11 = false;
} catch (e) {
    _isBrokenIE11 = true;
}

interface WindowWithUtilsConext extends Window {
    __tabsterInstanceContext?: InstanceContext;
    Promise: PromiseConstructor;
    WeakRef: WeakRefConstructor;
}

export function getInstanceContext(getWindow: GetWindow): InstanceContext {
    const win = getWindow() as WindowWithUtilsConext;

    let ctx = win.__tabsterInstanceContext;

    if (!ctx) {
        ctx = {
            elementByUId: {},
            basics: {
                Promise: win.Promise || undefined,
                WeakRef: win.WeakRef || undefined
            },
            containerBoundingRectCache: {},
            lastContainerBoundingRectCacheId: 0,
            weakElementStorage: {},
            lastWeakElementId: 0,
            weakCleanupStarted: false
        };

        win.__tabsterInstanceContext = ctx;
    }

    return ctx;
}

export function disposeInstanceContext(win: Window): void {
    const ctx = (win as WindowWithUtilsConext).__tabsterInstanceContext;

    if (ctx) {
        ctx.elementByUId = {};

        delete ctx.WeakRef;

        ctx.containerBoundingRectCache = {};

        if (ctx.containerBoundingRectCacheTimer) {
            win.clearTimeout(ctx.containerBoundingRectCacheTimer);
        }

        if (ctx.weakCleanupTimer) {
            win.clearTimeout(ctx.weakCleanupTimer);
        }

        ctx.weakElementStorage = {};

        delete (win as WindowWithUtilsConext).__tabsterInstanceContext;
    }
}

interface TabsterWeakRef {
    deref(): HTMLElement | undefined;
}

class FakeWeakRef implements TabsterWeakRef {
    private _target: HTMLElement | undefined;

    constructor(target: HTMLElement) {
        this._target = target;
    }

    deref(): HTMLElement | undefined {
        return this._target;
    }

    static cleanup(fwr: FakeWeakRef): boolean {
        if (!fwr._target) {
            return true;
        }

        if (!documentContains(fwr._target.ownerDocument, fwr._target)) {
            delete fwr._target;
            return true;
        }

        return false;
    }
}

export class WeakHTMLElement<T extends HTMLElement = HTMLElement, D = undefined> implements Types.WeakHTMLElement<D> {
    private _ctx: InstanceContext;
    private _id: string;
    private _data: D | undefined;

    constructor(getWindow: GetWindow, element: T, data?: D) {
        const context = getInstanceContext(getWindow);
        this._ctx = context;
        this._id = 'we' + ++context.lastWeakElementId;

        context.weakElementStorage[this._id] = context.WeakRef ? new context.WeakRef(element) : new FakeWeakRef(element);

        if (data !== undefined) {
            this._data = data;
        }
    }

    get(): T | undefined {
        const ref = this._ctx.weakElementStorage[this._id];
        const el = (ref && ref.deref()) as (T | undefined);
        if (ref && !el) {
            delete this._ctx.weakElementStorage[this._id];
        }
        return el;
    }

    getData(): D | undefined {
        return this._data;
    }
}

export function cleanupWeakRefStorage(getWindow: GetWindow, forceRemove?: boolean): void {
    const context = getInstanceContext(getWindow);

    if (forceRemove) {
        context.weakElementStorage = {};
    } else {
        for (let id of Object.keys(context.weakElementStorage)) {
            const we = context.weakElementStorage[id];
            if (context.WeakRef) {
                if (!we.deref()) {
                    delete context.weakElementStorage[id];
                }
            } else {
                if (FakeWeakRef.cleanup(we as FakeWeakRef)) {
                    delete context.weakElementStorage[id];
                }
            }
        }
    }
}

export function startWeakRefStorageCleanup(getWindow: GetWindow): void {
    const context = getInstanceContext(getWindow);

    if (!context.weakCleanupStarted) {
        context.weakCleanupStarted = true;
        context.WeakRef = getWeakRef(context);
    }

    if (!context.weakCleanupTimer) {
        context.weakCleanupTimer = getWindow().setTimeout(() => {
            context.weakCleanupTimer = undefined;
            cleanupWeakRefStorage(getWindow);
            startWeakRefStorageCleanup(getWindow);
        }, 2 * 60 * 1000); // 2 minutes.
    }
}

export function stopWeakRefStorageCleanupAndClearStorage(getWindow: GetWindow): void {
    const context = getInstanceContext(getWindow);

    context.weakCleanupStarted = false;

    if (context.weakCleanupTimer) {
        getWindow().clearTimeout(context.weakCleanupTimer);
        context.weakCleanupTimer = undefined;
        context.weakElementStorage = {};
    }
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

export function getBoundingRect(getWindow: GetWindow, element: HTMLElementWithBoundingRectCacheId): TabsterDOMRect {
    let cacheId = element.__tabsterCacheId;
    const context = getInstanceContext(getWindow);
    let cached = cacheId ? context.containerBoundingRectCache[cacheId] : undefined;

    if (cached) {
        return cached.rect;
    }

    const scrollingElement = element.ownerDocument && element.ownerDocument.documentElement;

    if (!scrollingElement) {
        return new _DOMRect();
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

    const rect = new _DOMRect(
        left < right ? left : -1,
        top < bottom ? top : -1,
        left < right ? right - left : 0,
        top < bottom ? bottom - top : 0
    );

    if (!cacheId) {
        cacheId = 'r-' + ++context.lastContainerBoundingRectCacheId;
        element.__tabsterCacheId = cacheId;
    }

    context.containerBoundingRectCache[cacheId] = {
        rect,
        element
    };

    if (!context.containerBoundingRectCacheTimer) {
        context.containerBoundingRectCacheTimer = window.setTimeout(() => {
            context.containerBoundingRectCacheTimer = undefined;

            for (let cId of Object.keys(context.containerBoundingRectCache)) {
                delete context.containerBoundingRectCache[cId].element.__tabsterCacheId;
            }

            context.containerBoundingRectCache = {};
        }, 50);
    }

    return rect;
}

export function isElementVerticallyVisibleInContainer(getWindow: GetWindow, element: HTMLElement): boolean {
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
        const elementRect = element.getBoundingClientRect();

        return (elementRect.top >= containerRect.top) &&
            (elementRect.bottom <= containerRect.bottom);
    }

    return false;
}

export function isElementVisibleInContainer(getWindow: GetWindow, element: HTMLElement, gap = 0): Visibility {
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
        const elementRect = element.getBoundingClientRect();

        if (
            ((elementRect.left > containerRect.right) || (elementRect.top > containerRect.bottom)) ||
            ((elementRect.bottom < containerRect.top) || (elementRect.right < containerRect.left))
        ) {
            return Visibilities.Invisible;
        }

        if (
            ((elementRect.top + gap >= containerRect.top) && (elementRect.top <= containerRect.bottom)) &&
            ((elementRect.bottom >= containerRect.top) && (elementRect.bottom - gap <= containerRect.bottom)) &&
            ((elementRect.left + gap >= containerRect.left) && (elementRect.left <= containerRect.right)) &&
            ((elementRect.right >= containerRect.left) && (elementRect.right - gap <= containerRect.right))
        ) {
            return Visibilities.Visible;
        }

        return Visibilities.PartiallyVisible;
    }

    return Visibilities.Invisible;
}

export function scrollIntoView(getWindow: GetWindow, element: HTMLElement, alignToTop: boolean): void {
    // Built-in DOM's scrollIntoView() is cool, but when we have nested containers,
    // it scrolls all of them, not just the deepest one. So, trying to work it around.
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
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
            if ((el.scrollWidth > el.clientWidth) || (el.scrollHeight > el.clientHeight)) {
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

export function getUId(wnd: Window & { msCrypto?: Crypto }): string {
    const rnd = new Uint32Array(4);

    if (wnd.crypto && wnd.crypto.getRandomValues) {
        wnd.crypto.getRandomValues(rnd);
    } else if (wnd.msCrypto && wnd.msCrypto.getRandomValues) {
        wnd.msCrypto.getRandomValues(rnd);
    } else {
        for (let i = 0; i < rnd.length; i++) {
            rnd[i] = 0xffffffff * Math.random();
        }
    }

    const srnd: string[] = [];

    for (let i = 0; i < rnd.length; i++) {
        srnd.push(rnd[i].toString(36));
    }

    srnd.push('|');
    srnd.push((++_uidCounter).toString(36));
    srnd.push('|');
    srnd.push(Date.now().toString(36));

    return srnd.join('');
}

export function getElementUId(getWindow: GetWindow, element: HTMLElementWithUID): string {
    const context = getInstanceContext(getWindow);
    let uid = element.__tabsterElementUID;

    if (!uid) {
        uid = element.__tabsterElementUID = getUId(getWindow());
    }

    if (!context.elementByUId[uid] && documentContains(element.ownerDocument, element)) {
        context.elementByUId[uid] = new WeakHTMLElement(getWindow, element) ;
    }

    return uid;
}

export function getElementByUId(context: InstanceContext, uid: string): WeakHTMLElement<HTMLElementWithUID, undefined> | undefined {
    return context.elementByUId[uid];
}

export function getWindowUId(win: WindowWithUID): string {
    let uid = win.__tabsterCrossOriginWindowUID;

    if (!uid) {
        uid = win.__tabsterCrossOriginWindowUID = getUId(win);
    }

    return uid;
}

export function clearElementCache(getWindow: GetWindow, parent?: HTMLElement): void {
    const context = getInstanceContext(getWindow);

    for (let key of Object.keys(context.elementByUId)) {
        const wel = context.elementByUId[key];
        const el = wel && wel.get();

        if (el && parent) {
            if (!parent.contains(el)) {
                continue;
            }
        }

        delete context.elementByUId[key];
    }
}

// IE11 doesn't have document.contains()...
export function documentContains(doc: HTMLDocument | null | undefined, element: HTMLElement): boolean {
    return !!(doc?.body?.contains(element));
}

export function matchesSelector(element: HTMLElement, selector: string): boolean {
    interface HTMLElementWithMatches extends HTMLElement {
        matchesSelector?: typeof HTMLElement.prototype.matches;
        msMatchesSelector?: typeof HTMLElement.prototype.matches;
    }

    const matches = element.matches ||
        (element as HTMLElementWithMatches).matchesSelector ||
        (element as HTMLElementWithMatches).msMatchesSelector ||
        element.webkitMatchesSelector;

    return matches && matches.call(element, selector);
}

export function getPromise(getWindow: GetWindow): PromiseConstructor {
    const context = getInstanceContext(getWindow);
    if (context.basics.Promise) {
        return context.basics.Promise;
    }

    throw new Error('No Promise defined.');
}

export function getWeakRef<T>(context: InstanceContext): WeakRefConstructor | undefined {
    return context.basics.WeakRef;
}

export function setBasics(win: Window, basics: Types.InternalBasics): void {
    const context = getInstanceContext(() => win);

    let key: keyof Types.InternalBasics;

    key = 'Promise';
    if (key in basics) {
        context.basics[key] = basics[key];
    }

    key = 'WeakRef';
    if (key in basics) {
        context.basics[key] = basics[key];
    }
}

let _lastTabsterPartId = 0;

export abstract class TabsterPart<B, E, D = undefined> implements Types.TabsterPart<B, E> {
    protected _tabster: Types.TabsterCore;
    protected _element: WeakHTMLElement<HTMLElement, D>;
    protected _win: GetWindow;
    protected _basic: Partial<B>;
    protected _extended: Partial<E>;

    readonly id: string;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        getWindow: GetWindow,
        basic?: B,
        extended?: E
    ) {
        this._tabster = tabster;
        this._element = new WeakHTMLElement(getWindow, element);
        this._win = getWindow;
        this._basic = basic || {};
        this._extended = extended || {};
        this.id = 'i' + ++_lastTabsterPartId;
    }

    getElement(): HTMLElement | undefined {
        return this._element.get();
    }

    getBasicProps(): Partial<B> {
        return this._basic;
    }

    getExtendedProps(): Partial<E> {
        return this._extended;
    }

    setProps(basic?: Partial<B> | null, extended?: Partial<E> | null): void {
        if (basic) {
            this._basic = { ...this._basic, ...basic };
        } else if (basic === null) {
            this._basic = {};
        }

        if (extended) {
            this._extended = { ...this._extended, ...extended };
        } else if (extended === null) {
            this._extended = {};
        }
    }
}

export interface DummyInputProps {
    isFirst: boolean;
    focusin?: (e: FocusEvent) => void;
    focusout?: (e: FocusEvent) => void;
    isPhantom?: boolean; // The input is created to be used only once and autoremoved when focused.
}

export type DummyInputFocusCallback<P> = (input: HTMLDivElement, props: P) => void;

export class DummyInput<P> {
    private _onFocusIn: DummyInputFocusCallback<P> | undefined;
    private _onFocusOut: DummyInputFocusCallback<P> | undefined;
    private _isPhantom: boolean;

    input: HTMLDivElement | undefined;
    props: P;

    constructor(
        getWindow: Types.GetWindow,
        isPhantom: boolean,
        focusIn: DummyInputFocusCallback<P>,
        focusOut: DummyInputFocusCallback<P>,
        props: P
    ) {
        const input = getWindow().document.createElement('div');

        input.tabIndex = 0;
        input.setAttribute('role', 'none');
        input.setAttribute(Types.TabsterDummyInputAttributeName, '');
        input.setAttribute('aria-hidden', 'true');

        const style = input.style;
        style.position = 'fixed';
        style.width = style.height = '1px';
        style.left = style.top = '-100500px';
        style.opacity = '0';
        style.zIndex = '-1';

        if (__DEV__) {
            style.setProperty('--tabster-dummy-input', 'yes');
        }

        makeFocusIgnored(input);

        this.input = input;
        this._isPhantom = isPhantom;
        this._onFocusIn = focusIn;
        this._onFocusOut = focusOut;
        this.props = props;

        input.addEventListener('focusin', this._focusIn);
        input.addEventListener('focusout', this._focusOut);
    }

    dispose(): void {
        const input = this.input;

        if (!input) {
            return;
        }

        delete this._onFocusIn;
        delete this._onFocusOut;
        delete this.input;

        input.removeEventListener('focusin', this._focusIn);
        input.removeEventListener('focusout', this._focusOut);

        input.parentElement?.removeChild(input);
    }

    private _focusIn = (e: FocusEvent): void => {
        if (this._onFocusIn && this.input) {
            this._onFocusIn(this.input, this.props);
        }
    }

    private _focusOut = (e: FocusEvent): void => {
        if (this._onFocusOut && this.input) {
            this._onFocusOut(this.input, this.props);
        }

        if (this._isPhantom) {
            this.dispose();
        }
    }
}

export function findLastChild(container: HTMLElement): HTMLElement | null {
    let lastChild: HTMLElement | null = null;

    for (let i = container.lastElementChild; i; i = i.lastElementChild) {
        lastChild = i as HTMLElement;
    }

    return lastChild || container;
}
