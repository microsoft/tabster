/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    _forgetMemorized,
    createFocusedElementState,
} from "./State/FocusedElement.js";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance.js";
import { createKeyboardNavigationState } from "./State/KeyboardNavigation.js";
import { observeMutations } from "./MutationEvent.js";
import { RootAPI, type WindowWithTabsterInstance } from "./Root.js";
import type * as Types from "./Types.js";
import { TABSTER_ATTRIBUTE_NAME } from "./Consts.js";
import {
    clearElementCache,
    clearTimer,
    createElementTreeWalker,
    createTimer,
    disposeInstanceContext,
    isTimerActive,
    setTimer,
    type Timer,
} from "./Utils.js";
import { dom, setDOMAPI } from "./DOMAPI.js";
import * as shadowDOMAPI from "./Shadowdomize/index.js";

class Tabster implements Types.Tabster {
    declare keyboardNavigation: Types.KeyboardNavigationState;
    declare focusedElement: Types.FocusedElementState;
    declare root: Types.RootAPI;
    declare core: Types.TabsterCore;

    constructor(tabster: Types.TabsterCore) {
        this.keyboardNavigation = tabster.keyboardNavigation;
        this.focusedElement = tabster.focusedElement;
        this.root = tabster.root;
        this.core = tabster;
    }
}

/**
 * Extends Window to include an internal Tabster instance.
 */
class TabsterCore implements Types.TabsterCore {
    // `declare` on typed fields suppresses the runtime field-initializer
    // emit (target ES2022 compiles plain `field: T;` to `this.x = void 0`,
    // which the constructor immediately overwrites). Initializer-bearing
    // fields below stay as plain class-field syntax — that's where the
    // initial value actually comes from.
    declare private _storage: WeakMap<HTMLElement, Types.TabsterElementStorage>;
    declare private _unobserve: (() => void) | undefined;
    declare private _win: WindowWithTabsterInstance | undefined;
    declare private _forgetMemorizedTimer: Timer;
    private _forgetMemorizedElements: HTMLElement[] = [];
    private _wrappers: Set<Tabster> = new Set<Tabster>();
    declare private _initTimer: Timer;
    private _initQueue: (() => void)[] = [];

    _version: string = __VERSION__;
    _noop = false;
    declare controlTab: boolean;
    declare rootDummyInputs: boolean;
    // Variance gap: per-key handler types are contravariant in their
    // parameters, so a fully-typed Map<K, TabsterAttrHandler<K>> can't unify
    // them. Cast a plain Map to the typed view; the override on `set` keeps
    // registration type-safe per key, while `get` falls back to the Map's
    // value type (the type-erased shape).
    attrHandlers = new Map() as Types.TabsterAttrHandlerRegistry;

    /**
     * Disposable extended APIs register themselves here in their `getX`
     * factories; `dispose()` iterates this set instead of hard-coding each
     * `deloser?.dispose()` call.
     */
    disposers = new Set<Types.Disposable>();

    // Core APIs
    declare keyboardNavigation: Types.KeyboardNavigationState;
    declare focusedElement: Types.FocusedElementState;
    declare root: Types.RootAPI;
    declare internal: Types.InternalAPI;
    declare checkUncontrolledCompletely: Types.TabsterCoreProps["checkUncontrolledCompletely"];

    // Extended APIs slots (groupper / mover / modalizer / outline / deloser /
    // observedElement / crossOrigin / restorer / _dummyObserver) are declared
    // on Types.TabsterCore as optional fields but intentionally NOT redeclared
    // here. We rely on `undefined`-on-read; the optional property still
    // type-checks because Types.TabsterCore declares them.

    declare getParent: (el: Node) => Node | null;

