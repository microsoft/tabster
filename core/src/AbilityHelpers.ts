/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CrossOriginAPI } from './CrossOrigin';
import { DeloserAPI } from './Deloser';
import { FocusableAPI } from './Focusable';
import { FocusedElementState } from './State/FocusedElement';
import { updateAbilityHelpersByAttribute } from './Instance';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import { ModalizerAPI } from './Modalizer';
import { observeMutations } from './MutationEvent';
import { ObservedElementAPI } from './State/ObservedElement';
import { OutlineAPI } from './Outline';
import { RootAPI } from './Root';
import * as Types from './Types';
import { clearElementCache, startWeakStorageCleanup, stopWeakStorageCleanupAndClearStorage } from './Utils';

export { Types };

/**
 * Extends Window to include an internal ability helpers instance
 */
interface WindowWithAHInstance extends Window {
    __ahInstance?: Types.AbilityHelpersCore;
}
class AbilityHelpers implements Types.AbilityHelpersCore, Types.AbilityHelpersInternal {
    private _storage: Types.AbilityHelpersElementStorage;
    private _unobserve: (() => void) | undefined;
    private _win: WindowWithAHInstance | undefined;
    private _forgetMemorizedTimer: number | undefined;
    private _forgetMemorizedElements: HTMLElement[] = [];

    keyboardNavigation: Types.KeyboardNavigationState;
    focusedElement: Types.FocusedElementState;
    focusable: Types.FocusableAPI;
    root: Types.RootAPI;
    gc: Types.GarbageCollectionAPI;

    outline?: Types.OutlineAPI;
    deloser?: Types.DeloserAPI;
    modalizer?: Types.ModalizerAPI;
    observedElement?: Types.ObservedElementAPI;
    crossOrigin?: Types.CrossOriginAPI;

    outlineDispose?: Types.DisposeFunc;
    rootDispose?: Types.DisposeFunc;
    deloserDispose?: Types.DisposeFunc;
    modalizerDispose?: Types.DisposeFunc;
    observedElementDispose?: Types.DisposeFunc;
    crossOriginDispose?: Types.DisposeFunc;

    constructor(win: Window, props?: Types.AbilityHelpersCoreProps) {
        this._storage = {};
        this._win = win;

        if (win && win.document) {
            this._unobserve = observeMutations(win.document, this, updateAbilityHelpersByAttribute);
        }

        const getWindow = this.getWindow;

        this.keyboardNavigation = new KeyboardNavigationState(this, getWindow);
        this.focusedElement = new FocusedElementState(this, getWindow);
        this.focusable = new FocusableAPI(this, getWindow);
        this.root = new RootAPI(this, () => { FocusableAPI.forgetFocusedGrouppers(this.focusable); }, props?.autoRoot);

        this.gc = {
            forgetMemorized: this._forgetMemorized
        };

        startWeakStorageCleanup(getWindow);
    }

    protected dispose(): void {
        if (this._unobserve) {
            this._unobserve();
            delete this._unobserve;
        }

        this._forgetMemorizedElements = [];

        if (this._win && this._forgetMemorizedTimer) {
            this._win.clearTimeout(this._forgetMemorizedTimer);
            delete this._forgetMemorizedTimer;
        }

        if (this.outlineDispose) {
            this.outlineDispose();
            delete this.outline;
            delete this.outlineDispose;
        }

        if (this.deloserDispose) {
            this.deloserDispose();
            delete this.deloser;
            delete this.deloserDispose;
        }

        if (this.modalizerDispose) {
            this.modalizerDispose();
            delete this.modalizer;
            delete this.modalizerDispose;
        }

        if (this.observedElementDispose) {
            this.observedElementDispose();
            delete this.observedElement;
            delete this.observedElementDispose;
        }

        if (this.crossOriginDispose) {
            this.crossOriginDispose();
            delete this.crossOrigin;
            delete this.crossOriginDispose;
        }

        KeyboardNavigationState.dispose(this.keyboardNavigation);
        FocusableAPI.dispose(this.focusable);
        FocusedElementState.dispose(this.focusedElement);
        RootAPI.dispose(this.root);

        stopWeakStorageCleanupAndClearStorage(this.getWindow);
        clearElementCache();
        this._storage = {};

        if (this._win?.__ahInstance) {
            delete this._win?.__ahInstance;
        }
        delete this._win;
    }

    static dispose(instance: Types.AbilityHelpersCore): void {
        (instance as AbilityHelpers).dispose();
    }

    storageEntry(uid: string, addremove?: boolean): Types.AbilityHelpersElementStorageEntry | undefined {
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
            throw new Error('Using disposed AbilityHelpers.');
        }

