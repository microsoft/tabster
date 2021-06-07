/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Keys } from '../Keys';
import { RootAPI } from '../Root';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';
import {
    callOriginalFocusOnly,
    CustomFocusFunctionWithOriginal,
    documentContains,
    shouldIgnoreFocus,
    WeakHTMLElement
} from '../Utils';

interface WindowWithHTMLElement extends Window {
    HTMLElement: typeof HTMLElement;
}

function canOverrideNativeFocus(win: Window): boolean {
    const HTMLElement = (win as WindowWithHTMLElement).HTMLElement;
    const origFocus = HTMLElement.prototype.focus;

    let isCustomFocusCalled = false;

    HTMLElement.prototype.focus = function focus(): void {
        isCustomFocusCalled = true;
    };

    const btn = win.document.createElement('button');

    btn.focus();

    HTMLElement.prototype.focus = origFocus;

    return isCustomFocusCalled;
}

export class FocusedElementState
        extends Subscribable<HTMLElement | undefined, Types.FocusedElementDetails> implements Types.FocusedElementState {

    private static _lastFocusedProgrammatically: WeakHTMLElement | undefined;
    private static _lastResetElement: WeakHTMLElement | undefined;

    private _tabster: Types.TabsterCore;
    private _initTimer: number | undefined;
    private _canOverrideNativeFocus = false;
    private _win: Types.GetWindow;
    private _nextVal: { element: WeakHTMLElement | undefined, details: Types.FocusedElementDetails } | undefined;
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

        this._canOverrideNativeFocus = canOverrideNativeFocus(win);

        FocusedElementState.replaceFocus(this._win);

        // Add these event listeners as capture - we want Tabster to run before user event handlers
        win.document.addEventListener('focusin', this._onFocusIn, true);
        win.document.addEventListener('focusout', this._onFocusOut, true);
        win.addEventListener('keydown', this._onKeyDown, true);
    }

    protected dispose(): void {
        super.dispose();

        const win = this._win();

        FocusedElementState.restoreFocus(win);

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.document.removeEventListener('focusin', this._onFocusIn, true);
        win.document.removeEventListener('focusout', this._onFocusOut, true);
        win.removeEventListener('keydown', this._onKeyDown, true);

        delete FocusedElementState._lastFocusedProgrammatically;
        delete FocusedElementState._lastResetElement;

        delete this._nextVal;
        delete this._lastVal;
    }

    static dispose(instance: Types.FocusedElementState): void {
        (instance as FocusedElementState).dispose();
    }

    static forgetMemorized(instance: Types.FocusedElementState, parent: HTMLElement): void {
        let wel = FocusedElementState._lastFocusedProgrammatically;
        let el = wel && wel.get();
        if (el && parent.contains(el)) {
            delete FocusedElementState._lastFocusedProgrammatically;
        }

        wel = FocusedElementState._lastResetElement;
        el = wel && wel.get();
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

    focus(element: HTMLElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): boolean {
        if (!this._tabster.focusable.isFocusable(element, noFocusedProgrammaticallyFlag, false, noAccessibleCheck)) {
            return false;
        }

        FocusedElementState._lastFocusedProgrammatically = new WeakHTMLElement(this._win, element);

        element.focus();

        return true;
    }

    focusDefault(container: HTMLElement): boolean {
        const el = this._tabster.focusable.findDefault(container);

        if (el) {
            this._tabster.focusedElement.focus(el);

            return true;
        }

        return false;
    }

    focusFirst(container: HTMLElement): boolean {
        const first = this._tabster.focusable.findFirst(container, false, true);

        if (first) {
            this.focus(first);

            return true;
        }

        return false;
    }

    resetFocus(container: HTMLElement): boolean {
        if (!this._tabster.focusable.isVisible(container)) {
            return false;
        }

        if (!this._tabster.focusable.isFocusable(container, true, true, true)) {
            const prevTabIndex = container.getAttribute('tabindex');
            const prevAriaHidden = container.getAttribute('aria-hidden');

            container.tabIndex = -1;
            container.setAttribute('aria-hidden', 'true');

            FocusedElementState._lastResetElement = new WeakHTMLElement(this._win, container);

            this.focus(container, true, true);

            this._setOrRemoveAttribute(container, 'tabindex', prevTabIndex);
            this._setOrRemoveAttribute(container, 'aria-hidden', prevAriaHidden);
        } else {
            this.focus(container);
        }

        return true;
    }

    private _setOrRemoveAttribute(element: HTMLElement, name: string, value: string | null): void {
        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    }

    private _setFocusedElement(element?: HTMLElement, relatedTarget?: HTMLElement): void {
        const details: Types.FocusedElementDetails = { relatedTarget };

        if (element) {
            const lastResetElement = FocusedElementState._lastResetElement?.get();
            FocusedElementState._lastResetElement = undefined;

            if ((lastResetElement === element) || shouldIgnoreFocus(element)) {
                return;
            }

            if (this._canOverrideNativeFocus || FocusedElementState._lastFocusedProgrammatically) {
                details.isFocusedProgrammatically = (element === FocusedElementState._lastFocusedProgrammatically?.get());

                FocusedElementState._lastFocusedProgrammatically = undefined;
            }
        }

        const nextVal = this._nextVal = { element: element ? new WeakHTMLElement(this._win, element) : undefined, details };

        if (element && (element !== this._val)) {
            this._validateFocusedElement(element, details);
        }

        // _validateFocusedElement() might cause the refocus which will trigger
        // another call to this function. Making sure that the value is correct.
        if (this._nextVal === nextVal) {
            this.setVal(element, details);
        }

        this._nextVal = undefined;
    }

    protected setVal(val: HTMLElement | undefined, details: Types.FocusedElementDetails): void {
        super.setVal(val, details);

        if (val) {
            this._lastVal = new WeakHTMLElement(this._win, val);
        }
    }

    private _onFocusIn = (e: FocusEvent): void => {
        this._setFocusedElement(e.target as HTMLElement, (e.relatedTarget as HTMLElement) || undefined);
    }

    private _onFocusOut = (e: FocusEvent): void => {
        this._setFocusedElement(undefined, (e.relatedTarget as HTMLElement) || undefined);
    }

    static replaceFocus(getWindow: Types.GetWindow): void {
        const win = getWindow();
        const origFocus = (win as WindowWithHTMLElement).HTMLElement.prototype.focus;

        if ((origFocus as CustomFocusFunctionWithOriginal).__tabsterFocus) {
            // Already set up.
            return;
        }

        (win as WindowWithHTMLElement).HTMLElement.prototype.focus = focus;

        function focus(this: HTMLElement) {
            FocusedElementState._lastFocusedProgrammatically = new WeakHTMLElement(getWindow, this);
            return origFocus.apply(this, arguments);
        }

        (focus as CustomFocusFunctionWithOriginal).__tabsterFocus = origFocus;
    }

    static restoreFocus(win: Window): void {
        const proto = (win as WindowWithHTMLElement).HTMLElement.prototype;
        const origFocus = (proto.focus as CustomFocusFunctionWithOriginal).__tabsterFocus;

        if (origFocus) {
            proto.focus = origFocus;
        }
    }

    static findNext(
        tabster: Types.TabsterCore,
        ctx: Types.TabsterContext,
        current: HTMLElement,
        prev?: boolean
    ): Types.NextTabbable | null {
        let next: Types.NextTabbable | null | undefined;

        if (ctx.groupper && ctx.mover) {
            if (ctx.isGroupperFirst) {
                next = ctx.groupper.findNextTabbable(current, prev);

                if (!next) {
                    next = ctx.mover.findNextTabbable(current, prev);
                }
            } else {
                next = ctx.mover.findNextTabbable(current, prev);

                if (!next) {
                    next = ctx.groupper.findNextTabbable(current, prev);
                }
            }
        } else if (ctx.groupper) {
            next = ctx.groupper.findNextTabbable(current, prev);
        } else if (ctx.mover) {
            next = ctx.mover.findNextTabbable(current, prev);
        } else {
            const element = prev
                ? tabster.focusable.findPrev(current)
                : tabster.focusable.findNext(current);

            if (element) {
                next = { element };
            }
        }

        return next || null;
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode !== Keys.Tab) {
            return;
        }

        let curElement = this.getVal();

        if (!curElement || !curElement.ownerDocument) {
            return;
        }

        const ctx = RootAPI.getTabsterContext(this._tabster, curElement, { checkRtl: true });

        if (!ctx) {
            return;
        }

        if (ctx.modalizer) {
            const curModalizerId = ctx.root.getCurrentModalizerId();

            if (curModalizerId && (curModalizerId !== ctx.modalizer.userId)) {
                ctx.modalizer = ctx.root.getModalizerById(curModalizerId);

                if (ctx.modalizer) {
                    curElement = ctx.modalizer.getElement();

                    if (!curElement) {
                        return;
                    }
                }
            }
        }

        const isPrev = e.shiftKey;
        const next = FocusedElementState.findNext(this._tabster, ctx, curElement, isPrev);

        if (ctx.modalizer) {
            const nctx = next && RootAPI.getTabsterContext(this._tabster, next.element);

            if (
                !nctx ||
                (ctx.root.uid !== nctx.root.uid) ||
                !nctx.modalizer ||
                (nctx.root.getCurrentModalizerId() !== nctx.modalizer.userId)
            ) {
                if (ctx.modalizer.onBeforeFocusOut()) {
                    e.preventDefault();

                    return;
                }
            }
        }

        if (next) {
            e.preventDefault();

            if (next.callback) {
                next.callback();
            }

            callOriginalFocusOnly(next.element);
        } else {
            ctx.root.moveOutWithDefaultAction(isPrev);
        }
    }

    private _validateFocusedElement = (element: HTMLElement, details: Types.FocusedElementDetails): void => {
        const ctx = RootAPI.getTabsterContext(this._tabster, element);
        const curModalizerId = ctx ? ctx.root.getCurrentModalizerId() : undefined;

        if (!ctx || !ctx.modalizer) {
            return;
        }

        let eModalizer = ctx.modalizer;

        if (curModalizerId === eModalizer.userId) {
            return;
        }

        if ((curModalizerId === undefined) || details.isFocusedProgrammatically) {
            ctx.root.setCurrentModalizerId(eModalizer.userId);

            return;
        }

        if (eModalizer && element.ownerDocument) {
            let toFocus = this._tabster.focusable.findFirst(ctx.root.getElement());

            if (toFocus) {
                if (element.compareDocumentPosition(toFocus) & document.DOCUMENT_POSITION_PRECEDING) {
                    toFocus = this._tabster.focusable.findLast(element.ownerDocument.body);

                    if (!toFocus) {
                        // This only might mean that findFirst/findLast are buggy and inconsistent.
                        throw new Error('Something went wrong.');
                    }
                }

                this._tabster.focusedElement.focus(toFocus);
            } else {
                // Current Modalizer doesn't seem to have focusable elements.
                // Blurring the currently focused element which is outside of the current Modalizer.
                element.blur();
            }
        }
    }
}
