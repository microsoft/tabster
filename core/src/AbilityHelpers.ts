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

class AbilityHelpers implements Types.AbilityHelpers, Types.AbilityHelpersInternal {
    private _storage: Types.AbilityHelpersElementStorage;
    private _unobserve: (() => void) | undefined;
    private _win: Window | undefined;
    private _forgetMemorizedTimer: number | undefined;
    private _forgetMemorizedElements: HTMLElement[] = [];

    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: OutlineAPI;
    root: RootAPI;
    deloser: DeloserAPI;
    focusable: FocusableAPI;
    modalizer: ModalizerAPI;
    observedElement: ObservedElementAPI;
    crossOrigin: CrossOriginAPI;
    gc: Types.GarbageCollectionAPI;

    constructor(win: Window) {
        this._storage = {};
        this._win = win;

        if (win && win.document) {
            this._unobserve = observeMutations(win.document, this, updateAbilityHelpersByAttribute);
        }

        const getWindow = this.getWindow;

        this.keyboardNavigation = new KeyboardNavigationState(this, getWindow);
        this.focusedElement = new FocusedElementState(this, getWindow);
        this.outline = new OutlineAPI(this, getWindow);
        this.deloser = new DeloserAPI(this, getWindow);
        this.focusable = new FocusableAPI(this, getWindow);
        this.modalizer = new ModalizerAPI(this, getWindow);
        this.root = new RootAPI(this, getWindow, () => { FocusableAPI.forgetFocusedGrouppers(this.focusable); });
        this.observedElement = new ObservedElementAPI(this, getWindow);
        this.crossOrigin = new CrossOriginAPI(this, getWindow);
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

        OutlineAPI.dispose(this.outline);
        DeloserAPI.dispose(this.deloser);
        FocusableAPI.dispose(this.focusable);
        ModalizerAPI.dispose(this.modalizer);
        RootAPI.dispose(this.root);
        ObservedElementAPI.dispose(this.observedElement);
        CrossOriginAPI.dispose(this.crossOrigin);
        KeyboardNavigationState.dispose(this.keyboardNavigation);
        FocusedElementState.dispose(this.focusedElement);

        stopWeakStorageCleanupAndClearStorage(this.getWindow);
        clearElementCache();
        this._storage = {};
        delete this._win;
    }

    static dispose(instance: Types.AbilityHelpers): void {
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

export function createAbilityHelpers(win: Window): Types.AbilityHelpers {
    return new AbilityHelpers(win);
}

export function disposeAbilityHelpers(ah: Types.AbilityHelpers): void {
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