    constructor(win: Window, props?: Types.TabsterCoreProps) {
        this._storage = new WeakMap();
        this._win = win;

        const getWindow = this.getWindow;

        this._forgetMemorizedTimer = createTimer();
        this._initTimer = createTimer();

        if (props?.DOMAPI) {
            setDOMAPI({ ...props.DOMAPI });
        }

        this.keyboardNavigation = createKeyboardNavigationState(getWindow);
        this.focusedElement = createFocusedElementState(this, getWindow);
        this.root = new RootAPI(this, props?.autoRoot);
        this.checkUncontrolledCompletely = props?.checkUncontrolledCompletely;
        this.controlTab = !!props?.controlTab;
        this.rootDummyInputs = !!props?.rootDummyInputs;

        this.getParent = props?.getParent ?? dom.getParentNode;

        this.internal = {
            stopObserver: (): void => {
                if (this._unobserve) {
                    this._unobserve();
                    delete this._unobserve;
                }
            },

            resumeObserver: (syncState: boolean): void => {
                if (!this._unobserve) {
                    const doc = getWindow().document;
                    this._unobserve = observeMutations(
                        doc,
                        this,
                        updateTabsterByAttribute,
                        syncState
                    );
                }
            },
        };

        // Gives a tick to the host app to initialize other tabster
        // APIs before tabster starts observing attributes.
        this.queueInit(() => {
            this.internal.resumeObserver(true);
        });
    }

    /**
     * Merges external props with the current props. Not all
     * props can/should be mergeable, so let's add more as we move on.
     * @param props Tabster props
     */
    private _mergeProps(props?: Types.TabsterCoreProps) {
        if (!props) {
            return;
        }

        this.getParent = props.getParent ?? this.getParent;
    }

    createTabster(
        noRefCount?: boolean,
        props?: Types.TabsterCoreProps
    ): Types.Tabster {
        const wrapper = new Tabster(this);

        if (!noRefCount) {
            this._wrappers.add(wrapper);
        }

        this._mergeProps(props);

        return wrapper;
    }

    disposeTabster(wrapper: Types.Tabster, allInstances?: boolean) {
        if (allInstances) {
            this._wrappers.clear();
        } else {
            this._wrappers.delete(wrapper);
        }

        if (this._wrappers.size === 0) {
            this.dispose();
        }
    }

    dispose(): void {
        this.internal.stopObserver();

        this._initQueue = [];
        this._forgetMemorizedElements = [];

        // Extended APIs register themselves in `disposers` from their `getX`
        // factories; iterate and clear so adding a new extended API doesn't
        // require touching this method.
        for (const d of this.disposers) {
            d.dispose();
        }
        this.disposers.clear();

        this.keyboardNavigation.dispose();
        this.focusedElement.dispose();
        this.root.dispose();

        // Drop handler closures — they capture the API instances we just
        // disposed, and any post-dispose updateTabsterByAttribute call would
        // otherwise dispatch to those zombies.
        this.attrHandlers.clear();

        clearElementCache(this.getWindow);

        this._storage = new WeakMap();
        this._wrappers.clear();

        const win = this._win;
        if (win) {
            clearTimer(this._initTimer, win);
            clearTimer(this._forgetMemorizedTimer, win);
            disposeInstanceContext(win);
            delete win.__tabsterInstance;
            delete this._win;
        }
    }

    storageEntry(
        element: HTMLElement,
        addremove?: boolean
    ): Types.TabsterElementStorageEntry | undefined {
        const storage = this._storage;
        let entry = storage.get(element);

        if (entry) {
            if (addremove === false && Object.keys(entry).length === 0) {
                storage.delete(element);
            }
        } else if (addremove === true) {
            entry = {};
            storage.set(element, entry);
        }

        return entry;
    }

    getWindow = () => {
        if (!this._win) {
            throw new Error("Using disposed Tabster.");
        }

        return this._win;
    };

    forceCleanup(): void {
        if (!this._win) {
            return;
        }

        this._forgetMemorizedElements.push(this._win.document.body);

        if (isTimerActive(this._forgetMemorizedTimer)) {
            return;
        }

        setTimer(
            this._forgetMemorizedTimer,
            this._win,
            () => {
                for (
                    let el: HTMLElement | undefined =
                        this._forgetMemorizedElements.shift();
                    el;
                    el = this._forgetMemorizedElements.shift()
                ) {
                    clearElementCache(this.getWindow, el);
                    _forgetMemorized(this.focusedElement, el);
                }
            },
            0
        );
    }

    queueInit(callback: () => void): void {
        if (!this._win) {
            return;
        }

        this._initQueue.push(callback);

        if (!isTimerActive(this._initTimer)) {
            setTimer(
                this._initTimer,
                this._win,
                () => {
                    this.drainInitQueue();
                },
                0
            );
        }
    }

