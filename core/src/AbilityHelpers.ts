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

export { Types };

class AbilityHelpers implements Types.AbilityHelpers, Types.AbilityHelpersInternal {
    private _storage: Types.AbilityHelpersElementStorage;
    private _unobserve: (() => void) | undefined;
    private _win: Window;

    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: OutlineAPI;
    root: RootAPI;
    deloser: DeloserAPI;
    focusable: FocusableAPI;
    modalizer: ModalizerAPI;
    observedElement: ObservedElementAPI;
    crossOrigin: CrossOriginAPI;

    constructor(win: Window) {
        this._storage = {};
        this._win = win;

        if (win && win.document) {
            this._unobserve = observeMutations(win.document, this, updateAbilityHelpersByAttribute);
        }

        this.keyboardNavigation = new KeyboardNavigationState(this, win);
        this.focusedElement = new FocusedElementState(this, win);
        this.outline = new OutlineAPI(this, win);
        this.deloser = new DeloserAPI(this, win);
        this.focusable = new FocusableAPI(this, win);
        this.modalizer = new ModalizerAPI(this, win);
        this.root = new RootAPI(this, win, () => { FocusableAPI.forgetFocusedGrouppers(this.focusable); });
        this.observedElement = new ObservedElementAPI(this, win);
        this.crossOrigin = new CrossOriginAPI(this, win);
    }

    protected dispose(): void {
        if (this._unobserve) {
            this._unobserve();
            delete this._unobserve;
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

        delete this._win;
        delete this.keyboardNavigation;
        delete this.focusedElement;
        delete this.outline;
        delete this.deloser;
        delete this.focusable;
        delete this.modalizer;
        delete this.root;
        delete this.observedElement;
        delete this.crossOrigin;
        delete this._storage;
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

    getWindow(): Window {
        return this._win;
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
