/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DeloserAPI } from './Deloser';
import { FocusableAPI, setupFocusableInIFrame } from './Focusable';
import { FocusedElementState, setupFocusedElementStateInIFrame } from './State/FocusedElement';
import { updateAbilityHelpersByAttribute } from './Instance';
import { KeyboardNavigationState, setupKeyboardNavigationStateInIFrame } from './State/KeyboardNavigation';
import { ModalizerAPI } from './Modalizer';
import { observeMutations } from './MutationEvent';
import { OutlineAPI, setupOutlineInIFrame } from './Outline';
import { RootAPI, setupRootInIFrame } from './Root';
import * as Types from './Types';

export { Types };

let _mainWindow: Types.WindowWithAbilityHelpers | undefined;
let _instance: Types.AbilityHelpers | undefined;

class AbilityHelpers implements Types.AbilityHelpers {
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: OutlineAPI;
    root: RootAPI;
    deloser: DeloserAPI;
    focusable: FocusableAPI;
    modalizer: ModalizerAPI;

    constructor(mainWindow: Window) {
        // mainWindow === undefined means some testing environment.
        // All the componetnts will be no-op.

        if (mainWindow && mainWindow.document) {
            observeMutations(mainWindow.document, this, updateAbilityHelpersByAttribute);
        }

        this.keyboardNavigation = new KeyboardNavigationState(this, mainWindow);
        this.focusedElement = new FocusedElementState(this, mainWindow);
        this.outline = new OutlineAPI(this, mainWindow);
        this.root = new RootAPI(this, mainWindow);
        this.deloser = new DeloserAPI(this, mainWindow);
        this.focusable = new FocusableAPI(this, mainWindow);
        this.modalizer = new ModalizerAPI(this, mainWindow);
    }

    getAttribute(props: Types.AbilityHelpersAttributeProps | null): Types.AbilityHelpersDOMAttribute {
        return {
            [Types.AbilityHelpersAttributeName]: props === null ? undefined : JSON.stringify(props)
        };
    }
}

function createAbilityHelpers(win: Types.WindowWithAbilityHelpers) {
    let helpers: Types.AbilityHelpers | undefined;

    if (win && win.__ah) {
        helpers = win.__ah.helpers;
    }

    if (!helpers) {
        helpers = new AbilityHelpers(win);

        if (win) {
            _mainWindow = win;

            win.__ah = {
                helpers,
                mainWindow: win
            };
        }
    }

    return helpers;
}

export function setupAbilityHelpers(mainWindow: Window): Types.AbilityHelpers {
    if (!_instance) {
        _instance = createAbilityHelpers(mainWindow);
    }

    return _instance;
}

export function getAbilityHelpers(): Types.AbilityHelpers {
    if (!_instance) {
        throw new Error('setupAbilityHelpers() is not called.');
    }

    return _instance;
}

export function setupAbilityHelpersIFrame(iframeDocument: HTMLDocument): void {
    if (!_instance) {
        throw new Error('setupAbilityHelpers() is not called.');
    }

    const win = iframeDocument.defaultView as (Types.WindowWithAbilityHelpers | null);

    if (!win || (win.__ah)) {
        return;
    }

    win.__ah = {
        helpers: _instance,
        mainWindow: _mainWindow || win
    };

    observeMutations(iframeDocument, _instance, updateAbilityHelpersByAttribute);
    setupFocusedElementStateInIFrame(iframeDocument, _mainWindow);
    setupKeyboardNavigationStateInIFrame(iframeDocument, _mainWindow);
    setupOutlineInIFrame(iframeDocument, _mainWindow);
    setupFocusableInIFrame(iframeDocument, _mainWindow);
    setupRootInIFrame(iframeDocument, _mainWindow);
}
