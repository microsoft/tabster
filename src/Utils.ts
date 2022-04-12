/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";
import { GetWindow, Visibilities, Visibility } from "./Types";

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
    basics: InternalBasics;
    WeakRef?: WeakRefConstructor;
    containerBoundingRectCache: {
        [id: string]: {
            rect: TabsterDOMRect;
            element: HTMLElementWithBoundingRectCacheId;
        };
    };
    lastContainerBoundingRectCacheId: number;
    containerBoundingRectCacheTimer?: number;
    fakeWeakRefs: TabsterWeakRef<unknown>[];
    fakeWeakRefsTimer?: number;
    fakeWeakRefsStarted: boolean;
}

let _isBrokenIE11: boolean;

const _DOMRect =
    typeof DOMRect !== "undefined"
        ? DOMRect
        : class {
              readonly bottom: number;
              readonly left: number;
              readonly right: number;
              readonly top: number;

              constructor(
                  x?: number,
                  y?: number,
                  width?: number,
                  height?: number
              ) {
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
                WeakRef: win.WeakRef || undefined,
            },
            containerBoundingRectCache: {},
            lastContainerBoundingRectCacheId: 0,
            fakeWeakRefs: [],
            fakeWeakRefsStarted: false,
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

        if (ctx.fakeWeakRefsTimer) {
            win.clearTimeout(ctx.fakeWeakRefsTimer);
        }

        ctx.fakeWeakRefs = [];

        delete (win as WindowWithUtilsConext).__tabsterInstanceContext;
    }
}

export function createWeakMap<K extends object, V>(win: Window): WeakMap<K, V> {
    const ctx = (win as WindowWithUtilsConext).__tabsterInstanceContext;
    return new (ctx?.basics.WeakMap || WeakMap)();
}

interface TabsterWeakRef<T> {
    deref(): T | undefined;
}

class FakeWeakRef<T extends HTMLElement = HTMLElement>
    implements TabsterWeakRef<T>
{
    private _target: T | undefined;

    constructor(target: T) {
        this._target = target;
    }

    deref(): T | undefined {
        return this._target;
    }

    static cleanup(fwr: FakeWeakRef, forceRemove?: boolean): boolean {
        if (!fwr._target) {
            return true;
        }

        if (
            forceRemove ||
            !documentContains(fwr._target.ownerDocument, fwr._target)
        ) {
            delete fwr._target;
            return true;
        }

        return false;
    }
}

export class WeakHTMLElement<T extends HTMLElement = HTMLElement, D = undefined>
    implements Types.WeakHTMLElement<D>
{
    private _ref: TabsterWeakRef<T> | undefined;
    private _data: D | undefined;

    constructor(getWindow: GetWindow, element: T, data?: D) {
        const context = getInstanceContext(getWindow);

        let ref: TabsterWeakRef<T>;
        if (context.WeakRef) {
            ref = new context.WeakRef(element);
        } else {
            ref = new FakeWeakRef(element);
            context.fakeWeakRefs.push(ref);
        }

        this._ref = ref;
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

export function cleanupFakeWeakRefs(
    getWindow: GetWindow,
    forceRemove?: boolean
): void {
    const context = getInstanceContext(getWindow);
    context.fakeWeakRefs = context.fakeWeakRefs.filter(
        (e) => !FakeWeakRef.cleanup(e as FakeWeakRef, forceRemove)
    );
}

export function startFakeWeakRefsCleanup(getWindow: GetWindow): void {
    const context = getInstanceContext(getWindow);

    if (!context.fakeWeakRefsStarted) {
        context.fakeWeakRefsStarted = true;
        context.WeakRef = getWeakRef(context);
    }

    if (!context.fakeWeakRefsTimer) {
        context.fakeWeakRefsTimer = getWindow().setTimeout(() => {
            context.fakeWeakRefsTimer = undefined;
            cleanupFakeWeakRefs(getWindow);
            startFakeWeakRefsCleanup(getWindow);
        }, 2 * 60 * 1000); // 2 minutes.
    }
}

export function stopFakeWeakRefsCleanupAndClearStorage(
    getWindow: GetWindow
): void {
    const context = getInstanceContext(getWindow);

    context.fakeWeakRefsStarted = false;

    if (context.fakeWeakRefsTimer) {
        getWindow().clearTimeout(context.fakeWeakRefsTimer);
        context.fakeWeakRefsTimer = undefined;
        context.fakeWeakRefs = [];
    }
}

export function createElementTreeWalker(
    doc: Document,
    root: Node,
    acceptNode: (node: Node) => number
): TreeWalker | undefined {
    // IE11 will throw an exception when the TreeWalker root is not an Element.
    if (root.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
    }

    // TypeScript isn't aware of IE11 behaving badly.
    const filter = (_isBrokenIE11
        ? acceptNode
        : ({ acceptNode } as NodeFilter)) as unknown as NodeFilter;

    return doc.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        filter,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: We still don't want to completely break IE11, so, entityReferenceExpansion argument is not optional.
        false /* Last argument is not optional for IE11! */
    );
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
        cacheId = "r-" + ++context.lastContainerBoundingRectCacheId;
        element.__tabsterCacheId = cacheId;
    }

    context.containerBoundingRectCache[cacheId] = {
        rect,
        element,
    };

    if (!context.containerBoundingRectCacheTimer) {
        context.containerBoundingRectCacheTimer = window.setTimeout(() => {
            context.containerBoundingRectCacheTimer = undefined;

            for (const cId of Object.keys(context.containerBoundingRectCache)) {
                delete context.containerBoundingRectCache[cId].element
                    .__tabsterCacheId;
            }

            context.containerBoundingRectCache = {};
        }, 50);
    }

    return rect;
}

