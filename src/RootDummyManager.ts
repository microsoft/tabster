/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import {
    createDummyInputManager,
    type DummyInput,
    type DummyInputManager,
    DummyInputManagerPriorities,
} from "./DummyInput.js";
import type * as Types from "./Types.js";
import { type WeakHTMLElement } from "./Utils.js";

/**
 * Factory that produces the dummy-input manager attached to a Root. Set on
 * `tabsterCore.rootDummyManagerFactory` by `getRootDummyInputs` so the
 * implementation (and its DummyInput / FocusedElement / KeyboardNavigation
 * dependencies) only enters the bundle when the consumer asks for
 * dummy-input behaviour. Without it, `Root.addDummyInputs()` is a no-op.
 */
export type RootDummyManagerFactory = (
    tabster: Types.TabsterCore,
    element: WeakHTMLElement,
    setFocused: (focused: boolean) => void,
    sys: Types.SysProps | undefined
) => DummyInputManager;

/**
 * Builds the dummy-input manager attached to a Root. Extracted out of
 * `Root.ts` so the factory and its dependencies only enter the bundle when
 * the consumer opts in via `getRootDummyInputs(tabster)`.
 */
export const createRootDummyManager: RootDummyManagerFactory = (
    tabster,
    element,
    setFocused,
    sys
) => {
    const manager = createDummyInputManager(
        tabster,
        element,
        DummyInputManagerPriorities.Root,
        sys,
        undefined,
        true
    );

    const onDummyInputFocus = (dummyInput: DummyInput): void => {
        if (dummyInput.useDefaultAction) {
            // When we've reached the last focusable element, we want to let the browser
            // to move the focus outside of the page. In order to do that we're synchronously
            // calling focus() of the dummy input from the Tab key handler and allowing
            // the default action to move the focus out.
            setFocused(false);
        } else {
            // The only way a dummy input gets focused is during the keyboard navigation.
            tabster.keyboardNavigation.setNavigatingWithKeyboard(true);

            const el = element.get();

            if (el) {
                setFocused(true);

                const toFocus = tabster.focusedElement.getFirstOrLastTabbable(
                    dummyInput.isFirst,
                    { container: el, ignoreAccessibility: true }
                );

                if (toFocus) {
                    nativeFocus(toFocus);
                    return;
                }
            }

            dummyInput.input?.blur();
        }
    };

    manager.setHandlers(onDummyInputFocus);

    return manager;
};