        return this._win;
    }

    private _forgetMemorized = (parent: HTMLElement): void => {
        if (!this._win) {
            return;
        }

        this._forgetMemorizedElements.push(parent);

        if (this._forgetMemorizedTimer) {
            return;
        }

        this._forgetMemorizedTimer = this._win.setTimeout(() => {
            delete this._forgetMemorizedTimer;

            for (let el: HTMLElement | undefined = this._forgetMemorizedElements.shift(); el; el = this._forgetMemorizedElements.shift()) {
                clearElementCache(el);
                FocusedElementState.forgetMemorized(this.focusedElement, el);
            }
        }, 0);
    }
}

/**
 * Creates an instance of ability helpers, returns the current window instance if it already exists
 */
export function createAbilityHelpers(win: Window, props?: Types.AbilityHelpersCoreProps): Types.AbilityHelpersCore {
    const existingAh = getCurrentAbilityHelpers(win as WindowWithAHInstance);
    if (existingAh) {
        if (__DEV__) {
            console.warn('Attempted to create a duplicate ability helpers instance on the window');
        }
        return existingAh;
    }

    const ah = new AbilityHelpers(win, props);
    (win as WindowWithAHInstance).__ahInstance = ah;
    return ah;
}

export function getOutline(ah: Types.AbilityHelpersCore): Types.OutlineAPI {
    const ahInternal = (ah as unknown as Types.AbilityHelpersInternal);

    if (!ahInternal.outline) {
        const outline = new OutlineAPI(ah);
        ahInternal.outline = outline;
        ahInternal.outlineDispose = () => { OutlineAPI.dispose(outline); };
    }

    return ahInternal.outline;
}

export function getDeloser(
    ah: Types.AbilityHelpersCore,
    props?: { autoDeloser: Types.DeloserBasicProps & Types.DeloserExtendedProps }
): Types.DeloserAPI {
    const ahInternal = (ah as unknown as Types.AbilityHelpersInternal);

    if (!ahInternal.deloser) {
        const deloser = new DeloserAPI(ah, props);
        ahInternal.deloser = deloser;
        ahInternal.deloserDispose = () => { DeloserAPI.dispose(deloser); };
    }

    return ahInternal.deloser;
}

export function getModalizer(ah: Types.AbilityHelpersCore): Types.ModalizerAPI {
    const ahInternal = (ah as unknown as Types.AbilityHelpersInternal);

    if (!ahInternal.modalizer) {
        const modalizer = new ModalizerAPI(ah);
        ahInternal.modalizer = modalizer;
        ahInternal.modalizerDispose = () => { ModalizerAPI.dispose(modalizer); };
    }

    return ahInternal.modalizer;
}

export function getObservedElement(ah: Types.AbilityHelpersCore): Types.ObservedElementAPI {
    const ahInternal = (ah as unknown as Types.AbilityHelpersInternal);

    if (!ahInternal.observedElement) {
        const observedElement = new ObservedElementAPI(ah);
        ahInternal.observedElement = observedElement;
        ahInternal.observedElementDispose = () => { ObservedElementAPI.dispose(observedElement); };
    }

    return ahInternal.observedElement;
}

export function getCrossOrigin(ah: Types.AbilityHelpersCore): Types.CrossOriginAPI {
    const ahInternal = (ah as unknown as Types.AbilityHelpersInternal);

    if (!ahInternal.crossOrigin) {
        getDeloser(ah);
        getOutline(ah);
        getObservedElement(ah);
        const crossOrigin = new CrossOriginAPI(ah);
        ahInternal.crossOrigin = crossOrigin;
        ahInternal.crossOriginDispose = () => { CrossOriginAPI.dispose(crossOrigin); };
    }

    return ahInternal.crossOrigin;
}

export function disposeAbilityHelpers(ah: Types.AbilityHelpersCore): void {
    AbilityHelpers.dispose(ah);
}

export function getAbilityHelpersAttribute(
    props: Types.AbilityHelpersAttributeProps | null,
    plain: true
): string | undefined;
export function getAbilityHelpersAttribute(
    props: Types.AbilityHelpersAttributeProps | null, plain?: false
): Types.AbilityHelpersDOMAttribute;
export function getAbilityHelpersAttribute(
    props: Types.AbilityHelpersAttributeProps | null,
    plain?: boolean
): Types.AbilityHelpersDOMAttribute | string | undefined {
    const attr = props === null ? undefined : JSON.stringify(props);

    if (plain === true) {
        return attr;
    }

    return {
        [Types.AbilityHelpersAttributeName]: attr
    };
}

/**
 * Returns an instance of ability helpers if it already exists on the window 
 * @param win window instance that could contain an AH instance
 */
export function getCurrentAbilityHelpers(win: Window): Types.AbilityHelpersCore | undefined {
    if ((win as WindowWithAHInstance)?.__ahInstance) {
        return (win as WindowWithAHInstance).__ahInstance;
    }

    return undefined;
}
