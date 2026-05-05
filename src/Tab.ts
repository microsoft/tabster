/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import { _findFocusable, _isElementVisible } from "./Focusable.js";
import { Keys } from "./Keys.js";
import { getTabsterContext } from "./Context.js";
import type * as Types from "./Types.js";
import { TabsterMoveFocusEvent } from "./Events.js";
import { DummyInputManager } from "./DummyInput.js";
import {
    addListener,
    createTimer,
    dispatchEvent,
    removeListener,
    setTimer,
    type Timer,
} from "./Utils.js";
import { getTabsterOnElement } from "./Instance.js";
import { dom } from "./DOMAPI.js";

// Tab-key handling lives here (not in FocusedElement.ts) so its
// dependencies — `findNextTabbable`, `DummyInputManager`'s phantom
// helpers, the keydown listener wiring — only enter the bundle when a
// consumer opts in via `getRootDummyInputs(tabster)`. Default
// `createTabster(win)` no longer pulls Tab interception.

let _isTabbing = false;
const _isTabbingTimer: Timer = createTimer();

/**
 * `true` while focus is being moved as a result of a Tab keypress.
 * Mover consults this to disambiguate a focusin caused by tabbing from
 * one caused by mouse/programmatic focus.
 */
export function isTabbing(): boolean {
    return _isTabbing;
}

function getUncontrolledCompletelyContainer(
    tabster: Types.TabsterCore,
    element: HTMLElement
): HTMLElement | undefined {
    const getParent = tabster.getParent;
    let el: HTMLElement | null = element;

    do {
        const uncontrolledOnElement = getTabsterOnElement(
            tabster,
            el
        )?.uncontrolled;

        if (uncontrolledOnElement) {
            // The user-supplied `checkUncontrolledCompletely` callback
            // overrides the element's `completely` flag when it returns a
            // boolean; `undefined` means "fall back to the element flag".
            const completely = !!uncontrolledOnElement.completely;
            if (
                (tabster.checkUncontrolledCompletely?.(el, completely) ??
                    completely)
            ) {
                return el;
            }
        }

        el = getParent(el) as HTMLElement | null;
    } while (el);

    return undefined;
}

/**
 * Resolves the next tabbable element from `currentElement` within `ctx`.
 *
 * Mover/Groupper/Modalizer register dispatch via
 * `tabsterCore.findNextTabbableStrategies` from their `getX` factories;
 * without any of those features the array is absent and we fall through
 * to the default focusable walk.
 */
export function findNextTabbable(
    tabster: Types.TabsterCore,
    ctx: Types.TabsterContext,
    container?: HTMLElement,
    currentElement?: HTMLElement,
    referenceElement?: HTMLElement,
    isBackward?: boolean,
    ignoreAccessibility?: boolean
): Types.NextTabbable | null {
    const actualContainer = container || ctx.root.getElement();

    if (!actualContainer) {
        return null;
    }

    let next: Types.NextTabbable | null | undefined;

    const win = tabster.getWindow();

    _isTabbing = true;
    setTimer(
        _isTabbingTimer,
        win,
        () => {
            _isTabbing = false;
        },
        0
    );

    const strategies = tabster.findNextTabbableStrategies;
    if (strategies) {
        for (const strat of strategies) {
            next = strat(
                tabster,
                ctx,
                container,
                currentElement,
                referenceElement,
                isBackward,
                ignoreAccessibility
            );
            if (next !== undefined) {
                break;
            }
        }
    }

    if (next === undefined) {
        const findPropsOut: Types.FindFocusableOutputProps = {};

        const nextElement = _findFocusable(
            tabster,
            {
                container: actualContainer,
                currentElement,
                referenceElement,
                ignoreAccessibility,
                useActiveModalizer: true,
                isBackward,
            },
            findPropsOut
        );

        next = {
            element: nextElement,
            outOfDOMOrder: findPropsOut.outOfDOMOrder,
            uncontrolled: findPropsOut.uncontrolled,
        };
    }

    return next;
}

