/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import { getRoot, getTabsterContext } from "./Context.js";
import { FocusedElementState } from "./State/FocusedElement.js";
import {
    createDummyInputManager,
    type DummyInput,
    type DummyInputManager,
    DummyInputManagerPriorities,
    getDummyInputContainer,
} from "./DummyInput.js";
import type * as Types from "./Types.js";
import { type WeakHTMLElement } from "./Utils.js";

/**
 * Factory that produces the dummy-input manager attached to a Modalizer.
 * Set on `tabsterCore.modalizerDummyManagerFactory` by `getRootDummyInputs`
 * so the implementation only enters the bundle when the consumer asks for
 * dummy-input behaviour.
 */
export type ModalizerDummyManagerFactory = (
    element: WeakHTMLElement,
    tabster: Types.TabsterCore,
    sys: Types.SysProps | undefined
) => DummyInputManager;

export const createModalizerDummyManager: ModalizerDummyManagerFactory = (
    element,
    tabster,
    sys
) => {
    const manager = createDummyInputManager(
        tabster,
        element,
        DummyInputManagerPriorities.Modalizer,
        sys
    );

    manager.setHandlers((dummyInput: DummyInput, isBackward: boolean) => {
        const el = element.get();
        const container = el && getRoot(tabster, el)?.getElement();
        const input = dummyInput.input;
        let toFocus: HTMLElement | null | undefined;

        if (container && input) {
            const dummyContainer = getDummyInputContainer(input);

            const ctx = getTabsterContext(tabster, dummyContainer || input);

            if (ctx) {
                toFocus = FocusedElementState.findNextTabbable(
                    tabster,
                    ctx,
                    container,
                    input,
                    undefined,
                    isBackward,
                    true
                )?.element;
            }

            if (toFocus) {
                nativeFocus(toFocus);
            }
        }
    });

    return manager;
};
