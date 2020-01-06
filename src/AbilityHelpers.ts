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

class AbilityHelpers implements Types.AbilityHelpers {
    announcer: Announcer;
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: Outline;
    focusDeloser: FocusDeloser;
    focusable: Focusable;
    modalityLayer: ModalityLayer;

    constructor(mainWindow: Window) {
        observeMutations(mainWindow.document);
        this.announcer = new Announcer(mainWindow);
        this.keyboardNavigation = new KeyboardNavigationState(mainWindow, this);
        this.focusedElement = new FocusedElementState(mainWindow, this);
        this.outline = new Outline(mainWindow, this);
        this.focusDeloser = new FocusDeloser(mainWindow, this);
        this.focusable = new Focusable(mainWindow, this);
        this.modalityLayer = new ModalityLayer(mainWindow, this);
    }
}

function getAbilityHelpers() {
    const win = (window as WindowWithAbilityHelpers);

    if (!win.__abilityHelpers) {
        win.__abilityHelpers = {
            helpers: new AbilityHelpers(win),
            mainWindow: win
        };
    }

    return win.__abilityHelpers;
}

const abilityHelpers = getAbilityHelpers();
const instance = abilityHelpers.helpers;

export { instance as AbilityHelpers };

export function setupIFrame(iframeDocument: HTMLDocument) {
    const win = iframeDocument.defaultView as (WindowWithAbilityHelpers | null);

    if (!win || (win.__abilityHelpers)) {
        return;
    }

    win.__abilityHelpers = {
        helpers: abilityHelpers.helpers,
        mainWindow: abilityHelpers.mainWindow
    };

    const mainWindow = abilityHelpers.mainWindow;

    observeMutations(iframeDocument);
    setupFocusedElementStateInIFrame(mainWindow, iframeDocument);
    setupKeyboardNavigationStateInIFrame(mainWindow, iframeDocument);
    setupOutlineInIFrame(mainWindow, iframeDocument);
    setupFocusableInIFrame(mainWindow, iframeDocument);
    setupModalityLayerInIFrame(mainWindow, iframeDocument);
}
