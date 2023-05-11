/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";
import { matchesSelector, getAdjacentElement } from "./Utils";
import { Keys } from "./Keys";
import { FocusedElementState } from "./State/FocusedElement";

interface MoverNextForProps extends Types.MoverProps {
    /**
     * A [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).
     * If the currently focused element matches this selector, and the arrow key press
     * would perform no action inside that element, the focus will be moved to the Mover
     * the same way as if you would Tab or Shift+Tab inside the Mover from outside.
     * Meaning that props like memorizeCurrent and hasDefault will be taken into
     * consideration.
     */
    nextFor?: string;
}

export interface ExtensionProps_MoverNextFor {
    mover?: MoverNextForProps;
}

export class MoverNextFor extends Types.TabsterPartExtension<
    Types.MoverAPI,
    Types.Mover,
    Types.MoverAPIEvents
> {
    private _moversFor: Record<string, Set<Types.Mover>> = {};
    private _moversMap: Map<Types.Mover, string> = new Map();

    onEvent(
        name: keyof Types.MoverAPIEvents,
        details: Types.MoverAPIEvents[typeof name],
        api: Types.MoverAPI,
        tabster: Types.TabsterCore,
        win: Types.GetWindow
    ): void {
        if (name === "noaction") {
            const focused = tabster.focusedElement.getFocusedElement();
            const keyCode = (details as Types.MoverAPIEvents["noaction"])
                .keyCode;

            this._focusMoverFor(win, focused, keyCode);
        }
    }

    dispose(): void {
        this._moversFor = {};
        this._moversMap.clear();
    }

    instanceCreated(mover: Types.Mover): void {
        const nextFor = (mover.getProps() as MoverNextForProps).nextFor;

        if (nextFor) {
            let moversFor = this._moversFor[nextFor];

            if (!moversFor) {
                moversFor = this._moversFor[nextFor] = new Set();
            }

            moversFor.add(mover);
            this._moversMap.set(mover, nextFor);
        }
    }

    instanceDispose(mover: Types.Mover): void {
        const nextFor = this._moversMap.get(mover);
        const moversFor = nextFor && this._moversFor[nextFor];

        if (moversFor) {
            moversFor.delete(mover);

            if (moversFor.size === 0) {
                delete this._moversFor[nextFor];
            }
        }

        this._moversMap.delete(mover);
    }

    private _focusMoverFor(
        win: Types.GetWindow,
        focusedElement: HTMLElement | undefined,
        keyCode: number
    ): void {
        // Mover's nextFor property allows a Mover to gain focus when
        // the arrow keys are pressed when the focus is currently not
        // inside any Mover. Here we find if there is a Mover with
        // nextFor matching the currently focused element and focus it (if there is).
        const moversFor = this._moversFor;
        const allMoversFor: { element: HTMLElement; mover?: Types.Mover }[] =
            [];
        const focusedElementOrBody = focusedElement || win().document.body;

        for (const nextFor of Object.keys(moversFor)) {
            if (matchesSelector(focusedElementOrBody, nextFor)) {
                for (const mover of moversFor[nextFor]) {
                    const element = mover.getElement();

                    if (element) {
                        allMoversFor.push({ element, mover });
                    }
                }
            }
        }

        if (allMoversFor.length > 0) {
            allMoversFor.push({ element: focusedElementOrBody });

            // Sort by DOM position to find the closest Mover when there are
            // multiple matching Movers.
            allMoversFor.sort((a, b) => {
                return a.element.compareDocumentPosition(b.element) &
                    Node.DOCUMENT_POSITION_FOLLOWING
                    ? -1
                    : 1;
            });

            const isBackward =
                keyCode === Keys.Up ||
                keyCode === Keys.Left ||
                keyCode === Keys.PageUp ||
                keyCode === Keys.Home;

            const focusedElementIndex = allMoversFor.findIndex(
                (a) => a.element === focusedElementOrBody
            );

            let moverToFocusIndex = isBackward
                ? focusedElementIndex - 1
                : focusedElementIndex + 1;

            if (moverToFocusIndex < 0) {
                // No Mover before the focused element, so focus the next one.
                moverToFocusIndex = 1;
            } else if (moverToFocusIndex >= allMoversFor.length) {
                // No Mover after the focused element, so focus the previous one.
                moverToFocusIndex = allMoversFor.length - 2;
            }

            const moverToFocus = allMoversFor[moverToFocusIndex]?.mover;

            if (moverToFocus) {
                const moverToFocusElement = moverToFocus.getElement();

                if (moverToFocusElement) {
                    const fromElement = getAdjacentElement(
                        moverToFocusElement,
                        !isBackward
                    );

                    FocusedElementState.isTabbing = true;
                    const next = moverToFocus.findNextTabbable(
                        fromElement,
                        isBackward
                    );
                    FocusedElementState.isTabbing = false;

                    next?.element?.focus();
                }
            }
        }
    }
}
