/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CrossOriginAPI } from './CrossOrigin';
import { DeloserAPI } from './Deloser';
import { FocusableAPI } from './Focusable';
import { FocusedElementState } from './State/FocusedElement';
import { GroupperAPI } from './Groupper';
import { updateTabsterByAttribute } from './Instance';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import { ModalizerAPI } from './Modalizer';
import { MoverAPI } from './Mover';
import { observeMutations } from './MutationEvent';
import { ObservedElementAPI } from './State/ObservedElement';
import { OutlineAPI } from './Outline';
import { RootAPI, WindowWithTabsterInstance } from './Root';
import * as Types from './Types';
import { UncontrolledAPI } from './Uncontrolled';
import {
    cleanupWeakRefStorage,
    clearElementCache,
    disposeInstanceContext,
    setBasics as overrideBasics,
    startWeakRefStorageCleanup,
    stopWeakRefStorageCleanupAndClearStorage
} from './Utils';

export { Types };

/**
 * Extends Window to include an internal Tabster instance.
 */
class Tabster implements Types.TabsterCore, Types.TabsterInternal {
    private _storage: Types.TabsterElementStorage;
    private _unobserve: (() => void) | undefined;
    private _win: WindowWithTabsterInstance | undefined;
    private _forgetMemorizedTimer: number | undefined;
    private _forgetMemorizedElements: HTMLElement[] = [];
    public _version: string = __VERSION__;

    keyboardNavigation: Types.KeyboardNavigationState;
    focusedElement: Types.FocusedElementState;
    focusable: Types.FocusableAPI;
    root: Types.RootAPI;
    uncontrolled: Types.UncontrolledAPI;

    groupper?: Types.GroupperAPI;
    mover?: Types.MoverAPI;
    outline?: Types.OutlineAPI;
    deloser?: Types.DeloserAPI;
    modalizer?: Types.ModalizerAPI;
    observedElement?: Types.ObservedElementAPI;
    crossOrigin?: Types.CrossOriginAPI;

    groupperDispose?: Types.DisposeFunc;
    moverDispose?: Types.DisposeFunc;
    outlineDispose?: Types.DisposeFunc;
    rootDispose?: Types.DisposeFunc;
    deloserDispose?: Types.DisposeFunc;
    modalizerDispose?: Types.DisposeFunc;
    observedElementDispose?: Types.DisposeFunc;
    crossOriginDispose?: Types.DisposeFunc;

    constructor(win: Window, props?: Types.TabsterCoreProps) {
        this._storage = {};
        this._win = win;

        const getWindow = this.getWindow;

        if (win && win.document) {
            this._unobserve = observeMutations(win.document, this, updateTabsterByAttribute);
        }

        this.keyboardNavigation = new KeyboardNavigationState(getWindow);
        this.focusedElement = new FocusedElementState(this, getWindow);
        this.focusable = new FocusableAPI(this, getWindow);
        this.root = new RootAPI(this, () => {
            (this.groupper as Types.GroupperInternalAPI | undefined)?.forgetUnlimitedGrouppers();
        }, props?.autoRoot);
        this.uncontrolled = new UncontrolledAPI(this);

        startWeakRefStorageCleanup(getWindow);
    }

    protected dispose(): void {
        if (this._unobserve) {
            this._unobserve();
            delete this._unobserve;
        }

        const win = this._win;

        this._forgetMemorizedElements = [];

        if (win && this._forgetMemorizedTimer) {
            win.clearTimeout(this._forgetMemorizedTimer);
            delete this._forgetMemorizedTimer;
        }

        interface DisposeParts {
            'outlineDispose': 'outline';
            'crossOriginDispose': 'crossOrigin';
            'deloserDispose': 'deloser';
            'groupperDispose': 'groupper';
            'moverDispose': 'mover';
            'modalizerDispose': 'modalizer';
            'observedElementDispose': 'observedElement';
        }

        const disposeParts: DisposeParts = {
            'outlineDispose': 'outline',
            'crossOriginDispose': 'crossOrigin',
            'deloserDispose': 'deloser',
            'groupperDispose': 'groupper',
            'moverDispose': 'mover',
            'modalizerDispose': 'modalizer',
            'observedElementDispose': 'observedElement'
        };

        for (let key of Object.keys(disposeParts) as (keyof DisposeParts)[]) {
            const disposeFunc = this[key];

            if (disposeFunc) {
                disposeFunc();
                delete this[disposeParts[key]];
                delete this[key];
            }
        }

        KeyboardNavigationState.dispose(this.keyboardNavigation);
        FocusableAPI.dispose(this.focusable);
        FocusedElementState.dispose(this.focusedElement);
        RootAPI.dispose(this.root);

        stopWeakRefStorageCleanupAndClearStorage(this.getWindow);
        clearElementCache(this.getWindow);

        this._storage = {};

        if (win) {
            disposeInstanceContext(win);
            delete win.__tabsterInstance;
            delete this._win;
        }
    }

    static dispose(instance: Types.TabsterCore): void {
        (instance as Tabster).dispose();
    }

    storageEntry(uid: string, addremove?: boolean): Types.TabsterElementStorageEntry | undefined {
        let entry = this._storage[uid];

        if (entry) {
            if ((addremove === false) && (Object.keys(entry).length === 0)) {
                delete this._storage[uid];
            }
        } else if (addremove === true) {
            entry = this._storage[uid] = {};
        }

        return entry;
    }

