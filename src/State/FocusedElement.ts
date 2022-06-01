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
    DummyInput,
    getLastChild,
    shouldIgnoreFocus,
    WeakHTMLElement,
} from "../Utils";
import { Subscribable } from "./Subscribable";

export class FocusedElementState
    extends Subscribable<HTMLElement | undefined, Types.FocusedElementDetails>
    implements Types.FocusedElementState
{
    private static _lastResetElement: WeakHTMLElement | undefined;

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

    focusFirst(props: Types.FindFirstProps): boolean {
        const container = props.container;
        let toFocus: HTMLElement | null | undefined;

        if (container) {
            const ctx = RootAPI.getTabsterContext(this._tabster, container, {
                checkRtl: true,
            });

            if (ctx) {
                const next = FocusedElementState.findNextTabbable(
                    this._tabster,
                    ctx,
                    container
                );

                if (next && !next.uncontrolled) {
                    toFocus = next.element;
                }
            }
        }

        if (!toFocus) {
            toFocus = this._tabster.focusable.findFirst(props);

            if (!toFocus) {
                toFocus = this._tabster.focusable.findFirst({
                    ...props,
                    ignoreUncontrolled: true,
                    ignoreAccessibiliy: true,
                });
            }
        }

        if (toFocus) {
            this.focus(toFocus, false, true);

            return true;
        }

        return false;
    }

    focusLast(props: Types.FindFirstProps): boolean {
        const container = props.container;
        let toFocus: HTMLElement | null | undefined;

        if (container) {
            const ctx = RootAPI.getTabsterContext(this._tabster, container, {
                checkRtl: true,
            });

            if (ctx) {
                const next = FocusedElementState.findNextTabbable(
                    this._tabster,
                    ctx,
                    getLastChild(container),
                    true
                );

                if (next && !next.uncontrolled) {
                    toFocus = next.element;
                }
            }
        }

        if (!toFocus) {
            toFocus = this._tabster.focusable.findLast(props);

            if (!toFocus) {
                toFocus = this._tabster.focusable.findLast({
                    ...props,
                    ignoreUncontrolled: true,
                    ignoreAccessibiliy: true,
                });
            }
        }

        if (toFocus) {
            this.focus(toFocus, false, true);

            return true;
        }

        return false;
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
            (e.details.relatedTarget as HTMLElement) || undefined,
            e.details.isFocusedProgrammatically
        );
    };

    private _onFocusOut = (e: FocusEvent): void => {
        this._setFocusedElement(
            undefined,
            (e.relatedTarget as HTMLElement) || undefined
        );
    };

    static findNextTabbable(
        tabster: Types.TabsterCore,
        ctx: Types.TabsterContext,
        from: HTMLElement | null,
        prev?: boolean
    ): Types.NextTabbable | null {
        let next: Types.NextTabbable | null = null;

        let current: HTMLElement;

        if (from) {
            current = from;
        } else {
            const container = ctx.root.getElement();

            if (container) {
                current = getLastChild(container) || container;
            } else {
                return null;
            }
        }

        const callFindNext = (what: Types.Groupper | Types.Mover) => {
            next = what.findNextTabbable(current, prev);
        };

        if (ctx.groupper && ctx.mover) {
            let isGroupperFirst = ctx.isGroupperFirst;

            if (isGroupperFirst) {
                const fromCtx = RootAPI.getTabsterContext(tabster, current);

                if (fromCtx?.groupper !== ctx.groupper) {
                    isGroupperFirst = false;
                }
            }

            if (isGroupperFirst) {
                callFindNext(ctx.groupper);

                if (next === null) {
                    callFindNext(ctx.mover);
                }
            } else {
                callFindNext(ctx.mover);

                if (next === null) {
                    callFindNext(ctx.groupper);
                }
            }
        } else if (ctx.groupper) {
            callFindNext(ctx.groupper);
        } else if (ctx.mover) {
            callFindNext(ctx.mover);
        } else {
            let uncontrolled: HTMLElement | undefined;
            const onUncontrolled = (el: HTMLElement) => {
                uncontrolled = el;
            };
            const nextElement = prev
                ? tabster.focusable.findPrev({
                      currentElement: current,
                      onUncontrolled,
                  })
                : tabster.focusable.findNext({
                      currentElement: current,
                      onUncontrolled,
                  });
            next = { element: nextElement, uncontrolled };
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

        const curElement = this.getVal();

        if (
            !curElement ||
            !curElement.ownerDocument ||
            curElement.contentEditable === "true"
        ) {
            return;
        }

        const controlTab = this._tabster.controlTab;
        const ctx = RootAPI.getTabsterContext(this._tabster, curElement, {
            checkRtl: true,
        });

        if (!ctx || (!controlTab && !ctx.mover && !ctx.groupper)) {
            return;
        }

        const isPrev = e.shiftKey;
        const next = FocusedElementState.findNextTabbable(
            this._tabster,
            ctx,
            curElement,
            isPrev
        );

        if (!next || (!controlTab && !next.element)) {
            if (!controlTab) {
                if (ctx.mover && (!ctx.groupper || ctx.isGroupperFirst)) {
                    ctx.mover.dummyManager?.moveOutWithDefaultAction(isPrev);
                } else if (ctx.groupper) {
                    ctx.groupper.dummyManager?.moveOutWithDefaultAction(isPrev);
                }
            }

            return;
        }

        const uncontrolled = next.uncontrolled;

        if (uncontrolled) {
            if (ctx.uncontrolled !== uncontrolled) {
                // We have met an uncontrolled area, just allow default action.
                this._moveToUncontrolled(uncontrolled, isPrev);
            }

            return;
        }

        let nextElement = next.element;

        if (ctx.modalizer) {
            const nextElementCtx =
                nextElement &&
                RootAPI.getTabsterContext(this._tabster, nextElement);

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
                const findFn = isPrev ? "findLast" : "findFirst";
                nextElement = this._tabster.focusable[findFn]({
                    container: ctx.modalizer.getElement(),
                });
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
            ctx.root.moveOutWithDefaultAction(isPrev);
        }
    };

    private _moveToUncontrolled(
        uncontrolled: HTMLElement,
        isPrev: boolean
    ): void {
        const dummy: DummyInput = new DummyInput(this._win, {
            isPhantom: true,
            isFirst: true,
        });
        const input = dummy.input;

        if (input) {
            const parent = uncontrolled.parentElement;

            if (parent) {
                parent.insertBefore(
                    input,
                    isPrev ? uncontrolled.nextElementSibling : uncontrolled
                );
                nativeFocus(input);
            }
        }
    }
}
