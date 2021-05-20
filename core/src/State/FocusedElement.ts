/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { callOriginalFocusOnly, KeyborgFocusInEvent, KEYBORG_FOCUSIN } from 'keyborg';

import { KeyboardNavigationState } from './KeyboardNavigation';
import { Key, Keys } from '../Keys';
import { RootAPI } from '../Root';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';
import {
    documentContains,
    isElementVerticallyVisibleInContainer,
    matchesSelector,
    scrollIntoView,
    shouldIgnoreFocus,
    WeakHTMLElement
} from '../Utils';

const _inputSelector = [
    'input',
    'textarea',
    '*[contenteditable]'
].join(', ');

export class FocusedElementState
        extends Subscribable<HTMLElement | undefined, Types.FocusedElementDetails> implements Types.FocusedElementState {

    private static _lastResetElement: WeakHTMLElement | undefined;

    private _tabster: Types.TabsterCore;
    private _initTimer: number | undefined;
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

        // Add these event listeners as capture - we want Tabster to run before user event handlers
        win.document.addEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true);
        win.document.addEventListener('focusout', this._onFocusOut, true);
        win.document.addEventListener('mousedown', this._onMouseDown, true);
        win.addEventListener('keydown', this._onKeyDown, true);
    }

    protected dispose(): void {
        super.dispose();

        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.document.removeEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true);
        win.document.removeEventListener('focusout', this._onFocusOut, true);
        win.document.removeEventListener('mousedown', this._onMouseDown, true);
        win.removeEventListener('keydown', this._onKeyDown, true);

        delete FocusedElementState._lastResetElement;

        delete this._nextVal;
        delete this._lastVal;
    }

    static dispose(instance: Types.FocusedElementState): void {
        (instance as FocusedElementState).dispose();
    }

    static forgetMemorized(instance: Types.FocusedElementState, parent: HTMLElement): void {
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

    focus(element: HTMLElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): boolean {
        if (!this._tabster.focusable.isFocusable(element, noFocusedProgrammaticallyFlag, false, noAccessibleCheck)) {
            return false;
        }

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

    private _setFocusedElement(element?: HTMLElement, relatedTarget?: HTMLElement, isFocusedProgrammatically?: boolean): void {
        const details: Types.FocusedElementDetails = { relatedTarget };

        if (element) {
            const lastResetElement = FocusedElementState._lastResetElement?.get();
            FocusedElementState._lastResetElement = undefined;

            if ((lastResetElement === element) || shouldIgnoreFocus(element)) {
                return;
            }

            details.isFocusedProgrammatically = isFocusedProgrammatically;
        }

        const nextVal = this._nextVal = { element: element ? new WeakHTMLElement(this._win, element) : undefined, details };

        if (element && (element !== this._val)) {
            this._validateFocusedElement(element);
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

    private _onFocusIn = (e: KeyborgFocusInEvent): void => {
        this._setFocusedElement(
            e.target as HTMLElement,
            (e.details.relatedTarget as HTMLElement) || undefined,
            e.details.isFocusedProgrammatically
        );
    }

    private _onFocusOut = (e: FocusEvent): void => {
        this._setFocusedElement(undefined, (e.relatedTarget as HTMLElement) || undefined);
    }

    private _onMouseDown = (e: MouseEvent): void => {
        const groupper = this._tabster.focusable.findGroupper(e.target as HTMLElement);

        if (groupper) {
            this._tabster.focusable.setCurrentGroupper(groupper);
        }
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        let curElement = this.getVal();

        if (!curElement || !curElement.ownerDocument) {
            return;
        }

        switch (e.keyCode) {
            case Keys.Enter:
            case Keys.Esc:
            case Keys.Tab:
            case Keys.Down:
            case Keys.Right:
            case Keys.Up:
            case Keys.Left:
            case Keys.PageDown:
            case Keys.PageUp:
            case Keys.Home:
            case Keys.End:
                break;

            default:
                return;
        }

        const ctx = RootAPI.getTabsterContext(this._tabster, curElement, { checkRtl: true });

        const keyCode = e.keyCode;
        const isTab = keyCode === Keys.Tab;
        const isNotGroupperCase = (
            isTab ||
            (
                ctx &&
                ctx.mover &&
                !ctx.isGroupperFirst
            )
        ) && (keyCode !== Keys.Enter) && (keyCode !== Keys.Esc);

        if (isNotGroupperCase) {
            if (!ctx) {
                // Do not custom-handle the Tab press when nothing is to custom-handle.
                return;
            }

            const isPrev = (isTab && e.shiftKey) ||
                (
                    !isTab &&
                    (
                        (keyCode === Keys.Left && !ctx.isRtl) ||
                        (keyCode === Keys.Right && ctx.isRtl) ||
                        (keyCode === Keys.Up) ||
                        (keyCode === Keys.PageUp) ||
                        (keyCode === Keys.Home)
                    )
                );

            let fromElement: HTMLElement | null = curElement;

            // If the current element is in a mover, move to the mover boundaries since a mover is considered a single tabstop
            if (isTab && ctx.mover && ctx.moverOptions?.navigationType === Types.MoverKeys.Arrows) {
                // Consider nested movers a as a single tab stop, go up until there is no more mover
                let  parentCtx: typeof ctx | undefined = ctx;
                let rootMover = ctx.mover;
                while (parentCtx?.mover?.parentElement) {
                    rootMover = parentCtx.mover;
                    parentCtx = RootAPI.getTabsterContext(this._tabster, parentCtx.mover.parentElement);
                }

                if (isPrev) {
                    fromElement = this._tabster.focusable.findFirst(rootMover);
                } else {
                    fromElement = this._tabster.focusable.findLast(rootMover);
                }
            }

            if (!fromElement) {
                return;
            }

            let next: HTMLElement | null = null;

            switch (keyCode) {
                case Keys.Tab:
                case Keys.Up:
                case Keys.Down:
                case Keys.Left:
                case Keys.Right:
                    next = isPrev
                        ? this._tabster.focusable.findPrev(fromElement)
                        : this._tabster.focusable.findNext(fromElement);
                    break;
                case Keys.Home:
                    next = ctx.mover?.contains(fromElement)  ? this._tabster.focusable.findFirst(ctx.mover) : next;
                    break;
                case Keys.End:
                    next = ctx.mover?.contains(fromElement)  ? this._tabster.focusable.findLast(ctx.mover) : next;
                    break;
                case Keys.PageDown:
                case Keys.PageUp:
                    // TODO.
                    return;
            }

            if (!isTab && ctx.mover) {
                const horizontalKeysOnVerticalAxis =
                    (keyCode === Keys.Left || keyCode === Keys.Right) && ctx.moverOptions?.axis === Types.MoverAxis.Vertical;
                const verticalKeysOnHorizontalAxis =
                    (keyCode === Keys.Up || keyCode === Keys.Down) && ctx.moverOptions?.axis === Types.MoverAxis.Horizontal;

                if (horizontalKeysOnVerticalAxis || verticalKeysOnHorizontalAxis) {
                    return;
                }

                if (!next || (next && !ctx.mover.contains(next))) {
                    // Nowhere to move inside the current Mover.
                    e.preventDefault(); // We don't need the page to scroll when we're custom-handling
                                        // the arrows.

                    if (!ctx.moverOptions?.cyclic) {
                        return;
                    }

                    // cyclic navigation, focus first or last elements in the mover container respectively
                    if (isPrev) {
                        next = this._tabster.focusable.findLast(ctx.mover);
                    } else {
                        next = this._tabster.focusable.findFirst(ctx.mover);
                    }
                }
            }
            const groupper = ctx?.groupper;
            const groupperElement = groupper?.getElement();

            if (groupper && groupperElement) {
                const first = this._getFirstInGroupper(groupperElement, false);

                if (first && (curElement !== first) &&
                    (groupper.getBasicProps().isLimited === Types.GroupperFocusLimits.LimitedTrapFocus) &&
                    (!next || (next === first) || !groupperElement.contains(next))
                ) {
                    next = isPrev
                        ? this._tabster.focusable.findLast(groupperElement)
                        : this._tabster.focusable.findNext(first, groupperElement);
                } else if ((curElement === first) && groupperElement.parentElement) {
                    const parentGroupper = RootAPI.getTabsterContext(this._tabster, groupperElement.parentElement)?.groupper;
                    const parentGroupperElement = parentGroupper?.getElement();

                    if (
                        parentGroupper &&
                        parentGroupperElement &&
                        !parentGroupperElement.contains(next) &&
                        parentGroupper.getBasicProps().isLimited === Types.GroupperFocusLimits.LimitedTrapFocus
                    ) {
                        next = curElement;
                    }
                }
            }

            if (ctx && ctx.modalizer) {
                const nctx = next && RootAPI.getTabsterContext(this._tabster, next);

                if (
                    !nctx ||
                    (ctx.root.uid !== nctx.root.uid) ||
                    !nctx.modalizer?.isActive()
                ) {
                    if (ctx.modalizer.onBeforeFocusOut()) {
                        e.preventDefault();

                        return;
                    }
                }
            }

            if (next) {
                e.preventDefault();

                callOriginalFocusOnly(next);
            } else if (ctx) {
                ctx.root.moveOutWithDefaultAction(isPrev);
            }
        } else {
            if ((keyCode === Keys.Left || keyCode === Keys.Right) && this._isInput(curElement)) {
                return;
            }

            let groupper = ctx?.groupper;
            let groupperElement = groupper?.getElement();

            if (!groupper || !groupperElement) {
                return;
            }

            let shouldStopPropagation = true;

            let next: HTMLElement | null = null;

            switch (keyCode) {
                case Keys.Enter:
                case Keys.Esc:
                    let state = groupper.getState();

                    if (e.keyCode === Keys.Enter) {
                        if (state.isLimited && (curElement === this._getFirstInGroupper(groupperElement, true))) {
                            groupper.setUnlimited(true);

                            next = this._tabster.focusable.findNext(curElement);

                            if (!groupperElement.contains(next)) {
                                next = null;
                            }

                            if (next === null) {
                                shouldStopPropagation = false;
                            }
                        } else {
                            shouldStopPropagation = false;
                        }
                    } else { // Esc
                        if (state.isLimited) {
                            if (groupperElement.parentElement) {
                                const parentGroupper = RootAPI.getTabsterContext(this._tabster, groupperElement.parentElement)?.groupper;

                                if (parentGroupper) {
                                    groupperElement = parentGroupper.getElement();
                                    groupper = parentGroupper;
                                    state = parentGroupper.getState();
                                }
                            }
                        }

                        if (!state.isLimited) {
                            groupper.setUnlimited(false);
                            next = groupperElement || null;
                        }
                    }
                    break;

                case Keys.Down:
                case Keys.Right:
                case Keys.Up:
                case Keys.Left:
                    next = this._findNextGroupper(groupperElement, e.keyCode, groupper.getBasicProps().nextDirection, ctx?.isRtl);
                    break;

                case Keys.PageDown:
                    next = this._findPageDownGroupper(groupperElement);
                    if (next) {
                        scrollIntoView(this._win, next, true);
                    }
                    break;

                case Keys.PageUp:
                    next = this._findPageUpGroupper(groupperElement);
                    if (next) {
                        scrollIntoView(this._win, next, false);
                    }
                    break;

                case Keys.Home:
                    if (groupperElement.parentElement) {
                        next = this._tabster.focusable.findFirstGroupper(groupperElement);
                    }
                    break;

                case Keys.End:
                    if (groupperElement.parentElement) {
                        next = this._tabster.focusable.findLastGroupper(groupperElement);
                    }
                    break;
            }

            if (shouldStopPropagation) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }

            if (next) {
                if (!this._tabster.focusable.isFocusable(next)) {
                    next = this._tabster.focusable.findFirst(next, false, true);
                }

                if (next) {
                    this._tabster.focusable.setCurrentGroupper(next);

                    KeyboardNavigationState.setVal(this._tabster.keyboardNavigation, true);

                    callOriginalFocusOnly(next);
                }
            }
        }
    }

    private _getFirstInGroupper(groupperElement: HTMLElement, ignoreGroupper: boolean): HTMLElement | null {
        return this._tabster.focusable.isFocusable(groupperElement)
            ? groupperElement
            : this._tabster.focusable.findFirst(groupperElement, false, ignoreGroupper);
    }

    private _findNextGroupper(from: HTMLElement, key: Key, direction?: Types.GroupperNextDirection, isRtl?: boolean): HTMLElement | null {
        if ((direction === Types.GroupperNextDirections.Vertical) && ((key === Keys.Left) || (key === Keys.Right))) {
            return null;
        }

        if ((direction === Types.GroupperNextDirections.Horizontal) && ((key === Keys.Up) || (key === Keys.Down))) {
            return null;
        }

        if ((direction === undefined) || (direction === Types.GroupperNextDirections.Both)) {
            if ((key === Keys.Left && !isRtl) || (key === Keys.Right && isRtl) || (key === Keys.Up)) {
                return this._tabster.focusable.findPrevGroupper(from);
            } else {
                return this._tabster.focusable.findNextGroupper(from);
            }
        }

        const fromRect = from.getBoundingClientRect();
        let next: HTMLElement | undefined;
        let lastEl: HTMLElement | undefined;
        let prevTop: number | undefined;

        const nextMethod = ((key === Keys.Down) || (key === Keys.Right)) ? 'findNextGroupper' : 'findPrevGroupper';

        for (let el = this._tabster.focusable[nextMethod](from); el; el = this._tabster.focusable[nextMethod](el)) {
            const rect = el.getBoundingClientRect();

            if (key === Keys.Up) {
                if (rect.top < fromRect.top) {
                    if (prevTop === undefined) {
                        prevTop = rect.top;
                    } else if (rect.top < prevTop) {
                        break;
                    }

                    if (rect.left < fromRect.left) {
                        if (!next) {
                            next = el;
                        }

                        break;
                    }

                    next = el;
                }
            } else if (key === Keys.Down) {
                if (rect.top > fromRect.top) {
                    if (prevTop === undefined) {
                        prevTop = rect.top;
                    } else if (rect.top > prevTop) {
                        break;
                    }

                    if (rect.left > fromRect.left) {
                        if (!next) {
                            next = el;
                        }

                        break;
                    }

                    next = el;
                }

            } else if ((key === Keys.Left) || (key === Keys.Right)) {
                next = el;
                break;
            }

            lastEl = el;
        }

        return next || lastEl || null;
    }

    private _findPageUpGroupper(from: HTMLElement): HTMLElement | null {
        let ue = this._tabster.focusable.findPrevGroupper(from);
        let pue: HTMLElement | null = null;

        while (ue) {
            pue = ue;

            ue = isElementVerticallyVisibleInContainer(this._win, ue)
                ? this._tabster.focusable.findPrevGroupper(ue)
                : null;
        }

        return pue;
    }

    private _findPageDownGroupper(from: HTMLElement): HTMLElement | null {
        let de = this._tabster.focusable.findNextGroupper(from);
        let pde: HTMLElement | null = null;

        while (de) {
            pde = de;

            de = isElementVerticallyVisibleInContainer(this._win, de)
                ? this._tabster.focusable.findNextGroupper(de)
                : null;
        }

        return pde;
    }

    private _validateFocusedElement = (element: HTMLElement): void => {
        this._tabster.focusable.setCurrentGroupper(element);
    }

    private _isInput(element: HTMLElement): boolean {
        return matchesSelector(element, _inputSelector);
    }
}
