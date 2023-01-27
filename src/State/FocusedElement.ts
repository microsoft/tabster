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
    triggerEvent,
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
    // private _modalAction: ((current: HTMLElement) => boolean) | undefined;

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

        this.subscribe(this._onChanged);
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

        this.unsubscribe(this._onChanged);

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

    getFirstOrLastTabbable(
        isFirst: boolean,
        props: Types.FindFirstProps
    ): HTMLElement | undefined {
        const tabsterFocusable = this._tabster.focusable;
        const container = props.container;
        let uncontrolled: HTMLElement | undefined;
        let toFocus: HTMLElement | null | undefined;

        if (container) {
            const ctx = RootAPI.getTabsterContext(this._tabster, container);

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
                            toFocus = tabsterFocusable[
                                isFirst ? "findFirst" : "findLast"
                            ]({
                                container: uncontrolled,
                                ignoreUncontrolled: true,
                                ignoreAccessibiliy: true,
                                useActiveModalizer: true,
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

        return toFocus || undefined;
    }

    private _focusFirstOrLast(
        isFirst: boolean,
        props: Types.FindFirstProps
    ): boolean {
        const toFocus = this.getFirstOrLastTabbable(isFirst, props);

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

            const ctx = RootAPI.getTabsterContext(this._tabster, element);

            const modalizerId = ctx?.modalizer?.userId;

            if (modalizerId) {
                details.modalizerId = modalizerId;
            }
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
            e.details.relatedTarget as HTMLElement | undefined,
            e.details.isFocusedProgrammatically
        );
    };

    private _onFocusOut = (e: FocusEvent): void => {
        this._setFocusedElement(
            undefined,
            e.relatedTarget as HTMLElement | undefined
        );
    };

    static findNextTabbable(
        tabster: Types.TabsterCore,
        ctx: Types.TabsterContext,
        container?: HTMLElement,
        currentElement?: HTMLElement,
        isBackward?: boolean,
        ignoreUncontrolled?: boolean
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

        const callFindNext = (
            what: Types.Groupper | Types.Mover | Types.Modalizer
        ) => {
            next = what.findNextTabbable(
                currentElement,
                isBackward,
                ignoreUncontrolled
            );
        };

        const modalizer = ctx.modalizer;
        const groupper = ctx.groupper;
        const mover = ctx.mover;

        if (groupper && mover) {
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

            callFindNext(isGroupperFirst ? groupper : mover);
        } else if (groupper) {
            callFindNext(groupper);
        } else if (mover) {
            callFindNext(mover);
        } else if (modalizer) {
            callFindNext(modalizer);
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
                      ignoreUncontrolled,
                      useActiveModalizer: true,
                  })
                : tabster.focusable.findNext({
                      container: actualContainer,
                      currentElement,
                      onUncontrolled,
                      ignoreUncontrolled,
                      useActiveModalizer: true,
                  });

            next = {
                element: uncontrolled ? undefined : nextElement,
                uncontrolled,
            };
        }

        const lastMoverOrGroupper = next?.lastMoverOrGroupper;
        const lastMoverOrGroupperElement = lastMoverOrGroupper?.getElement();

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
                            adjacentFrom =
                                getLastChild(adjacentFrom) || adjacentFrom;
                        }

                        next = FocusedElementState.findNextTabbable(
                            tabster,
                            adjacentCtx,
                            actualContainer,
                            adjacentFrom,
                            isBackward,
                            ignoreUncontrolled
                        );

                        if (next && !next.lastMoverOrGroupper) {
                            next.lastMoverOrGroupper = lastMoverOrGroupper;
                        }
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
        if (e.keyCode !== Keys.Tab || e.ctrlKey) {
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
        const ctx = RootAPI.getTabsterContext(tabster, currentElement);

        if (!ctx || ctx.ignoreKeydown(e)) {
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

        let nextElement: HTMLElement | null | undefined;

        if (next) {
            let uncontrolled = next.uncontrolled;

            if (uncontrolled) {
                const isGroupperFirst = ctx.isGroupperFirst;
                let moveOutside = false;

                if (isGroupperFirst !== undefined) {
                    const groupper = ctx.groupper?.getElement();
                    const mover = ctx.mover?.getElement();
                    let moveFrom: HTMLElement | undefined;

                    if (
                        isGroupperFirst &&
                        groupper &&
                        uncontrolled.contains(groupper)
                    ) {
                        moveFrom = groupper;
                    } else if (
                        !isGroupperFirst &&
                        mover &&
                        uncontrolled.contains(mover)
                    ) {
                        moveFrom = mover;
                    }

                    if (moveFrom) {
                        uncontrolled = moveFrom;
                        moveOutside = true;
                    }
                }

                if (uncontrolled && ctx.uncontrolled !== uncontrolled) {
                    // We have met an uncontrolled area, just allow default action.
                    DummyInputManager.moveWithPhantomDummy(
                        this._tabster,
                        uncontrolled,
                        moveOutside,
                        isBackward
                    );
                }

                return;
            }

            nextElement = next.element;
        }

        if (nextElement) {
            // For iframes just allow normal Tab behaviour
            if (!controlTab) {
                const lastMoverOrGroupper = next?.lastMoverOrGroupper;

                if (lastMoverOrGroupper) {
                    lastMoverOrGroupper.dummyManager?.moveOutWithDefaultAction(
                        isBackward
                    );
                } else if (ctx.modalizer) {
                    const nextElementCtx = RootAPI.getTabsterContext(
                        tabster,
                        nextElement
                    );

                    const preventDefault = () => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    };

                    if (
                        (!nextElementCtx ||
                            ctx.root.uid !== nextElementCtx.root.uid ||
                            !nextElementCtx.modalizer?.isActive()) &&
                        ctx.modalizer.triggerFocusEvent(
                            Types.ModalizerBeforeFocusOutEventName,
                            true
                        )
                    ) {
                        preventDefault();
                    } else if (
                        !ctx.modalizer.getElement()?.contains(nextElement)
                    ) {
                        preventDefault();
                        ctx.modalizer.dummyManager?.moveOut(isBackward);
                    }
                }
            } else if (nextElement.tagName !== "IFRAME") {
                e.preventDefault();
                e.stopImmediatePropagation();

                nativeFocus(nextElement);
            }
        } else {
            if (!controlTab) {
                // Ensuring there are no inaccessible focusables before moving out.
                // TODO: Remove this workaround once the TMP nested button is fixed.
                const container = ctx.root.getElement();

                if (container) {
                    const n = tabster.focusable.findElement({
                        container,
                        currentElement,
                        isBackward,
                        useActiveModalizer: true,
                        ignoreUncontrolled: true,
                        ignoreAccessibiliy: true,
                    });

                    if (n) {
                        const nctx = RootAPI.getTabsterContext(tabster, n);

                        if (!nctx || (!nctx.groupper && !nctx.mover)) {
                            return;
                        }
                    }
                }
            }

            ctx.root.moveOutWithDefaultAction(isBackward);
        }
    };

    _onChanged = (
        element: HTMLElement | undefined,
        details: Types.FocusedElementDetails
    ): void => {
        if (element) {
            triggerEvent(element, Types.FocusInEventName, details);
        } else {
            const last = this._lastVal?.get();

            if (last) {
                const d = { ...details };
                const lastCtx = RootAPI.getTabsterContext(this._tabster, last);
                const modalizerId = lastCtx?.modalizer?.userId;

                if (modalizerId) {
                    d.modalizerId = modalizerId;
                }

                triggerEvent(last, Types.FocusOutEventName, d);
            }
        }
    };
}
