/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { KeyborgFocusInEvent, KEYBORG_FOCUSIN, nativeFocus } from "keyborg";

import { Keys } from "../Keys";
import { RootAPI } from "../Root";
import * as Types from "../Types";
import {
    documentContains,
    DummyInputManager,
    getLastChild,
    getAdjacentElement,
    shouldIgnoreFocus,
    WeakHTMLElement,
} from "../Utils";
import { Subscribable } from "./Subscribable";

export class FocusedElementState
    extends Subscribable<HTMLElement | undefined, Types.FocusedElementDetails>
    implements Types.FocusedElementState
{
    private static _lastResetElement: WeakHTMLElement | undefined;
    private static _isTabbingTimer: number | undefined;
    static isTabbing = false;

    private _tabster: Types.TabsterCore;
    private _initTimer: number | undefined;
    private _win: Types.GetWindow;
    private _nextVal:
        | {
              element: WeakHTMLElement | undefined;
              details: Types.FocusedElementDetails;
          }
        | undefined;
    private _lastVal: WeakHTMLElement | undefined;

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        super();

        this._tabster = tabster;
        this._win = getWindow;
        this._initTimer = getWindow().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        const win = this._win();

        // Add these event listeners as capture - we want Tabster to run before user event handlers
        win.document.addEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true);
        win.document.addEventListener("focusout", this._onFocusOut, true);
        win.addEventListener("keydown", this._onKeyDown, true);
    };

    dispose(): void {
        super.dispose();

        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.document.removeEventListener(
            KEYBORG_FOCUSIN,
            this._onFocusIn,
            true
        );
        win.document.removeEventListener("focusout", this._onFocusOut, true);
        win.removeEventListener("keydown", this._onKeyDown, true);

        delete FocusedElementState._lastResetElement;

        delete this._nextVal;
        delete this._lastVal;
    }

    static forgetMemorized(
        instance: Types.FocusedElementState,
        parent: HTMLElement
    ): void {
        let wel = FocusedElementState._lastResetElement;
        let el = wel && wel.get();
        if (el && parent.contains(el)) {
            delete FocusedElementState._lastResetElement;
        }

        el = (instance as FocusedElementState)._nextVal?.element?.get();
        if (el && parent.contains(el)) {
            delete (instance as FocusedElementState)._nextVal;
        }

        wel = (instance as FocusedElementState)._lastVal;
        el = wel && wel.get();
        if (el && parent.contains(el)) {
            delete (instance as FocusedElementState)._lastVal;
        }
    }

    getFocusedElement(): HTMLElement | undefined {
        return this.getVal();
    }

    getLastFocusedElement(): HTMLElement | undefined {
        let el = this._lastVal?.get();

        if (!el || (el && !documentContains(el.ownerDocument, el))) {
            this._lastVal = el = undefined;
        }

        return el;
    }

    focus(
        element: HTMLElement,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): boolean {
        if (
            !this._tabster.focusable.isFocusable(
                element,
                noFocusedProgrammaticallyFlag,
                false,
                noAccessibleCheck
            )
        ) {
            return false;
        }

        element.focus();

        return true;
    }

    focusDefault(container: HTMLElement): boolean {
        const el = this._tabster.focusable.findDefault({ container });

        if (el) {
            this._tabster.focusedElement.focus(el);

            return true;
        }

        return false;
    }

    private _focusFirstOrLast(isFirst: boolean, props: Types.FindFirstProps): boolean {
        const tabsterFocusable = this._tabster.focusable;
        const container = props.container;
        let uncontrolled: HTMLElement | undefined;
        let toFocus: HTMLElement | null | undefined;

        if (container) {
            const ctx = RootAPI.getTabsterContext(this._tabster, container, {
                checkRtl: true,
            });

            if (ctx) {
                let next = FocusedElementState.findNextTabbable(
                    this._tabster,
                    ctx,
                    container,
                    undefined,
                    !isFirst
                );

                if (next) {
                    toFocus = next.element;
                    uncontrolled = next.uncontrolled;

                    while (!toFocus && uncontrolled) {
                        if (
                            tabsterFocusable.isFocusable(
                                uncontrolled,
                                false,
                                true,
                                true
                            )
                        ) {
                            toFocus = uncontrolled;
                        } else {
                            toFocus = tabsterFocusable[isFirst ? 'findFirst' : 'findLast']({
                                container: uncontrolled,
                                ignoreUncontrolled: true,
                                ignoreAccessibiliy: true,
                            });
                        }

                        if (!toFocus) {
                            next = FocusedElementState.findNextTabbable(
                                this._tabster,
                                ctx,
                                uncontrolled,
                                undefined,
                                !isFirst
                            );

                            if (next) {
                                toFocus = next.element;
                                uncontrolled = next.uncontrolled;
                            }
                        }
                    }
                }
            }
        }

        if (toFocus && !container?.contains(toFocus)) {
            toFocus = undefined;
        }

        if (toFocus) {
            this.focus(toFocus, false, true);

            return true;
        }

        return false;
    }

    focusFirst(props: Types.FindFirstProps): boolean {
        return this._focusFirstOrLast(true, props);
    }

    focusLast(props: Types.FindFirstProps): boolean {
        return this._focusFirstOrLast(false, props);
    }

    resetFocus(container: HTMLElement): boolean {
        if (!this._tabster.focusable.isVisible(container)) {
            return false;
        }

        if (!this._tabster.focusable.isFocusable(container, true, true, true)) {
            const prevTabIndex = container.getAttribute("tabindex");
            const prevAriaHidden = container.getAttribute("aria-hidden");

            container.tabIndex = -1;
            container.setAttribute("aria-hidden", "true");

            FocusedElementState._lastResetElement = new WeakHTMLElement(
                this._win,
                container
            );

            this.focus(container, true, true);

            this._setOrRemoveAttribute(container, "tabindex", prevTabIndex);
            this._setOrRemoveAttribute(
                container,
                "aria-hidden",
                prevAriaHidden
            );
        } else {
            this.focus(container);
        }

        return true;
    }

    private _setOrRemoveAttribute(
        element: HTMLElement,
        name: string,
        value: string | null
    ): void {
        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    }

    private _setFocusedElement(
        element?: HTMLElement,
        relatedTarget?: HTMLElement,
        isFocusedProgrammatically?: boolean
    ): void {
        if (this._tabster._noop) {
            return;
        }

        const details: Types.FocusedElementDetails = { relatedTarget };

        if (element) {
            const lastResetElement =
                FocusedElementState._lastResetElement?.get();
            FocusedElementState._lastResetElement = undefined;

            if (lastResetElement === element || shouldIgnoreFocus(element)) {
                return;
            }

            details.isFocusedProgrammatically = isFocusedProgrammatically;
        }

        const nextVal = (this._nextVal = {
            element: element
                ? new WeakHTMLElement(this._win, element)
                : undefined,
            details,
        });

        if (element && element !== this._val) {
            this._validateFocusedElement(element);
        }

        // _validateFocusedElement() might cause the refocus which will trigger
        // another call to this function. Making sure that the value is correct.
        if (this._nextVal === nextVal) {
            this.setVal(element, details);
        }

        this._nextVal = undefined;
    }

    protected setVal(
        val: HTMLElement | undefined,
        details: Types.FocusedElementDetails
    ): void {
        super.setVal(val, details);

        if (val) {
            this._lastVal = new WeakHTMLElement(this._win, val);
        }
    }

    private _onFocusIn = (e: KeyborgFocusInEvent): void => {
        this._setFocusedElement(
            e.target as HTMLElement,
            (e.details.relatedTarget as (HTMLElement | undefined)),
            e.details.isFocusedProgrammatically
        );
    };

    private _onFocusOut = (e: FocusEvent): void => {
        this._setFocusedElement(
            undefined,
            (e.relatedTarget as (HTMLElement | undefined))
        );
    };

    static findNextTabbable(
        tabster: Types.TabsterCore,
        ctx: Types.TabsterContext,
        container?: HTMLElement,
        currentElement?: HTMLElement,
        isBackward?: boolean
    ): Types.NextTabbable | null {
        const actualContainer = container || ctx.root.getElement();

        if (!actualContainer) {
            return null;
        }

        let next: Types.NextTabbable | null = null;

        const isTabbingTimer = FocusedElementState._isTabbingTimer;
        const win = tabster.getWindow();

        if (isTabbingTimer) {
            win.clearTimeout(isTabbingTimer);
        }

        FocusedElementState.isTabbing = true;
        FocusedElementState._isTabbingTimer = win.setTimeout(() => {
            delete FocusedElementState._isTabbingTimer;
            FocusedElementState.isTabbing = false;
        }, 0);

        const callFindNext = (what: Types.Groupper | Types.Mover) => {
            next = what.findNextTabbable(currentElement, isBackward);
        };

        if (ctx.groupper && ctx.mover) {
            let isGroupperFirst = ctx.isGroupperFirst;

            if (isGroupperFirst && currentElement) {
                const fromCtx = RootAPI.getTabsterContext(
                    tabster,
                    currentElement
                );

                if (fromCtx?.groupper !== ctx.groupper) {
                    isGroupperFirst = false;
                }
            }

            callFindNext(isGroupperFirst ? ctx.groupper : ctx.mover);
        } else if (ctx.groupper) {
            callFindNext(ctx.groupper);
        } else if (ctx.mover) {
            callFindNext(ctx.mover);
        } else {
            let uncontrolled: HTMLElement | undefined;
            const onUncontrolled = (el: HTMLElement) => {
                uncontrolled = el;
            };
            const nextElement = isBackward
                ? tabster.focusable.findPrev({
                      container: actualContainer,
                      currentElement,
                      onUncontrolled,
                  })
                : tabster.focusable.findNext({
                      container: actualContainer,
                      currentElement,
                      onUncontrolled,
                  });

            next = { element: uncontrolled ? undefined : nextElement, uncontrolled };
        }

        const lastMoverOrGroupperElement =
            next?.lastMoverOrGroupper?.getElement();

        if (lastMoverOrGroupperElement) {
            next = null;

            const adjacentElement = getAdjacentElement(
                lastMoverOrGroupperElement,
                isBackward
            );

            if (adjacentElement) {
                const adjacentCtx = RootAPI.getTabsterContext(
                    tabster,
                    adjacentElement,
                    {
                        checkRtl: true,
                    }
                );

                if (adjacentCtx) {
                    let adjacentFrom = getAdjacentElement(
                        adjacentElement,
                        !isBackward
                    );

                    if (adjacentFrom) {
                        if (!isBackward) {
                            adjacentFrom = getLastChild(adjacentFrom);
                        }

                        next = FocusedElementState.findNextTabbable(
                            tabster,
                            adjacentCtx,
                            actualContainer,
                            adjacentFrom,
                            isBackward
                        );
                    }
                }
            }
        }

        return next;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _validateFocusedElement = (element: HTMLElement): void => {
        // TODO: Make sure this is not needed anymore and write tests.
    };

    private _onKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode !== Keys.Tab) {
            return;
        }

        const currentElement = this.getVal();

        if (
            !currentElement ||
            !currentElement.ownerDocument ||
            currentElement.contentEditable === "true"
        ) {
            return;
        }

        const tabster = this._tabster;
        const controlTab = tabster.controlTab;
        const ctx = RootAPI.getTabsterContext(tabster, currentElement, {
            checkRtl: true,
        });

        if (
            !ctx ||
            (!controlTab && !ctx.groupper && !ctx.mover) ||
            ctx.ignoreKeydown[e.key as "Tab"]
        ) {
            return;
        }

        const isBackward = e.shiftKey;

        const next = FocusedElementState.findNextTabbable(
            tabster,
            ctx,
            undefined,
            currentElement,
            isBackward
        );

        if (!next || (!controlTab && !next.element)) {
            if (!controlTab) {
                const lastMoverOrGroupper = next?.lastMoverOrGroupper;

                if (lastMoverOrGroupper) {
                    lastMoverOrGroupper.dummyManager?.moveOutWithDefaultAction(
                        isBackward
                    );

                    return;
                }
            }
        }

        let nextElement: HTMLElement | null | undefined;

        if (next) {
            const uncontrolled = next.uncontrolled;

            if (uncontrolled) {
                if (ctx.uncontrolled !== uncontrolled) {
                    // We have met an uncontrolled area, just allow default action.
                    DummyInputManager.moveWithPhantomDummy(
                        this._tabster,
                        uncontrolled,
                        false,
                        isBackward
                    );
                }

                return;
            }

            nextElement = next.element;

            if (ctx.modalizer) {
                const nextElementCtx =
                    nextElement &&
                    RootAPI.getTabsterContext(tabster, nextElement);

                if (
                    !nextElementCtx ||
                    ctx.root.uid !== nextElementCtx.root.uid ||
                    !nextElementCtx.modalizer?.isActive()
                ) {
                    if (ctx.modalizer.onBeforeFocusOut()) {
                        e.preventDefault();

                        return;
                    }
                }

                // circular focus trap for modalizer
                if (
                    !nextElement &&
                    ctx.modalizer.isActive() &&
                    ctx.modalizer.getProps().isTrapped
                ) {
                    const findFn = isBackward ? "findLast" : "findFirst";
                    nextElement = tabster.focusable[findFn]({
                        container: ctx.modalizer.getElement(),
                    });
                }
            }
        }

        if (nextElement) {
            // For iframes just allow normal Tab behaviour
            if (nextElement.tagName !== "IFRAME") {
                e.preventDefault();
                e.stopImmediatePropagation();

                nativeFocus(nextElement);
            }
        } else {
            ctx.root.moveOutWithDefaultAction(isBackward);
        }
    };
}
