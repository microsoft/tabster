/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CrossOriginAPI } from "./CrossOrigin";
import { DeloserAPI } from "./Deloser";
import { FocusableAPI } from "./Focusable";
import { FocusedElementState } from "./State/FocusedElement";
import { GroupperAPI } from "./Groupper";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance";
import { KeyboardNavigationState } from "./State/KeyboardNavigation";
import { ModalizerAPI } from "./Modalizer";
import { MoverAPI } from "./Mover";
import { observeMutations } from "./MutationEvent";
import { ObservedElementAPI } from "./State/ObservedElement";
import { OutlineAPI } from "./Outline";
import { RootAPI, WindowWithTabsterInstance } from "./Root";
import * as Types from "./Types";
import { UncontrolledAPI } from "./Uncontrolled";
import {
    cleanupFakeWeakRefs,
    clearElementCache,
    createElementTreeWalker,
    createWeakMap,
    disposeInstanceContext,
    startFakeWeakRefsCleanup,
    stopFakeWeakRefsCleanupAndClearStorage,
} from "./Utils";

export { Types };

/**
 * Extends Window to include an internal Tabster instance.
 */
class Tabster implements Types.TabsterCore {
    private _storage: WeakMap<HTMLElement, Types.TabsterElementStorage>;
    private _unobserve: (() => void) | undefined;
    private _win: WindowWithTabsterInstance | undefined;
    private _forgetMemorizedTimer: number | undefined;
    private _forgetMemorizedElements: HTMLElement[] = [];

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

    // Extended APIs
    groupper?: Types.GroupperAPI;
    mover?: Types.MoverAPI;
    outline?: Types.OutlineAPI;
    deloser?: Types.DeloserAPI;
    modalizer?: Types.ModalizerAPI;
    observedElement?: Types.ObservedElementAPI;
    crossOrigin?: Types.CrossOriginAPI;

    constructor(win: Window, props?: Types.TabsterCoreProps) {
        this._storage = createWeakMap(win);
        this._win = win;

        const getWindow = this.getWindow;

        this.keyboardNavigation = new KeyboardNavigationState(getWindow);
        this.focusedElement = new FocusedElementState(this, getWindow);
        this.focusable = new FocusableAPI(this, getWindow);
        this.root = new RootAPI(this, props?.autoRoot);
        this.uncontrolled = new UncontrolledAPI();
        this.controlTab = props?.controlTab ?? true;
        this.rootDummyInputs = !!props?.rootDummyInputs;

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

        this.internal.resumeObserver(false);

        startFakeWeakRefsCleanup(getWindow);
    }

