/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import { _isFocusable } from "./Focusable.js";
import { getTabsterContext } from "./Context.js";
import { FocusedElementState } from "./State/FocusedElement.js";
import {
    createDummyInputManager,
    type DummyInput,
    type DummyInputManager,
    DummyInputManagerPriorities,
} from "./DummyInput.js";
import type * as Types from "./Types.js";
import { type WeakHTMLElement } from "./Utils.js";

/**
 * Factory that produces the dummy-input manager attached to a Mover. Set on
 * `tabsterCore.moverDummyManagerFactory` by `getRootDummyInputs` so the
 * implementation only enters the bundle when the consumer asks for
 * dummy-input behaviour. Without it, Mover instances created in the
 * uncontrolled (`controlTab: false`) mode have no dummy manager.
 */
export type MoverDummyManagerFactory = (
    element: WeakHTMLElement,
    tabster: Types.TabsterCore,
    getMemorized: () => WeakHTMLElement | undefined,
    sys: Types.SysProps | undefined
) => DummyInputManager;

export const createMoverDummyManager: MoverDummyManagerFactory = (
    element,
    tabster,
    getMemorized,
    sys
) => {
    const manager = createDummyInputManager(
        tabster,
        element,
        DummyInputManagerPriorities.Mover,
        sys
    );

    const onFocusDummyInput = (dummyInput: DummyInput) => {
        const container = element.get();
        const input = dummyInput.input;

        if (container && input) {
            const ctx = getTabsterContext(tabster, container);

            let toFocus: HTMLElement | null | undefined;

            if (ctx) {
                toFocus = FocusedElementState.findNextTabbable(
                    tabster,
                    ctx,
                    undefined,
                    input,
                    undefined,
                    !dummyInput.isFirst,
                    true
                )?.element;
            }

            const memorized = getMemorized()?.get();

            if (memorized && _isFocusable(tabster, memorized)) {
                toFocus = memorized;
            }

            if (toFocus) {
                nativeFocus(toFocus);
            }
        }
    };

    manager.setHandlers(onFocusDummyInput);

    return manager;
};