export function isElementVerticallyVisibleInContainer(
    getWindow: GetWindow,
    element: HTMLElement
): boolean {
    const container = getScrollableContainer(element);

    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
        const elementRect = element.getBoundingClientRect();

        return (
            elementRect.top >= containerRect.top &&
            elementRect.bottom <= containerRect.bottom
        );
    }

    return false;
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
            let el: HTMLElement | null = element.parentElement;
            el;
            el = el.parentElement
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
        context.elementByUId[uid] = new WeakHTMLElement(getWindow, element);
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
            if (!parent.contains(el)) {
                continue;
            }
        }

        delete context.elementByUId[key];
    }
}

// IE11 doesn't have document.contains()...
export function documentContains(
    doc: HTMLDocument | null | undefined,
    element: HTMLElement
): boolean {
    return !!doc?.body?.contains(element);
}

export function matchesSelector(
    element: HTMLElement,
    selector: string
): boolean {
    interface HTMLElementWithMatches extends HTMLElement {
        matchesSelector?: typeof HTMLElement.prototype.matches;
        msMatchesSelector?: typeof HTMLElement.prototype.matches;
    }

    const matches =
        element.matches ||
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

    throw new Error("No Promise defined.");
}

export function getWeakRef(
    context: InstanceContext
): WeakRefConstructor | undefined {
    return context.basics.WeakRef;
}

interface InternalBasics {
    Promise?: PromiseConstructor;
    WeakRef?: WeakRefConstructor;
    WeakMap?: WeakMapConstructor;
}

export function setBasics(win: Window, basics: InternalBasics): void {
    const context = getInstanceContext(() => win);

    let key: keyof InternalBasics;

    key = "Promise";
    if (key in basics) {
        context.basics[key] = basics[key];
    }

    key = "WeakRef";
    if (key in basics) {
        context.basics[key] = basics[key];
    }

    key = "WeakMap";
    if (key in basics) {
        context.basics[key] = basics[key];
    }
}

let _lastTabsterPartId = 0;

