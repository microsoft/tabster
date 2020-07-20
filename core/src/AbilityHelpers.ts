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

class AbilityHelpers implements Types.AbilityHelpers {
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: OutlineAPI;
    root: RootAPI;
    deloser: DeloserAPI;
    focusable: FocusableAPI;
    modalizer: ModalizerAPI;
    observedElement: ObservedElementAPI;
    crossOrigin: CrossOriginAPI;

    constructor(mainWindow: Window) {
        // mainWindow === undefined means some testing environment.
        // All the componetnts will be no-op.

        if (mainWindow && mainWindow.document) {
            observeMutations(mainWindow.document, this, updateAbilityHelpersByAttribute);
        }

        this.keyboardNavigation = new KeyboardNavigationState(this, mainWindow);
        this.focusedElement = new FocusedElementState(this, mainWindow);
        this.outline = new OutlineAPI(this, mainWindow);
        this.deloser = new DeloserAPI(this, mainWindow);
        this.focusable = new FocusableAPI(this, mainWindow);
        this.modalizer = new ModalizerAPI(this, mainWindow);
        this.root = new RootAPI(this, mainWindow, () => { FocusableAPI.forgetFocusedGrouppers(this.focusable); });
        this.observedElement = new ObservedElementAPI(this, mainWindow);
        this.crossOrigin = new CrossOriginAPI(this, mainWindow);
    }
}

export function setupAbilityHelpers(win: Window): Types.AbilityHelpers {
    const wnd = win as Types.WindowWithAbilityHelpers;
    let helpers: Types.AbilityHelpers | undefined;

    if (wnd && wnd.__ah) {
        helpers = wnd.__ah.helpers;
    }

    if (!helpers) {
        helpers = new AbilityHelpers(win);

        if (wnd) {
            wnd.__ah = {
                helpers,
                mainWindow: wnd
            };
        }
    }

    return helpers;
}

export function getAbilityHelpers(win: Window): Types.AbilityHelpers {
    const wnd = win as Types.WindowWithAbilityHelpers;

    if (!wnd || !wnd.__ah) {
        throw new Error('setupAbilityHelpers() is not called.');
    }

    return wnd.__ah.helpers;
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