/**
 * Installs the Tab-key keydown handler on `getWindow()`. Returns a
 * dispose function that removes the listener. Called from
 * `getRootDummyInputs` when the consumer opts into root-dummy / Tab
 * behaviour.
 */
export function installTabKeyHandler(
    tabster: Types.TabsterCore,
    getWindow: Types.GetWindow
): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== Keys.Tab || event.ctrlKey) {
            return;
        }

        const currentElement = tabster.focusedElement.getFocusedElement();

        if (
            !currentElement ||
            !currentElement.ownerDocument ||
            currentElement.contentEditable === "true"
        ) {
            return;
        }

        const controlTab = tabster.controlTab;
        const ctx = getTabsterContext(tabster, currentElement);

        if (!ctx || ctx.ignoreKeydown(event)) {
            return;
        }

        const isBackward = event.shiftKey;

        const next = findNextTabbable(
            tabster,
            ctx,
            undefined,
            currentElement,
            undefined,
            isBackward,
            true
        );

        const rootElement = ctx.root.getElement();

        if (!rootElement) {
            return;
        }

        const nextElement = next?.element;
        const uncontrolledCompletelyContainer =
            getUncontrolledCompletelyContainer(tabster, currentElement);

        if (nextElement) {
            const nextUncontrolled = next.uncontrolled;

            if (
                ctx.uncontrolled ||
                dom.nodeContains(nextUncontrolled, currentElement)
            ) {
                if (
                    (!next.outOfDOMOrder &&
                        nextUncontrolled === ctx.uncontrolled) ||
                    (uncontrolledCompletelyContainer &&
                        !dom.nodeContains(
                            uncontrolledCompletelyContainer,
                            nextElement
                        ))
                ) {
                    // Nothing to do, everything will be done by the browser or something
                    // that controls the uncontrolled area.
                    return;
                }

                // We are in uncontrolled area. We allow whatever controls it to move
                // focus, but we add a phantom dummy to make sure the focus is moved
                // to the correct place if the uncontrolled area allows default action.
                // We only need that in the controlled mode, because in uncontrolled
                // mode we have dummy inputs around everything that redirects focus.
                DummyInputManager.addPhantomDummyWithTarget(
                    tabster,
                    currentElement,
                    isBackward,
                    nextElement
                );

                return;
            }

            if (
                (nextUncontrolled && _isElementVisible(nextUncontrolled)) ||
                (nextElement.tagName === "IFRAME" &&
                    _isElementVisible(nextElement))
            ) {
                // For iframes and uncontrolled areas we always want to use default action to
                // move focus into.
                if (
                    dispatchEvent(
                        rootElement,
                        new TabsterMoveFocusEvent({
                            by: "root",
                            owner: rootElement,
                            next: nextElement,
                            relatedEvent: event,
                        })
                    )
                ) {
                    DummyInputManager.moveWithPhantomDummy(
                        tabster,
                        nextUncontrolled ?? nextElement,
                        false,
                        isBackward,
                        event
                    );
                }

                return;
            }

            if (controlTab || next?.outOfDOMOrder) {
                if (
                    dispatchEvent(
                        rootElement,
                        new TabsterMoveFocusEvent({
                            by: "root",
                            owner: rootElement,
                            next: nextElement,
                            relatedEvent: event,
                        })
                    )
                ) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    nativeFocus(nextElement);
                }
            } else {
                // We are in uncontrolled mode and the next element is in DOM order.
                // Just allow the default action.
            }
        } else {
            if (
                !uncontrolledCompletelyContainer &&
                dispatchEvent(
                    rootElement,
                    new TabsterMoveFocusEvent({
                        by: "root",
                        owner: rootElement,
                        next: null,
                        relatedEvent: event,
                    })
                )
            ) {
                ctx.root.moveOutWithDefaultAction(isBackward, event);
            }
        }
    };

    const win = getWindow();
    addListener(win, "keydown", onKeyDown, true);

    return () => {
        removeListener(win, "keydown", onKeyDown, true);
    };
}