export abstract class TabsterPart<P, D = undefined>
    implements Types.TabsterPart<P>
{
    protected _tabster: Types.TabsterInternal;
    protected _element: WeakHTMLElement<HTMLElement, D>;
    protected _props: P;

    readonly id: string;

    constructor(
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        props: P
    ) {
        const getWindow = tabster.getWindow;
        this._tabster = tabster;
        this._element = new WeakHTMLElement(getWindow, element);
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

export interface DummyInputProps {
    /** The input is created to be used only once and autoremoved when focused. */
    isPhantom?: boolean;
    /** Whether the input is before or after the content it is guarding.  */
    isFirst: boolean;
}

export type DummyInputFocusCallback = (dummyInput: DummyInput) => void;

/**
 * Dummy HTML elements that are used as focus sentinels for the DOM enclosed within them
 */
export class DummyInput {
    private _isPhantom: DummyInputProps["isPhantom"];

    input: HTMLDivElement | undefined;
    /** Flag that indicates focus is leaving the boundary of the dummy input */
    shouldMoveOut?: boolean;
    isFirst: DummyInputProps["isFirst"];
    /** Called when the input is focused */
    onFocusIn?: DummyInputFocusCallback;
    /** Called when the input is blurred */
    onFocusOut?: DummyInputFocusCallback;

    constructor(getWindow: Types.GetWindow, props: DummyInputProps) {
        const input = getWindow().document.createElement("div");

        input.tabIndex = 0;
        input.setAttribute("role", "none");
        input.setAttribute(Types.TabsterDummyInputAttributeName, "");
        input.setAttribute("aria-hidden", "true");

        const style = input.style;
        style.position = "fixed";
        style.width = style.height = "1px";
        style.left = style.top = "-100500px";
        style.opacity = "0";
        style.zIndex = "-1";

        if (__DEV__) {
            style.setProperty("--tabster-dummy-input", "yes");
        }

        makeFocusIgnored(input);

        this.input = input;
        this.isFirst = props.isFirst;
        this._isPhantom = props.isPhantom ?? false;

        input.addEventListener("focusin", this._focusIn);
        input.addEventListener("focusout", this._focusOut);
    }

    dispose(): void {
        const input = this.input;

        if (!input) {
            return;
        }

        delete this.onFocusIn;
        delete this.onFocusOut;
        delete this.input;

        input.removeEventListener("focusin", this._focusIn);
        input.removeEventListener("focusout", this._focusOut);

        input.parentElement?.removeChild(input);
    }

    private _focusIn = (): void => {
        if (this.onFocusIn && this.input) {
            this.onFocusIn(this);
        }
    };

    private _focusOut = (): void => {
        this.shouldMoveOut = false;

        if (this.onFocusOut && this.input) {
            this.onFocusOut(this);
        }

        if (this._isPhantom) {
            this.dispose();
        }
    };
}

interface HTMLElementWithDummyInputs extends HTMLElement {
    __tabsterDummy?: DummyInputManagerCore;
}

export const DummyInputManagerPriorities = {
    Root: 1,
    Modalizer: 2,
    Mover: 3,
    Groupper: 4,
};

export class DummyInputManager {
    private _instance?: DummyInputManagerCore;
    private _onFocusIn?: (dummyInput: DummyInput) => void;
    private _onFocusOut?: (dummyInput: DummyInput) => void;
    protected _element: WeakHTMLElement;

    moveOutWithDefaultAction: DummyInputManagerCore["moveOutWithDefaultAction"];

    constructor(
        tabster: Types.TabsterCore,
        element: WeakHTMLElement,
        priority: number
    ) {
        this._element = element;

        this._instance = new DummyInputManagerCore(
            tabster,
            element,
            this,
            priority
        );

        this.moveOutWithDefaultAction = (backwards: boolean) => {
            this._instance?.moveOutWithDefaultAction(backwards);
        };
    }

    protected _setHandlers(
        onFocusIn?: (dummyInput: DummyInput) => void,
        onFocusOut?: (dummyInput: DummyInput) => void
    ): void {
        this._onFocusIn = onFocusIn;
        this._onFocusOut = onFocusOut;
    }

    getHandler(isIn: boolean): ((dummyInput: DummyInput) => void) | undefined {
        return isIn ? this._onFocusIn : this._onFocusOut;
    }

    setTabbable(tabbable: boolean) {
        this._instance?.setTabbable(this, tabbable);
    }

    dispose(): void {
        if (this._instance) {
            this._instance.dispose(this);
            delete this._instance;
        }

        delete this._onFocusIn;
        delete this._onFocusOut;
    }
}

interface DummyInputWrapper {
    manager: DummyInputManager;
    priority: number;
    tabbable: boolean;
}

/**
 * Parent class that encapsulates the behaviour of dummy inputs (focus sentinels)
 */
class DummyInputManagerCore {
    private _unobserve: (() => void) | undefined;
    private _addTimer: number | undefined;
    private _getWindow: Types.GetWindow;
    private _wrappers: DummyInputWrapper[] = [];
    protected _element: WeakHTMLElement | undefined;
    protected firstDummy: DummyInput | undefined;
    protected lastDummy: DummyInput | undefined;

    constructor(
        tabster: Types.TabsterCore,
        element: WeakHTMLElement,
        manager: DummyInputManager,
        priority: number
    ) {
        const el = element.get() as HTMLElementWithDummyInputs;

        if (!el) {
            throw new Error("No element");
        }

        this._getWindow = (tabster as Types.TabsterInternal).getWindow;

        const instance = el.__tabsterDummy;

        (instance || this)._wrappers.push({
            manager,
            priority,
            tabbable: true,
        });

        if (instance) {
            return instance;
        }

        el.__tabsterDummy = this;

        this.firstDummy = new DummyInput(this._getWindow, {
            isFirst: true,
        });

        this.lastDummy = new DummyInput(this._getWindow, {
            isFirst: false,
        });

        this.firstDummy.onFocusIn = this._onFocusIn;
        this.firstDummy.onFocusOut = this._onFocusOut;
        this.lastDummy.onFocusIn = this._onFocusIn;
        this.lastDummy.onFocusOut = this._onFocusOut;

        this._element = element;
        this._addDummyInputs();

        // older versions of testing frameworks like JSDOM don't support MutationObserver
        // https://github.com/jsdom/jsdom/issues/639
        // use this way of getting NODE_ENV because tsdx does not support a test environment
        // https://github.com/jaredpalmer/tsdx/issues/167
        if (
            typeof process === "undefined" ||
            process.env["NODE_ENV"] !== "test"
        ) {
            this._observeMutations();
        }
    }

    dispose(manager: DummyInputManager, force?: boolean): void {
        const wrappers = (this._wrappers = this._wrappers.filter(
            (w) => w.manager !== manager && !force
        ));

        if (wrappers.length === 0) {
            if (this._unobserve) {
                this._unobserve();
                delete this._unobserve;
            }

            if (this._addTimer) {
                this._getWindow().clearTimeout(this._addTimer);
                delete this._addTimer;
            }

            this.firstDummy?.dispose();
            this.lastDummy?.dispose();
        }
    }

    private _onFocus(isIn: boolean, dummyInput: DummyInput): void {
        const wrapper = this._getCurrent();

        if (wrapper) {
            wrapper.manager.getHandler(isIn)?.(dummyInput);
        }
    }

    private _onFocusIn = (dummyInput: DummyInput): void => {
        this._onFocus(true, dummyInput);
    };

    private _onFocusOut = (dummyInput: DummyInput): void => {
        this._onFocus(false, dummyInput);
    };

    /**
     * Prepares to move focus out of the given element by focusing
     * one of the dummy inputs and setting the `shouldMoveOut` flag
     * @param backwards focus moving to an element behind the given element
     */
    moveOutWithDefaultAction = (backwards: boolean): void => {
        const first = this.firstDummy;
        const last = this.lastDummy;

        if (first?.input && last?.input) {
            if (backwards) {
                first.shouldMoveOut = true;
                first.input.tabIndex = 0;
                first.input.focus();
            } else {
                last.shouldMoveOut = true;
                last.input.tabIndex = 0;
                last.input.focus();
            }
        }
    };

    setTabbable = (manager: DummyInputManager, tabbable: boolean) => {
        for (const w of this._wrappers) {
            if (w.manager === manager) {
                w.tabbable = tabbable;
                break;
            }
        }

        const wrapper = this._getCurrent();

        if (wrapper) {
            const tabIndex = wrapper.tabbable ? 0 : -1;

            let input = this.firstDummy?.input;

            if (input) {
                input.tabIndex = tabIndex;
            }

            input = this.lastDummy?.input;

            if (input) {
                input.tabIndex = tabIndex;
            }
        }
    };

    private _getCurrent(): DummyInputWrapper | undefined {
        this._wrappers.sort((a, b) => {
            if (a.tabbable !== b.tabbable) {
                return a.tabbable ? -1 : 1;
            }

            return a.priority - b.priority;
        });

        return this._wrappers[0];
    }

    /**
     * Adds dummy inputs as the first and last child of the given element
     * Called each time the children under the element is mutated
     */
    private _addDummyInputs() {
        if (this._addTimer) {
            return;
        }

        this._addTimer = this._getWindow().setTimeout(() => {
            delete this._addTimer;

            const element = this._element?.get();
            const dif = this.firstDummy?.input;
            const dil = this.lastDummy?.input;

            if (!element || !dif || !dil) {
                return;
            }

            if (element.lastElementChild !== dil) {
                element.appendChild(dil);
            }

            const firstElementChild = element.firstElementChild;

            if (firstElementChild && firstElementChild !== dif) {
                element.insertBefore(dif, firstElementChild);
            }
        }, 0);
    }

    /**
     * Creates a mutation observer to ensure that on DOM changes, the dummy inputs
     * stay as the first and last child elements
     */
    private _observeMutations(): void {
        if (this._unobserve) {
            return;
        }

        const observer = new MutationObserver(() => {
            if (this._unobserve) {
                this._addDummyInputs();
            }
        });

        const element = this._element?.get();

        if (element) {
            observer.observe(element, { childList: true });

            this._unobserve = () => {
                observer.disconnect();
            };
        }
    }
}

export function getLastChild(container: HTMLElement): HTMLElement | null {
    let lastChild: HTMLElement | null = null;

    for (let i = container.lastElementChild; i; i = i.lastElementChild) {
        lastChild = i as HTMLElement;
    }

    return lastChild;
}

export function triggerEvent<D>(
    target: HTMLElement | EventTarget,
    name: string,
    details: D
): boolean {
    const event = document.createEvent(
        "HTMLEvents"
    ) as Types.TabsterEventWithDetails<D>;

    event.initEvent(name, true, true);

    event.details = details;

    target.dispatchEvent(event);

    return !event.defaultPrevented;
}
