/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import { getTabsterContext } from "./Context.js";
import { findNextTabbable } from "./Tab.js";
import {
    createDummyInputManager,
    type DummyInput,
    type DummyInputManager,
    DummyInputManagerPriorities,
} from "./DummyInput.js";
import type * as Types from "./Types.js";
import { getAdjacentElement, type WeakHTMLElement } from "./Utils.js";

/**
 * Factory that produces the dummy-input manager attached to a Groupper.
 * Set on `tabsterCore.groupperDummyManagerFactory` by `getRootDummyInputs`
 * so the implementation only enters the bundle when the consumer asks for
 * dummy-input behaviour.
 */
export type GroupperDummyManagerFactory = (
    element: WeakHTMLElement,
    groupper: Types.Groupper,
    tabster: Types.TabsterCore,
    sys: Types.SysProps | undefined
) => DummyInputManager;

export const createGroupperDummyManager: GroupperDummyManagerFactory = (
    element,
    groupper,
    tabster,
    sys
) => {
    const manager = createDummyInputManager(
        tabster,
        element,
        DummyInputManagerPriorities.Groupper,
        sys,
        true
    );

    manager.setHandlers(
        (
            dummyInput: DummyInput,
            isBackward: boolean,
            relatedTarget: HTMLElement | null
        ) => {
            const container = element.get();
            const input = dummyInput.input;

            if (container && input) {
                const ctx = getTabsterContext(tabster, input);

                if (ctx) {
                    let next: HTMLElement | null | undefined;

                    next = groupper.findNextTabbable(
                        relatedTarget || undefined,
                        undefined,
                        isBackward,
                        true
                    )?.element;

                    if (!next) {
                        next = findNextTabbable(
                            tabster,
                            ctx,
                            undefined,
                            dummyInput.isOutside
                                ? input
                                : getAdjacentElement(container, !isBackward),
                            undefined,
                            isBackward,
                            true
                        )?.element;
                    }

                    if (next) {
                        nativeFocus(next);
                    }
                }
            }
        }
    );

    return manager;
};
