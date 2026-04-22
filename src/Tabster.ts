/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FocusableAPI } from "./Focusable.js";
import { FocusedElementState } from "./State/FocusedElement.js";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance.js";
import { KeyboardNavigationState } from "./State/KeyboardNavigation.js";
import { observeMutations } from "./MutationEvent.js";
import { RootAPI, type WindowWithTabsterInstance } from "./Root.js";
import type * as Types from "./Types.js";
import { TABSTER_ATTRIBUTE_NAME } from "./Consts.js";
import { UncontrolledAPI } from "./Uncontrolled.js";
import {
    cleanupFakeWeakRefs,
    clearElementCache,
    createElementTreeWalker,
    createWeakMap,
    disposeInstanceContext,
    DummyInputObserver,
    getDummyInputContainer,
    startFakeWeakRefsCleanup,
    stopFakeWeakRefsCleanupAndClearStorage,
} from "./Utils.js";
import { dom, setDOMAPI } from "./DOMAPI.js";
import * as shadowDOMAPI from "./Shadowdomize/index.js";

export { getDummyInputContainer };

class Tabster implements Types.Tabster {
    keyboardNavigation: Types.KeyboardNavigationState;
    focusedElement: Types.FocusedElementState;
    focusable: Types.FocusableAPI;
    root: Types.RootAPI;
    uncontrolled: Types.UncontrolledAPI;
    core: Types.TabsterCore;

    constructor(tabster: Types.TabsterCore) {
        this.keyboardNavigation = tabster.keyboardNavigation;
        this.focusedElement = tabster.focusedElement;
        this.focusable = tabster.focusable;
        this.root = tabster.root;
        this.uncontrolled = tabster.uncontrolled;
        this.core = tabster;
    }
}

/**
 * Extends Window to include an internal Tabster instance.
 */
class TabsterCore implements Types.TabsterCore {
    private _storage: WeakMap<HTMLElement, Types.TabsterElementStorage>;
    private _unobserve: (() => void) | undefined;
    private _win: WindowWithTabsterInstance | undefined;
    private _forgetMemorizedTimer: number | undefined;
    private _forgetMemorizedElements: HTMLElement[] = [];
    private _wrappers: Set<Tabster> = new Set<Tabster>();
    private _initTimer: number | undefined;
    private _initQueue: (() => void)[] = [];

    _version: string = __VERSION__;
    _noop = false;
    controlTab: boolean;
    rootDummyInputs: boolean;

    // Core APIs
    keyboardNavigation: Types.KeyboardNavigationState;
    focusedElement: Types.FocusedElementState;
    focusable: Types.FocusableAPI;
    root: Types.RootAPI;
    uncontrolled: Types.UncontrolledAPI;
    internal: Types.InternalAPI;
    _dummyObserver: Types.DummyInputObserver;

    // Extended APIs
    groupper?: Types.GroupperAPI;
    mover?: Types.MoverAPI;
    outline?: Types.OutlineAPI;
    deloser?: Types.DeloserAPI;
    modalizer?: Types.ModalizerAPI;
    observedElement?: Types.ObservedElementAPI;
    crossOrigin?: Types.CrossOriginAPI;
    restorer?: Types.RestorerAPI;
    getParent: (el: Node) => Node | null;

    constructor(win: Window, props?: Types.TabsterCoreProps) {
        this._storage = createWeakMap(win);
        this._win = win;

        const getWindow = this.getWindow;

        if (props?.DOMAPI) {
            setDOMAPI({ ...props.DOMAPI });
        }

        this.keyboardNavigation = new KeyboardNavigationState(getWindow);
        this.focusedElement = new FocusedElementState(this, getWindow);
        this.focusable = new FocusableAPI(this);
        this.root = new RootAPI(this, props?.autoRoot);
        this.uncontrolled = new UncontrolledAPI(
            // TODO: Remove checkUncontrolledTrappingFocus in the next major version.
            props?.checkUncontrolledCompletely ||
                props?.checkUncontrolledTrappingFocus
        );
        this.controlTab = props?.controlTab ?? true;
        this.rootDummyInputs = !!props?.rootDummyInputs;

        this._dummyObserver = new DummyInputObserver(getWindow);

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

        startFakeWeakRefsCleanup(getWindow);

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

        const win = this._win;

        win?.clearTimeout(this._initTimer);
        delete this._initTimer;
        this._initQueue = [];

        this._forgetMemorizedElements = [];

        if (win && this._forgetMemorizedTimer) {
            win.clearTimeout(this._forgetMemorizedTimer);
            delete this._forgetMemorizedTimer;
        }

        this.outline?.dispose();
        this.crossOrigin?.dispose();
        this.deloser?.dispose();
        this.groupper?.dispose();
        this.mover?.dispose();
        this.modalizer?.dispose();
        this.observedElement?.dispose();
        this.restorer?.dispose();

        this.keyboardNavigation.dispose();
        this.focusable.dispose();
        this.focusedElement.dispose();
        this.root.dispose();

        this._dummyObserver.dispose();

        stopFakeWeakRefsCleanupAndClearStorage(this.getWindow);
        clearElementCache(this.getWindow);

        this._storage = new WeakMap();
        this._wrappers.clear();

        if (win) {
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

        if (this._forgetMemorizedTimer) {
            return;
        }

        this._forgetMemorizedTimer = this._win.setTimeout(() => {
            delete this._forgetMemorizedTimer;

            for (
                let el: HTMLElement | undefined =
                    this._forgetMemorizedElements.shift();
                el;
                el = this._forgetMemorizedElements.shift()
            ) {
                clearElementCache(this.getWindow, el);
                FocusedElementState.forgetMemorized(this.focusedElement, el);
            }
        }, 0);

        cleanupFakeWeakRefs(this.getWindow, true);
    }

    queueInit(callback: () => void): void {
        if (!this._win) {
            return;
        }

        this._initQueue.push(callback);

        if (!this._initTimer) {
            this._initTimer = this._win?.setTimeout(() => {
                delete this._initTimer;
                this.drainInitQueue();
            }, 0);
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
 */
export function createTabster(
    win: Window,
    props?: Types.TabsterCoreProps
): Types.Tabster {
    let tabster = getCurrentTabster(win as WindowWithTabsterInstance);

    if (tabster) {
        return tabster.createTabster(false, props);
    }

    tabster = new TabsterCore(win, props);

    (win as WindowWithTabsterInstance).__tabsterInstance = tabster;

    return tabster.createTabster();
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