    getWindow = () => {
        if (!this._win) {
            throw new Error('Using disposed Tabster.');
        }

        return this._win;
    }

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
                let el: HTMLElement | undefined = tabster._forgetMemorizedElements.shift();
                el;
                el = tabster._forgetMemorizedElements.shift()
            ) {
                clearElementCache(tabster.getWindow, el);
                FocusedElementState.forgetMemorized(tabster.focusedElement, el);
            }
        }, 0);

        cleanupWeakRefStorage(tabster.getWindow, true);
    }
}

export { overrideBasics };

export function forceCleanup(tabster: Tabster): void {
    // The only legit case for calling this method is when you've completely removed
    // the application DOM and not going to add the new one for a while.
    Tabster.forceCleanup(tabster);
}

/**
 * Creates an instance of Tabster, returns the current window instance if it already exists.
 */
export function createTabster(win: Window, props?: Types.TabsterCoreProps): Types.TabsterCore {
    const existingAh = getCurrentTabster(win as WindowWithTabsterInstance);

    if (existingAh) {
        if (__DEV__) {
            console.warn('Attempted to create a duplicate Tabster instance on the window');
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
    const tabsterInternal = (tabster as unknown as Types.TabsterInternal);

    if (!tabsterInternal.groupper) {
        const groupper = new GroupperAPI(tabster, tabsterInternal.getWindow);
        tabsterInternal.groupper = groupper;
        tabsterInternal.groupperDispose = () => { GroupperAPI.dispose(groupper); };
    }

    return tabsterInternal.groupper;
}

/**
 * Creates a new mover instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getMover(tabster: Types.TabsterCore): Types.MoverAPI {
    const tabsterInternal = (tabster as unknown as Types.TabsterInternal);

    if (!tabsterInternal.mover) {
        const mover = new MoverAPI(tabster, tabsterInternal.getWindow);
        tabsterInternal.mover = mover;
        tabsterInternal.moverDispose = () => { MoverAPI.dispose(mover); };
    }

    return tabsterInternal.mover;
}

export function getOutline(tabster: Types.TabsterCore): Types.OutlineAPI {
    const tabsterInternal = (tabster as unknown as Types.TabsterInternal);

    if (!tabsterInternal.outline) {
        const outline = new OutlineAPI(tabster);
        tabsterInternal.outline = outline;
        tabsterInternal.outlineDispose = () => { OutlineAPI.dispose(outline); };
    }

    return tabsterInternal.outline;
}

/**
 * Creates a new new deloser instance or returns an existing one
 * @param tabster Tabster instance
 * @param props Deloser props
 */
export function getDeloser(
    tabster: Types.TabsterCore,
    props?: { autoDeloser: Types.DeloserBasicProps & Types.DeloserExtendedProps }
): Types.DeloserAPI {
    const tabsterInternal = (tabster as unknown as Types.TabsterInternal);

    if (!tabsterInternal.deloser) {
        const deloser = new DeloserAPI(tabster, props);
        tabsterInternal.deloser = deloser;
        tabsterInternal.deloserDispose = () => { DeloserAPI.dispose(deloser); };
    }

    return tabsterInternal.deloser;
}

/**
 * Creates a new modalizer instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getModalizer(tabster: Types.TabsterCore): Types.ModalizerAPI {
    const tabsterInternal = (tabster as unknown as Types.TabsterInternal);

    if (!tabsterInternal.modalizer) {
        const modalizer = new ModalizerAPI(tabster);
        tabsterInternal.modalizer = modalizer;
        tabsterInternal.modalizerDispose = () => { ModalizerAPI.dispose(modalizer); };
    }

    return tabsterInternal.modalizer;
}

export function getObservedElement(tabster: Types.TabsterCore): Types.ObservedElementAPI {
    const tabsterInternal = (tabster as unknown as Types.TabsterInternal);

    if (!tabsterInternal.observedElement) {
        const observedElement = new ObservedElementAPI(tabster);
        tabsterInternal.observedElement = observedElement;
        tabsterInternal.observedElementDispose = () => { ObservedElementAPI.dispose(observedElement); };
    }

    return tabsterInternal.observedElement;
}

export function getCrossOrigin(tabster: Types.TabsterCore): Types.CrossOriginAPI {
    const tabsterInternal = (tabster as unknown as Types.TabsterInternal);

    if (!tabsterInternal.crossOrigin) {
        getDeloser(tabster);
        getModalizer(tabster);
        getMover(tabster);
        getGroupper(tabster);
        getOutline(tabster);
        getObservedElement(tabster);
        const crossOrigin = new CrossOriginAPI(tabster);
        tabsterInternal.crossOrigin = crossOrigin;
        tabsterInternal.crossOriginDispose = () => { CrossOriginAPI.dispose(crossOrigin); };
    }

    return tabsterInternal.crossOrigin;
}

export function disposeTabster(tabster: Types.TabsterCore): void {
    Tabster.dispose(tabster);
}

export function getTabsterAttribute(
    props?: Types.TabsterAttributeProps,
    plain?: boolean
): Types.TabsterDOMAttribute | string | undefined {
    const attr = props ? JSON.stringify(props) : undefined;

    if (plain === true) {
        return attr;
    }

    return {
        [Types.TabsterAttributeName]: attr
    };
}

/**
 * Returns an instance of Tabster if it already exists on the window .
 * @param win window instance that could contain an Tabster instance.
 */
export function getCurrentTabster(win: Window): Types.TabsterCore | undefined {
    return (win as WindowWithTabsterInstance).__tabsterInstance;
}