    drainInitQueue(): void {
        if (!this._win) {
            return;
        }

        const queue = this._initQueue;
        // Resetting the queue before calling the callbacks to avoid recursion.
        this._initQueue = [];
        queue.forEach((callback) => callback());
    }
}

export function forceCleanup(tabster: Types.Tabster): void {
    // The only legit case for calling this method is when you've completely removed
    // the application DOM and not going to add the new one for a while.
    const tabsterCore = tabster.core;
    tabsterCore.forceCleanup();
}

/**
 * Creates an instance of Tabster, returns the current window instance if it already exists.
 *
 * `controlTab` and `rootDummyInputs` both default to `false` — the slim
 * core. Tab interception, root-level dummy inputs, and the
 * `DummyInputManager` phantom helpers only enter the bundle when the
 * consumer explicitly calls `getRootDummyInputs(tabster)`. Apps that
 * want the previous "Tab just works" behaviour should pair
 * `createTabster(win)` with `getRootDummyInputs(tabster)`.
 */
export function createTabster(
    win: Window,
    props?: Types.TabsterCoreProps
): Types.Tabster {
    let tabster = getCurrentTabster(win as WindowWithTabsterInstance);

    let wrapper: Types.Tabster;
    if (tabster) {
        wrapper = tabster.createTabster(false, props);
    } else {
        tabster = new TabsterCore(win, props);
        (win as WindowWithTabsterInstance).__tabsterInstance = tabster;
        wrapper = tabster.createTabster();
    }

    return wrapper;
}

/**
 * Returns an instance of Tabster if it was created before or null.
 */
export function getTabster(win: Window): Types.Tabster | null {
    const tabster = getCurrentTabster(win as WindowWithTabsterInstance);

    return tabster ? tabster.createTabster(true) : null;
}

export function getShadowDOMAPI(): Types.DOMAPI {
    return shadowDOMAPI;
}

export function getInternal(tabster: Types.Tabster): Types.InternalAPI {
    const tabsterCore = tabster.core;
    return tabsterCore.internal;
}

export function disposeTabster(
    tabster: Types.Tabster,
    allInstances?: boolean
): void {
    tabster.core.disposeTabster(tabster, allInstances);
}

/**
 * Returns an instance of Tabster if it already exists on the window .
 * @param win window instance that could contain an Tabster instance.
 */
export function getCurrentTabster(win: Window): Types.TabsterCore | undefined {
    return (win as WindowWithTabsterInstance).__tabsterInstance;
}

/**
 * Allows to make Tabster non operational. Intended for performance debugging (and other
 * kinds of debugging), you can switch Tabster off without changing the application code
 * that consumes it.
 * @param tabster a reference created by createTabster().
 * @param noop true if you want to make Tabster noop, false if you want to turn it back.
 */
export function makeNoOp(tabster: Types.Tabster, noop: boolean): void {
    const core = tabster.core;

    if (core._noop !== noop) {
        core._noop = noop;

        const processNode = (node: Node): number => {
            const element = node as HTMLElement;

            if (!element.getAttribute) {
                return NodeFilter.FILTER_SKIP;
            }

            if (
                getTabsterOnElement(core, element) ||
                element.hasAttribute(TABSTER_ATTRIBUTE_NAME)
            ) {
                updateTabsterByAttribute(core, element);
            }

            return NodeFilter.FILTER_SKIP;
        };

        const doc = core.getWindow().document;
        const body = doc.body;

        processNode(body);

        const walker = createElementTreeWalker(doc, body, processNode);

        if (walker) {
            while (walker.nextNode()) {
                /* Iterating for the sake of calling processNode() callback. */
            }
        }
    }
}

export function isNoOp(tabster: Types.TabsterCore): boolean {
    return (tabster as TabsterCore)._noop;
}

export { getCrossOrigin } from "./get/getCrossOrigin.js";
export { getDeloser } from "./get/getDeloser.js";
export { getGroupper } from "./get/getGroupper.js";
export { getModalizer } from "./get/getModalizer.js";
export { getMover } from "./get/getMover.js";
export { getObservedElement } from "./get/getObservedElement.js";
export { getOutline } from "./get/getOutline.js";
export { getRestorer } from "./get/getRestorer.js";
export { getRootDummyInputs } from "./get/getRootDummyInputs.js";
