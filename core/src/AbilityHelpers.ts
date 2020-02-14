/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DeloserAPI } from './Deloser';
import { FocusableAPI, setupFocusableInIFrame } from './Focusable';
import { FocusedElementState, setupFocusedElementStateInIFrame } from './State/FocusedElement';
import { WindowWithAbilityHelpers } from './Instance';
import { KeyboardNavigationState, setupKeyboardNavigationStateInIFrame } from './State/KeyboardNavigation';
import { ModalizerAPI, setupModalizerInIFrame } from './Modalizer';
import { observeMutations } from './MutationEvent';
import { OutlineAPI, setupOutlineInIFrame } from './Outline';
import * as Types from './Types';

export { Types };

let _mainWindow: Window | undefined;

class AbilityHelpers implements Types.AbilityHelpers {
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: OutlineAPI;
    deloser: DeloserAPI;
    focusable: FocusableAPI;
    modalizer: ModalizerAPI;

    constructor(mainWindow?: Window) {
        // mainWindow === undefined means some testing environment.
        // All the componetnts will be no-op.

        if (mainWindow && mainWindow.document) {
            observeMutations(mainWindow.document);
        }

        this.keyboardNavigation = new KeyboardNavigationState(this, mainWindow);
        this.focusedElement = new FocusedElementState(this, mainWindow);
        this.outline = new OutlineAPI(this, mainWindow);
        this.deloser = new DeloserAPI(this, mainWindow);
        this.focusable = new FocusableAPI(this, mainWindow);
        this.modalizer = new ModalizerAPI(this, mainWindow);
    }
}

function getAbilityHelpers() {
    const win = typeof window !== 'undefined' ? (window as WindowWithAbilityHelpers) : undefined;

    let helpers: Types.AbilityHelpers | undefined;

    if (win && win.__abilityHelpers) {
        helpers = win.__abilityHelpers.helpers;
    }

    if (!helpers) {
        helpers = new AbilityHelpers(win);

        if (win) {
            _mainWindow = win;

            win.__abilityHelpers = {
                helpers,
                mainWindow: win
            };
        }
    }

    return helpers;
}

const instance = getAbilityHelpers();

export { instance as AbilityHelpers };

export function setupIFrame(iframeDocument: HTMLDocument) {
    const win = iframeDocument.defaultView as (WindowWithAbilityHelpers | null);

    if (!win || (win.__abilityHelpers)) {
        return;
    }

    win.__abilityHelpers = {
        helpers: instance,
        mainWindow: _mainWindow || win
    };

    observeMutations(iframeDocument);
    setupFocusedElementStateInIFrame(iframeDocument, _mainWindow);
    setupKeyboardNavigationStateInIFrame(iframeDocument, _mainWindow);
    setupOutlineInIFrame(iframeDocument, _mainWindow);
    setupFocusableInIFrame(iframeDocument, _mainWindow);
    setupModalizerInIFrame(iframeDocument, _mainWindow);
}
