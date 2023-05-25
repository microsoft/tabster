/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

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

export interface HTMLElementWithDummyContainer extends HTMLElement {
    __tabsterDummyContainer?: WeakHTMLElement;
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

const _updateDummyInputsTimeout = 100;

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
    protected _tabster: Types.TabsterCore;
    protected _element: WeakHTMLElement<HTMLElement, D>;
    protected _props: P;

    readonly id: string;

    constructor(tabster: Types.TabsterCore, element: HTMLElement, props: P) {
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

export type DummyInputFocusCallback = (
    dummyInput: DummyInput,
    isBackward: boolean,
    relatedTarget: HTMLElement | null
) => void;

/**
 * Dummy HTML elements that are used as focus sentinels for the DOM enclosed within them
 */
export class DummyInput {
    private _isPhantom: DummyInputProps["isPhantom"];
    private _disposeTimer: number | undefined;
    private _clearDisposeTimeout: (() => void) | undefined;

    input: HTMLElement | undefined;
    useDefaultAction?: boolean;
    isFirst: DummyInputProps["isFirst"];
    isOutside: boolean;
    /** Called when the input is focused */
    onFocusIn?: DummyInputFocusCallback;
    /** Called when the input is blurred */
    onFocusOut?: DummyInputFocusCallback;

    constructor(
        getWindow: Types.GetWindow,
        isOutside: boolean,
        props: DummyInputProps,
        element?: WeakHTMLElement
    ) {
        const win = getWindow();
        const input = win.document.createElement("i");

        input.tabIndex = 0;
        input.setAttribute("role", "none");

        input.setAttribute(Types.TabsterDummyInputAttributeName, "");
        input.setAttribute("aria-hidden", "true");

        const style = input.style;
        style.position = "fixed";
        style.width = style.height = "1px";
        style.opacity = "0.001";
        style.zIndex = "-1";
        style.setProperty("content-visibility", "hidden");

        makeFocusIgnored(input);

        this.input = input;
        this.isFirst = props.isFirst;
        this.isOutside = isOutside;
        this._isPhantom = props.isPhantom ?? false;

        input.addEventListener("focusin", this._focusIn);
        input.addEventListener("focusout", this._focusOut);

        (input as HTMLElementWithDummyContainer).__tabsterDummyContainer =
            element;

        if (this._isPhantom) {
            this._disposeTimer = win.setTimeout(() => {
                delete this._disposeTimer;
                this.dispose();
            }, 0);

            this._clearDisposeTimeout = () => {
                if (this._disposeTimer) {
                    win.clearTimeout(this._disposeTimer);
                    delete this._disposeTimer;
                }

                delete this._clearDisposeTimeout;
            };
        }
    }

    dispose(): void {
        if (this._clearDisposeTimeout) {
            this._clearDisposeTimeout();
        }

        const input = this.input;

        if (!input) {
            return;
        }

        delete this.onFocusIn;
        delete this.onFocusOut;
        delete this.input;

        input.removeEventListener("focusin", this._focusIn);
        input.removeEventListener("focusout", this._focusOut);

        delete (input as HTMLElementWithDummyContainer).__tabsterDummyContainer;

        input.parentElement?.removeChild(input);
    }

    setTopLeft(top: number, left: number): void {
        const style = this.input?.style;

        if (style) {
            style.top = `${top}px`;
            style.left = `${left}px`;
        }
    }

    private _isBackward(
        isIn: boolean,
        current: HTMLElement,
        previous: HTMLElement | null
    ): boolean {
        return isIn && !previous
            ? !this.isFirst
            : !!(
                  previous &&
                  current.compareDocumentPosition(previous) &
                      Node.DOCUMENT_POSITION_FOLLOWING
              );
    }

    private _focusIn = (e: FocusEvent): void => {
        const input = this.input;

        if (this.onFocusIn && input) {
            const relatedTarget =
                DummyInputManager.getLastPhantomFrom() ||
                (e.relatedTarget as HTMLElement | null);

            this.onFocusIn(
                this,
                this._isBackward(true, input, relatedTarget),
                relatedTarget
            );
        }
    };

    private _focusOut = (e: FocusEvent): void => {
        this.useDefaultAction = false;

        const input = this.input;

        if (this.onFocusOut && input) {
            const relatedTarget = e.relatedTarget as HTMLElement | null;

            this.onFocusOut(
                this,
                this._isBackward(false, input, relatedTarget),
                relatedTarget
            );
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
    private _onFocusIn?: DummyInputFocusCallback;
    private _onFocusOut?: DummyInputFocusCallback;
    protected _element: WeakHTMLElement;
    private static _lastPhantomFrom: HTMLElement | undefined;

    moveOut: DummyInputManagerCore["moveOut"];
    moveOutWithDefaultAction: DummyInputManagerCore["moveOutWithDefaultAction"];

    constructor(
        tabster: Types.TabsterCore,
        element: WeakHTMLElement,
        priority: number,
        sys: Types.SysProps | undefined,
        outsideByDefault?: boolean,
        callForDefaultAction?: boolean
    ) {
        this._element = element;

        this._instance = new DummyInputManagerCore(
            tabster,
            element,
            this,
            priority,
            sys,
            outsideByDefault,
            callForDefaultAction
        );

        this.moveOut = (backwards: boolean) => {
            this._instance?.moveOut(backwards);
        };

        this.moveOutWithDefaultAction = (backwards: boolean) => {
            this._instance?.moveOutWithDefaultAction(backwards);
        };
    }

    protected _setHandlers(
        onFocusIn?: DummyInputFocusCallback,
        onFocusOut?: DummyInputFocusCallback
    ): void {
        this._onFocusIn = onFocusIn;
        this._onFocusOut = onFocusOut;
    }

    getHandler(isIn: boolean): DummyInputFocusCallback | undefined {
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

    static getLastPhantomFrom(): HTMLElement | undefined {
        const ret = DummyInputManager._lastPhantomFrom;
        delete DummyInputManager._lastPhantomFrom;
        return ret;
    }

    static moveWithPhantomDummy(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        moveOutside: boolean,
        isBackward: boolean
    ): void {
        const dummy: DummyInput = new DummyInput(tabster.getWindow, true, {
            isPhantom: true,
            isFirst: true,
        });

        const input = dummy.input;

        if (input) {
            const parent = element.parentElement;

            if (parent) {
                let insertBefore = (
                    (moveOutside && !isBackward) || (!moveOutside && isBackward)
                        ? element.nextElementSibling
                        : element
                ) as HTMLElementWithDummyContainer | null;

                if (insertBefore) {
                    if (isBackward) {
                        const beforeBefore =
                            insertBefore.previousElementSibling as HTMLElementWithDummyContainer | null;

                        if (
                            beforeBefore &&
                            beforeBefore.__tabsterDummyContainer
                        ) {
                            insertBefore = beforeBefore;
                        }
                    } else if (insertBefore.__tabsterDummyContainer) {
                        insertBefore =
                            insertBefore.nextElementSibling as HTMLElementWithDummyContainer | null;
                    }
                }

                parent.insertBefore(input, insertBefore);

                DummyInputManager._lastPhantomFrom = element;

                tabster.getWindow().setTimeout(() => {
                    delete DummyInputManager._lastPhantomFrom;
                }, 0);

                nativeFocus(input);
            }
        }
    }
}

interface DummyInputWrapper {
    manager: DummyInputManager;
    priority: number;
    tabbable: boolean;
}

function setDummyInputDebugValue(
    dummy: DummyInput,
    wrappers: DummyInputWrapper[]
): void {
    const what: Record<number, string> = {
        1: "Root",
        2: "Modalizer",
        3: "Mover",
        4: "Groupper",
    };

    dummy.input?.setAttribute(
        Types.TabsterDummyInputAttributeName,
        [
            `isFirst=${dummy.isFirst}`,
            `isOutside=${dummy.isOutside}`,
            ...wrappers.map(
                (w) => `(${what[w.priority]}, tabbable=${w.tabbable})`
            ),
        ].join(", ")
    );
}

export class DummyInputObserver implements Types.DummyInputObserver {
    private _win?: GetWindow;
    private _updateQueue: Set<
        (
            scrollTopLeftCache: Map<
                HTMLElement,
                { scrollTop: number; scrollLeft: number } | null
            >
        ) => () => void
    > = new Set();
    private _updateTimer?: number;
    private _lastUpdateQueueTime = 0;
    private _changedParents: WeakSet<HTMLElement> = new WeakSet();
    private _updateDummyInputsTimer?: number;
    private _dummies: Map<HTMLElement, () => void> = new Map();
    domChanged?(parent: HTMLElement): void;

    constructor(win: GetWindow) {
        this._win = win;
    }

    add(dummy: HTMLElement, callback: () => void): void {
        this._dummies.set(dummy, callback);
        this.domChanged = this._domChanged;
    }

    remove(dummy: HTMLElement): void {
        const dummyInputElements = this._dummies;
        dummyInputElements.delete(dummy);

        if (dummyInputElements.size === 0) {
            delete this.domChanged;
        }
    }

    dispose(): void {
        const win = this._win?.();

        if (this._updateTimer) {
            win?.clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }

        if (this._updateDummyInputsTimer) {
            win?.clearTimeout(this._updateDummyInputsTimer);
            delete this._updateDummyInputsTimer;
        }

        this._changedParents = new WeakSet();
        this._dummies.clear();

        delete this._win;
    }

    private _domChanged = (parent: HTMLElement): void => {
        if (this._changedParents.has(parent)) {
            return;
        }

        this._changedParents.add(parent);

        if (this._updateDummyInputsTimer) {
            return;
        }

        this._updateDummyInputsTimer = this._win?.().setTimeout(() => {
            delete this._updateDummyInputsTimer;

            for (const [dummy, callback] of this._dummies) {
                const dummyParent = dummy.parentElement;

                if (!dummyParent || this._changedParents.has(dummyParent)) {
                    callback();
                }
            }

            this._changedParents = new WeakSet();
        }, _updateDummyInputsTimeout);
    };

    updatePositions(
        compute: (
            scrollTopLeftCache: Map<
                HTMLElement,
                { scrollTop: number; scrollLeft: number } | null
            >
        ) => () => void
    ): void {
        if (!this._win) {
            // As this is a public method, we make sure that it has no effect when
            // called after dispose().
            return;
        }

        this._updateQueue.add(compute);

        this._lastUpdateQueueTime = Date.now();

        this._scheduledUpdatePositions();
    }

    private _scheduledUpdatePositions(): void {
        if (this._updateTimer) {
            return;
        }

        this._updateTimer = this._win?.().setTimeout(() => {
            delete this._updateTimer;

            // updatePositions() might be called quite a lot during the scrolling.
            // So, instead of clearing the timeout and scheduling a new one, we
            // check if enough time has passed since the last updatePositions() call
            // and only schedule a new one if not.
            // At maximum, we will update dummy inputs positions
            // _updateDummyInputsTimeout * 2 after the last updatePositions() call.
            if (
                this._lastUpdateQueueTime + _updateDummyInputsTimeout <=
                Date.now()
            ) {
                // A cache for current bulk of updates to reduce getComputedStyle() calls.
                const scrollTopLeftCache = new Map<
                    HTMLElement,
                    { scrollTop: number; scrollLeft: number } | null
                >();

                const setTopLeftCallbacks: (() => void)[] = [];

                for (const compute of this._updateQueue) {
                    setTopLeftCallbacks.push(compute(scrollTopLeftCache));
                }

                this._updateQueue.clear();

                // We're splitting the computation of offsets and setting them to avoid extra
                // reflows.
                for (const setTopLeft of setTopLeftCallbacks) {
                    setTopLeft();
                }

                // Explicitly clear to not hold references till the next garbage collection.
                scrollTopLeftCache.clear();
            } else {
                this._scheduledUpdatePositions();
            }
        }, _updateDummyInputsTimeout);
    }
}

/**
 * Parent class that encapsulates the behaviour of dummy inputs (focus sentinels)
 */
class DummyInputManagerCore {
    private _tabster: Types.TabsterCore;
    private _addTimer: number | undefined;
    private _getWindow: Types.GetWindow;
    private _wrappers: DummyInputWrapper[] = [];
    private _element: WeakHTMLElement | undefined;
    private _isOutside = false;
    private _firstDummy: DummyInput | undefined;
    private _lastDummy: DummyInput | undefined;
    private _transformElements: Set<HTMLElement> = new Set();
    private _callForDefaultAction: boolean | undefined;

    constructor(
        tabster: Types.TabsterCore,
        element: WeakHTMLElement,
        manager: DummyInputManager,
        priority: number,
        sys: Types.SysProps | undefined,
        outsideByDefault?: boolean,
        callForDefaultAction?: boolean
    ) {
        const el = element.get() as HTMLElementWithDummyInputs;

        if (!el) {
            throw new Error("No element");
        }

        this._tabster = tabster;
        this._getWindow = tabster.getWindow;
        this._callForDefaultAction = callForDefaultAction;

        const instance = el.__tabsterDummy;

        (instance || this)._wrappers.push({
            manager,
            priority,
            tabbable: true,
        });

        if (instance) {
            if (__DEV__) {
                this._firstDummy &&
                    setDummyInputDebugValue(
                        this._firstDummy,
                        instance._wrappers
                    );
                this._lastDummy &&
                    setDummyInputDebugValue(
                        this._lastDummy,
                        instance._wrappers
                    );
            }

            return instance;
        }

        el.__tabsterDummy = this;

        // Some elements allow only specific types of direct descendants and we need to
        // put our dummy inputs inside or outside of the element accordingly.
        const forcedDummyPosition = sys?.dummyInputsPosition;
        const tagName = el.tagName;
        this._isOutside = !forcedDummyPosition
            ? (outsideByDefault ||
                  tagName === "UL" ||
                  tagName === "OL" ||
                  tagName === "TABLE") &&
              !(tagName === "LI" || tagName === "TD" || tagName === "TH")
            : forcedDummyPosition === Types.SysDummyInputsPositions.Outside;

        this._firstDummy = new DummyInput(
            this._getWindow,
            this._isOutside,
            {
                isFirst: true,
            },
            element
        );

        this._lastDummy = new DummyInput(
            this._getWindow,
            this._isOutside,
            {
                isFirst: false,
            },
            element
        );

        // We will be checking dummy input parents to see if their child list have changed.
        // So, it is enough to have just one of the inputs observed, because
        // both dummy inputs always have the same parent.
        const dummyElement = this._firstDummy.input;
        dummyElement &&
            tabster._dummyObserver.add(dummyElement, this._addDummyInputs);

        this._firstDummy.onFocusIn = this._onFocusIn;
        this._firstDummy.onFocusOut = this._onFocusOut;
        this._lastDummy.onFocusIn = this._onFocusIn;
        this._lastDummy.onFocusOut = this._onFocusOut;

        this._element = element;
        this._addDummyInputs();
    }

    dispose(manager: DummyInputManager, force?: boolean): void {
        const wrappers = (this._wrappers = this._wrappers.filter(
            (w) => w.manager !== manager && !force
        ));

        if (__DEV__) {
            this._firstDummy &&
                setDummyInputDebugValue(this._firstDummy, wrappers);
            this._lastDummy &&
                setDummyInputDebugValue(this._lastDummy, wrappers);
        }

        if (wrappers.length === 0) {
            delete (this._element?.get() as HTMLElementWithDummyInputs)
                .__tabsterDummy;

            for (const el of this._transformElements) {
                el.removeEventListener("scroll", this._addTransformOffsets);
            }
            this._transformElements.clear();

            const win = this._getWindow();

            if (this._addTimer) {
                win.clearTimeout(this._addTimer);
                delete this._addTimer;
            }

            const dummyElement = this._firstDummy?.input;
            dummyElement && this._tabster._dummyObserver.remove(dummyElement);

            this._firstDummy?.dispose();
            this._lastDummy?.dispose();
        }
    }

    private _onFocus(
        isIn: boolean,
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void {
        const wrapper = this._getCurrent();

        if (
            wrapper &&
            (!dummyInput.useDefaultAction || this._callForDefaultAction)
        ) {
            wrapper.manager.getHandler(isIn)?.(
                dummyInput,
                isBackward,
                relatedTarget
            );
        }
    }

    private _onFocusIn = (
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void => {
        this._onFocus(true, dummyInput, isBackward, relatedTarget);
    };

    private _onFocusOut = (
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void => {
        this._onFocus(false, dummyInput, isBackward, relatedTarget);
    };

    moveOut = (backwards: boolean): void => {
        const first = this._firstDummy;
        const last = this._lastDummy;

        if (first && last) {
            // For the sake of performance optimization, the dummy input
            // position in the DOM updates asynchronously from the DOM change.
            // Calling _ensurePosition() to make sure the position is correct.
            this._ensurePosition();

            const firstInput = first.input;
            const lastInput = last.input;
            const element = this._element?.get();

            if (firstInput && lastInput && element) {
                let toFocus: HTMLElement | undefined;

                if (backwards) {
                    firstInput.tabIndex = 0;
                    toFocus = firstInput;
                } else {
                    lastInput.tabIndex = 0;
                    toFocus = lastInput;
                }

                if (toFocus) {
                    nativeFocus(toFocus);
                }
            }
        }
    };

    /**
     * Prepares to move focus out of the given element by focusing
     * one of the dummy inputs and setting the `useDefaultAction` flag
     * @param backwards focus moving to an element behind the given element
     */
    moveOutWithDefaultAction = (backwards: boolean): void => {
        const first = this._firstDummy;
        const last = this._lastDummy;

        if (first && last) {
            // For the sake of performance optimization, the dummy input
            // position in the DOM updates asynchronously from the DOM change.
            // Calling _ensurePosition() to make sure the position is correct.
            this._ensurePosition();

            const firstInput = first.input;
            const lastInput = last.input;
            const element = this._element?.get();

            if (firstInput && lastInput && element) {
                let toFocus: HTMLElement | undefined;

                if (backwards) {
                    if (
                        !first.isOutside &&
                        this._tabster.focusable.isFocusable(
                            element,
                            true,
                            true,
                            true
                        )
                    ) {
                        toFocus = element;
                    } else {
                        first.useDefaultAction = true;
                        firstInput.tabIndex = 0;
                        toFocus = firstInput;
                    }
                } else {
                    last.useDefaultAction = true;
                    lastInput.tabIndex = 0;
                    toFocus = lastInput;
                }

                if (toFocus) {
                    nativeFocus(toFocus);
                }
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

            let input = this._firstDummy?.input;

            if (input) {
                input.tabIndex = tabIndex;
            }

            input = this._lastDummy?.input;

            if (input) {
                input.tabIndex = tabIndex;
            }
        }

        if (__DEV__) {
            this._firstDummy &&
                setDummyInputDebugValue(this._firstDummy, this._wrappers);
            this._lastDummy &&
                setDummyInputDebugValue(this._lastDummy, this._wrappers);
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
    private _addDummyInputs = () => {
        if (this._addTimer) {
            return;
        }

        this._addTimer = this._getWindow().setTimeout(() => {
            delete this._addTimer;

            this._ensurePosition();

            if (__DEV__) {
                this._firstDummy &&
                    setDummyInputDebugValue(this._firstDummy, this._wrappers);
                this._lastDummy &&
                    setDummyInputDebugValue(this._lastDummy, this._wrappers);
            }

            this._addTransformOffsets();
        }, 0);
    };

    private _ensurePosition(): void {
        const element = this._element?.get();
        const firstDummyInput = this._firstDummy?.input;
        const lastDummyInput = this._lastDummy?.input;

        if (!element || !firstDummyInput || !lastDummyInput) {
            return;
        }

        if (this._isOutside) {
            const elementParent = element.parentElement;

            if (elementParent) {
                const nextSibling = element.nextElementSibling;

                if (nextSibling !== lastDummyInput) {
                    elementParent.insertBefore(lastDummyInput, nextSibling);
                }

                if (element.previousElementSibling !== firstDummyInput) {
                    elementParent.insertBefore(firstDummyInput, element);
                }
            }
        } else {
            if (element.lastElementChild !== lastDummyInput) {
                element.appendChild(lastDummyInput);
            }

            const firstElementChild = element.firstElementChild;

            if (firstElementChild && firstElementChild !== firstDummyInput) {
                element.insertBefore(firstDummyInput, firstElementChild);
            }
        }
    }

    private _addTransformOffsets = (): void => {
        this._tabster._dummyObserver.updatePositions(
            this._computeTransformOffsets
        );
    };

    private _computeTransformOffsets = (
        scrollTopLeftCache: Map<
            HTMLElement,
            { scrollTop: number; scrollLeft: number } | null
        >
    ): (() => void) => {
        const from = this._firstDummy?.input || this._lastDummy?.input;
        const transformElements = this._transformElements;
        const newTransformElements: typeof transformElements = new Set();
        let scrollTop = 0;
        let scrollLeft = 0;

        const win = this._getWindow();

        for (
            let element: HTMLElement | undefined | null = from;
            element && element.nodeType === Node.ELEMENT_NODE;
            element = element.parentElement
        ) {
            let scrollTopLeft = scrollTopLeftCache.get(element);

            // getComputedStyle() and element.scrollLeft/Top() cause style recalculation,
            // so we cache the result across all elements in the current bulk.
            if (scrollTopLeft === undefined) {
                const transform = win.getComputedStyle(element).transform;

                if (transform && transform !== "none") {
                    scrollTopLeft = {
                        scrollTop: element.scrollTop,
                        scrollLeft: element.scrollLeft,
                    };
                }

                scrollTopLeftCache.set(element, scrollTopLeft || null);
            }

            if (scrollTopLeft) {
                newTransformElements.add(element);

                if (!transformElements.has(element)) {
                    element.addEventListener(
                        "scroll",
                        this._addTransformOffsets
                    );
                }

                scrollTop += scrollTopLeft.scrollTop;
                scrollLeft += scrollTopLeft.scrollLeft;
            }
        }

        for (const el of transformElements) {
            if (!newTransformElements.has(el)) {
                el.removeEventListener("scroll", this._addTransformOffsets);
            }
        }

        this._transformElements = newTransformElements;

        return () => {
            this._firstDummy?.setTopLeft(scrollTop, scrollLeft);
            this._lastDummy?.setTopLeft(scrollTop, scrollLeft);
        };
    };
}

export function getLastChild(container: HTMLElement): HTMLElement | undefined {
    let lastChild: HTMLElement | null = null;

    for (let i = container.lastElementChild; i; i = i.lastElementChild) {
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
            prev ? cur.previousElementSibling : cur.nextElementSibling
        ) as HTMLElement | null;
        cur = cur.parentElement;
    }

    return adjacent || undefined;
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

export function augmentAttribute(
    tabster: Types.TabsterCore,
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
