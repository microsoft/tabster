/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Announcer } from './Announcer';
import { Focusable, setupFocusableInIFrame } from './Focusable';
import { FocusDeloser } from './FocusDeloser';
import { FocusedElementState, setupFocusedElementStateInIFrame } from './State/FocusedElement';
import { WindowWithAbilityHelpers } from './Instance';
import { KeyboardNavigationState, setupKeyboardNavigationStateInIFrame } from './State/KeyboardNavigation';
import { ModalityLayer, setupModalityLayerInIFrame } from './ModalityLayer';
import { observeMutations } from './MutationEvent';
import { Outline, setupOutlineInIFrame } from './Outline';
import * as Types from './Types';

export { Types };

let _mainWindow: Window | undefined;

class AbilityHelpers implements Types.AbilityHelpers {
    announcer: Announcer;
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: Outline;
    focusDeloser: FocusDeloser;
    focusable: Focusable;
    modalityLayer: ModalityLayer;

    constructor(mainWindow?: Window) {
        // mainWindow === undefined means some testing environment.
        // All the componetnts will be no-op.

        if (mainWindow && mainWindow.document) {
            observeMutations(mainWindow.document);
        }

        this.announcer = new Announcer(mainWindow);
        this.keyboardNavigation = new KeyboardNavigationState(this, mainWindow);
        this.focusedElement = new FocusedElementState(this, mainWindow);
        this.outline = new Outline(this, mainWindow);
        this.focusDeloser = new FocusDeloser(this, mainWindow);
        this.focusable = new Focusable(this, mainWindow);
        this.modalityLayer = new ModalityLayer(this, mainWindow);
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
    setupModalityLayerInIFrame(iframeDocument, _mainWindow);
}