    dispose(): void {
        this.internal.stopObserver();

        const win = this._win;

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

        this.keyboardNavigation.dispose();
        this.focusable.dispose();
        this.focusedElement.dispose();
        this.root.dispose();

        stopFakeWeakRefsCleanupAndClearStorage(this.getWindow);
        clearElementCache(this.getWindow);

        this._storage = new WeakMap();

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

    static forceCleanup(tabster: Tabster): void {
        if (!tabster._win) {
            return;
        }

        tabster._forgetMemorizedElements.push(tabster._win.document.body);

        if (tabster._forgetMemorizedTimer) {
            return;
        }

        tabster._forgetMemorizedTimer = tabster._win.setTimeout(() => {
            delete tabster._forgetMemorizedTimer;

            for (
                let el: HTMLElement | undefined =
                    tabster._forgetMemorizedElements.shift();
                el;
                el = tabster._forgetMemorizedElements.shift()
            ) {
                clearElementCache(tabster.getWindow, el);
                FocusedElementState.forgetMemorized(tabster.focusedElement, el);
            }
        }, 0);

        cleanupFakeWeakRefs(tabster.getWindow, true);
    }
}

export function forceCleanup(tabster: Tabster): void {
    // The only legit case for calling this method is when you've completely removed
    // the application DOM and not going to add the new one for a while.
    Tabster.forceCleanup(tabster);
}

/**
 * Creates an instance of Tabster, returns the current window instance if it already exists.
 */
export function createTabster(
    win: Window,
    props?: Types.TabsterCoreProps
): Types.TabsterCore {
    const existingAh = getCurrentTabster(win as WindowWithTabsterInstance);

    if (existingAh) {
        if (__DEV__) {
            console.warn(
                "Attempted to create a duplicate Tabster instance on the window"
            );
        }

        return existingAh;
    }

    const tabster = new Tabster(win, props);
    (win as WindowWithTabsterInstance).__tabsterInstance = tabster;

    return tabster;
}

/**
 * Creates a new groupper instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getGroupper(tabster: Types.TabsterCore): Types.GroupperAPI {
    if (!tabster.groupper) {
        tabster.groupper = new GroupperAPI(tabster, tabster.getWindow);
    }

    return tabster.groupper;
}

/**
 * Creates a new mover instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getMover(tabster: Types.TabsterCore): Types.MoverAPI {
    if (!tabster.mover) {
        tabster.mover = new MoverAPI(tabster, tabster.getWindow);
    }

    return tabster.mover;
}

export function getOutline(tabster: Types.TabsterCore): Types.OutlineAPI {
    if (!tabster.outline) {
        tabster.outline = new OutlineAPI(tabster);
    }

    return tabster.outline;
}

/**
 * Creates a new new deloser instance or returns an existing one
 * @param tabster Tabster instance
 * @param props Deloser props
 */
export function getDeloser(
    tabster: Types.TabsterCore,
    props?: { autoDeloser: Types.DeloserProps }
): Types.DeloserAPI {
    if (!tabster.deloser) {
        tabster.deloser = new DeloserAPI(tabster, props);
    }

    return tabster.deloser;
}

/**
 * Creates a new modalizer instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getModalizer(tabster: Types.TabsterCore): Types.ModalizerAPI {
    if (!tabster.modalizer) {
        tabster.modalizer = new ModalizerAPI(tabster);
    }

    return tabster.modalizer;
}

export function getObservedElement(
    tabster: Types.TabsterCore
): Types.ObservedElementAPI {
    if (!tabster.observedElement) {
        tabster.observedElement = new ObservedElementAPI(tabster);
    }

    return tabster.observedElement;
}

export function getCrossOrigin(
    tabster: Types.TabsterCore
): Types.CrossOriginAPI {
    if (!tabster.crossOrigin) {
        getDeloser(tabster);
        getModalizer(tabster);
        getMover(tabster);
        getGroupper(tabster);
        getOutline(tabster);
        getObservedElement(tabster);
        tabster.crossOrigin = new CrossOriginAPI(tabster);
    }

    return tabster.crossOrigin;
}

export function getInternal(tabster: Types.TabsterCore): Types.InternalAPI {
    return tabster.internal;
}

export function disposeTabster(tabster: Types.TabsterCore): void {
    tabster.dispose();
}

export function getTabsterAttribute(
    props: Types.TabsterAttributeProps
): Types.TabsterDOMAttribute;
export function getTabsterAttribute(
    props: Types.TabsterAttributeProps,
    plain: true
): string;
export function getTabsterAttribute(
    props: Types.TabsterAttributeProps,
    plain?: true
): Types.TabsterDOMAttribute | string {
    const attr = JSON.stringify(props);

    if (plain === true) {
        return attr;
    }

    return {
        [Types.TabsterAttributeName]: attr,
    };
}

/**
 * Sets or updates Tabster attribute of the element.
 * @param element an element to set data-tabster attribute on.
 * @param newProps new Tabster props to set.
 * @param update if true, newProps will be merged with the existing props.
 *  When true and the value of a property in newProps is undefined, the property
 *  will be removed from the attribute.
 */
export function setTabsterAttribute(
    element: HTMLElement,
    newProps: Types.TabsterAttributeProps,
    update?: boolean
): void {
    let props: Types.TabsterAttributeProps | undefined;

    if (update) {
        const attr = element.getAttribute(Types.TabsterAttributeName);

        if (attr) {
            try {
                props = JSON.parse(attr);
            } catch (e) {
                /**/
            }
        }
    }

    if (!update || !props) {
        props = {};
    }

    for (const key of Object.keys(
        newProps
    ) as (keyof Types.TabsterAttributeProps)[]) {
        const value = newProps[key];

        if (value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props[key] = value as any;
        } else {
            delete props[key];
        }
    }

    if (Object.keys(props).length > 0) {
        element.setAttribute(
            Types.TabsterAttributeName,
            getTabsterAttribute(props, true)
        );
    } else {
        element.removeAttribute(Types.TabsterAttributeName);
    }
}

/**
 * Returns an instance of Tabster if it already exists on the window .
 * @param win window instance that could contain an Tabster instance.
 */
export function getCurrentTabster(win: Window): Types.TabsterCore | undefined {
    return (win as WindowWithTabsterInstance).__tabsterInstance;
}

export function makeNoOp(tabster: Types.TabsterCore, noop: boolean): void {
    const self = tabster as Tabster;

    if (self._noop !== noop) {
        self._noop = noop;

        const processNode = (element: HTMLElement): number => {
            if (!element.getAttribute) {
                return NodeFilter.FILTER_SKIP;
            }

            if (
                getTabsterOnElement(self, element) ||
                element.hasAttribute(Types.TabsterAttributeName)
            ) {
                updateTabsterByAttribute(self, element);
            }

            return NodeFilter.FILTER_SKIP;
        };

        const doc = self.getWindow().document;
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
    return (tabster as Tabster)._noop;
}
