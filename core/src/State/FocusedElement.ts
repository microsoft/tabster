/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from '../IFrameEvents';
import { getAbilityHelpersOnElement } from '../Instance';
import { KeyboardNavigationState } from './KeyboardNavigation';
import { Keys } from '../Keys';
import { RootAPI } from '../Root';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';
import {
    callOriginalFocusOnly,
    CustomFocusFunctionWithOriginal,
    isElementVerticallyVisibleInContainer,
    scrollIntoView,
    shouldIgnoreFocus
} from '../Utils';

const _customEventName = 'ability-helpers:focused-element-related';
const _canOverrideNativeFocus = canOverrideNativeFocus();

interface WindowWithHTMLElement extends Window {
    HTMLElement: typeof HTMLElement;
}

function canOverrideNativeFocus(): boolean {
    const win = (window as WindowWithHTMLElement);
    const origFocus = win.HTMLElement.prototype.focus;

    let isCustomFocusCalled = false;

    win.HTMLElement.prototype.focus = function focus(): void {
        isCustomFocusCalled = true;
    };

    const btn = win.document.createElement('button');

    btn.focus();

    win.HTMLElement.prototype.focus = origFocus;

    return isCustomFocusCalled;
}

export class FocusedElementState
        extends Subscribable<HTMLElement | undefined, Types.FocusedElementDetails> implements Types.FocusedElementState {

    private static _lastFocusedProgrammatically: HTMLElement | undefined;
    private static _lastResetElement: HTMLElement | undefined;

    private _ah: Types.AbilityHelpers;
    private _initTimer: number | undefined;
    private _mainWindow: Window;
    private _nextVal: { element: HTMLElement | undefined, details: Types.FocusedElementDetails } | undefined;
    private _lastVal: HTMLElement | undefined;
    private _prevVal: HTMLElement | undefined;

    constructor(ah: Types.AbilityHelpers, mainWindow: Window) {
        super();

        this._ah = ah;
        this._mainWindow = mainWindow;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        FocusedElementState.replaceFocus(this._mainWindow.document);

        this._mainWindow.document.addEventListener('focusin', this._onFocusIn, true); // Capture!
        this._mainWindow.document.addEventListener('focusout', this._onFocusOut, true); // Capture!
        this._mainWindow.document.addEventListener('mousedown', this._onMouseDown, true); // Capture!
        this._mainWindow.addEventListener('keydown', this._onKeyDown);
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent, true); // Capture!
    }

    protected dispose(): void {
        super.dispose();

        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._mainWindow.document.removeEventListener('focusin', this._onFocusIn, true); // Capture!
        this._mainWindow.document.removeEventListener('focusout', this._onFocusOut, true); // Capture!
        this._mainWindow.document.removeEventListener('mousedown', this._onMouseDown, true); // Capture!
        this._mainWindow.removeEventListener('keydown', this._onKeyDown);
        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent, true); // Capture!
    }

    getFocusedElement(): HTMLElement | undefined {
        return this.getVal();
    }

    getLastFocusedElement(): HTMLElement | undefined {
        if (this._lastVal && (!this._lastVal.ownerDocument || !this._lastVal.ownerDocument.contains(this._lastVal))) {
            this._lastVal = undefined;
        }

        return this._lastVal;
    }

    getPrevFocusedElement(): HTMLElement | undefined {
        if (this._prevVal && (!this._prevVal.ownerDocument || !this._prevVal.ownerDocument.contains(this._prevVal))) {
            this._prevVal = undefined;
        }

        return this._prevVal;
    }

    focus(element: HTMLElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): boolean {
        if (!this._ah.focusable.isFocusable(element, noFocusedProgrammaticallyFlag, false, noAccessibleCheck)) {
            return false;
        }

        FocusedElementState._lastFocusedProgrammatically = element;

        element.focus();

        return true;
    }

    focusDefault(container: HTMLElement): boolean {
        const el = this._ah.focusable.findDefault(container);

        if (el) {
            this._ah.focusedElement.focus(el);

            return true;
        }

        return false;
    }

    focusFirst(container: HTMLElement): boolean {
        const first = this._ah.focusable.findFirst(container, false, true);

        if (first) {
            this.focus(first);

            return true;
        }

        return false;
    }

    resetFocus(container: HTMLElement): boolean {
        if (!this._ah.focusable.isVisible(container)) {
            return false;
        }

        if (!this._ah.focusable.isFocusable(container, true, true, true)) {
            const prevTabIndex = container.getAttribute('tabindex');
            const prevAriaHidden = container.getAttribute('aria-hidden');

            container.tabIndex = -1;
            container.setAttribute('aria-hidden', 'true');

            FocusedElementState._lastResetElement = container;

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
            const lastResetElement = FocusedElementState._lastResetElement;
            FocusedElementState._lastResetElement = undefined;

            if ((lastResetElement === element) || shouldIgnoreFocus(element)) {
                return;
            }

            if (_canOverrideNativeFocus || FocusedElementState._lastFocusedProgrammatically) {
                details.isFocusedProgrammatically = (element === FocusedElementState._lastFocusedProgrammatically);

                FocusedElementState._lastFocusedProgrammatically = undefined;
            }
        }

        const nextVal = this._nextVal = { element, details };

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
            this._prevVal = this._lastVal;
            this._lastVal = val;
        }
    }

    private _onFocusIn = (e: FocusEvent): void => {
        this._setFocusedElement(e.target as HTMLElement, (e.relatedTarget as HTMLElement) || undefined);
    }

    private _onFocusOut = (e: FocusEvent): void => {
        this._setFocusedElement(undefined, (e.relatedTarget as HTMLElement) || undefined);
    }

    private _onIFrameEvent = (e: EventFromIFrame): void => {
        if (!e.targetDetails) {
            return;
        }

        switch (e.targetDetails.descriptor.name) {
            case 'mousedown':
                this._onMouseDown(e.originalEvent as MouseEvent);
                break;

            case 'focusin':
                this._setFocusedElement(
                    e.targetDetails.target,
                    ((e.originalEvent as FocusEvent).relatedTarget as HTMLElement) || undefined
                );
                break;

            case 'focusout':
                this._setFocusedElement(
                    undefined,
                    ((e.originalEvent as FocusEvent).relatedTarget as HTMLElement) || undefined
                );
                break;

            case 'keydown':
                this._onKeyDown(e.originalEvent as KeyboardEvent);
                break;
        }
    }

    static replaceFocus(doc: HTMLDocument): void {
        const win = doc.defaultView as (WindowWithHTMLElement | null);

        if (!win) {
            throw new Error('Wrong document for replaceFocus().');
        }

        const origFocus =  win.HTMLElement.prototype.focus;

        if ((origFocus as CustomFocusFunctionWithOriginal).__ahFocus) {
            // Already set up.
            return;
        }

        win.HTMLElement.prototype.focus = focus;

        function focus(this: HTMLElement) {
            FocusedElementState._lastFocusedProgrammatically = this;
            return origFocus.apply(this, arguments);
        }

        (focus as CustomFocusFunctionWithOriginal).__ahFocus = origFocus;
    }

    private _onMouseDown = (e: MouseEvent): void => {
        const groupper = this._ah.focusable.findGroupper(e.target as HTMLElement);

        if (groupper) {
            this._ah.focusable.setCurrentGroupper(groupper);
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

        if (e.keyCode === Keys.Tab) {
            let rootAndModalizer = RootAPI.findRootAndModalizer(curElement);

            if (!rootAndModalizer) {
                if (!this._ah.focusable.isInCurrentGroupper(curElement)) {
                    // We're not in a Modalizer and not in a current Groupper,
                    // do not custom-handle the Tab press.
                    return;
                }
            }

            if (rootAndModalizer && rootAndModalizer.modalizer) {
                const curModalizerId = rootAndModalizer.root.getCurrentModalizerId();

                if (curModalizerId && (curModalizerId !== rootAndModalizer.modalizer.userId)) {
                    rootAndModalizer.modalizer = rootAndModalizer.root.getModalizerById(curModalizerId);

                    if (rootAndModalizer.modalizer) {
                        curElement = rootAndModalizer.modalizer.getElement();
                    }
                }
            }

            let next = e.shiftKey
                ? this._ah.focusable.findPrev(curElement)
                : this._ah.focusable.findNext(curElement);

            const groupper = this._getGroupper(curElement);

            if (groupper) {
                const groupperElement = groupper.getElement();
                const first = this._getFirstInGroupper(groupperElement, false);

                if (first && (curElement !== first) &&
                    (groupper.getBasicProps().isLimited === Types.GroupperFocusLimit.LimitedTrapFocus) &&
                    (!next || (next === first) || !groupperElement.contains(next))
                ) {
                    next = e.shiftKey
                        ? this._ah.focusable.findLast(groupperElement)
                        : this._ah.focusable.findNext(first, groupperElement);
                } else if ((curElement === first) && groupperElement.parentElement) {
                    const parentGroupper = this._getGroupper(groupperElement.parentElement);

                    if (
                        parentGroupper &&
                        !parentGroupper.getElement().contains(next) &&
                        parentGroupper.getBasicProps().isLimited === Types.GroupperFocusLimit.LimitedTrapFocus
                    ) {
                        next = curElement;
                    }
                }
            }

            if (rootAndModalizer && rootAndModalizer.modalizer) {
                const nml = next && RootAPI.findRootAndModalizer(next);

                if (
                    !nml ||
                    (rootAndModalizer.root.uid !== nml.root.uid) ||
                    !nml.modalizer ||
                    (nml.root.getCurrentModalizerId() !== nml.modalizer.userId)
                ) {
                    if (rootAndModalizer.modalizer.onBeforeFocusOut()) {
                        e.preventDefault();

                        return;
                    }
                }
            }

            if (next) {
                e.preventDefault();

                callOriginalFocusOnly(next);
            } else if (rootAndModalizer) {
                rootAndModalizer.root.moveOutWithDefaultAction(e.shiftKey);
            }
        } else {
            let groupper = this._getGroupper(curElement);

            if (!groupper) {
                return;
            }

            let groupperElement = groupper.getElement();
            let shouldStopPropagation = true;

            let next: HTMLElement | null = null;

            switch (e.keyCode) {
                case Keys.Enter:
                case Keys.Esc:
                    let state = groupper.getState();

                    if (e.keyCode === Keys.Enter) {
                        if (state.isLimited && (curElement === this._getFirstInGroupper(groupperElement, true))) {
                            groupper.setUnlimited(true);

                            next = this._ah.focusable.findNext(curElement);

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
                                const parentGroupper = this._getGroupper(groupperElement.parentElement);

                                if (parentGroupper) {
                                    groupperElement = parentGroupper.getElement();
                                    groupper = parentGroupper;
                                    state = parentGroupper.getState();
                                }
                            }
                        }

                        if (!state.isLimited) {
                            groupper.setUnlimited(false);
                            next = groupperElement;
                        }
                    }
                    break;

                case Keys.Down:
                case Keys.Right:
                case Keys.Up:
                case Keys.Left:
                    next = this._findNextGroupper(groupperElement, e.keyCode, groupper.getBasicProps().nextDirection);
                    break;

                case Keys.PageDown:
                    next = this._findPageDownGroupper(groupperElement);
                    if (next) {
                        scrollIntoView(next, true);
                    }
                    break;

                case Keys.PageUp:
                    next = this._findPageUpGroupper(groupperElement);
                    if (next) {
                        scrollIntoView(next, false);
                    }
                    break;

                case Keys.Home:
                    if (groupperElement.parentElement) {
                        next = this._ah.focusable.findFirstGroupper(groupperElement);
                    }
                    break;

                case Keys.End:
                    if (groupperElement.parentElement) {
                        next = this._ah.focusable.findLastGroupper(groupperElement);
                    }
                    break;
            }

            if (shouldStopPropagation) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }

            if (next) {
                if (!this._ah.focusable.isFocusable(next)) {
                    next = this._ah.focusable.findFirst(next, false, false, true);
                }

                if (next) {
                    this._ah.focusable.setCurrentGroupper(next);

                    KeyboardNavigationState.setVal(this._ah.keyboardNavigation, true);

                    callOriginalFocusOnly(next);
                }
            }
        }
    }

    private _getFirstInGroupper(groupperElement: HTMLElement, ignoreGroupper: boolean): HTMLElement | null {
        return this._ah.focusable.isFocusable(groupperElement)
            ? groupperElement
            : this._ah.focusable.findFirst(groupperElement, false, false, ignoreGroupper);
    }

    private _getGroupper(element: HTMLElement): Types.Groupper | undefined {
        let groupperElement = this._ah.focusable.findGroupper(element);

        if (!groupperElement) {
            return;
        }

        let ah = getAbilityHelpersOnElement(groupperElement);

        return ah && ah.groupper;
    }

    private _findNextGroupper(from: HTMLElement, key: Keys, direction?: Types.GroupperNextDirection): HTMLElement | null {
        if ((direction === Types.GroupperNextDirection.Vertical) && ((key === Keys.Left) || (key === Keys.Right))) {
            return null;
        }

        if ((direction === Types.GroupperNextDirection.Horizontal) && ((key === Keys.Up) || (key === Keys.Down))) {
            return null;
        }

        if ((direction === undefined) || (direction === Types.GroupperNextDirection.Both)) {
            if ((key === Keys.Left) || (key === Keys.Up)) {
                return this._ah.focusable.findPrevGroupper(from);
            } else {
                return this._ah.focusable.findNextGroupper(from);
            }
        }

        const fromRect = from.getBoundingClientRect();
        let next: HTMLElement | undefined;
        let lastEl: HTMLElement | undefined;
        let prevTop: number | undefined;

        const nextMethod = ((key === Keys.Down) || (key === Keys.Right)) ? 'findNextGroupper' : 'findPrevGroupper';

        for (let el = this._ah.focusable[nextMethod](from); el; el = this._ah.focusable[nextMethod](el)) {
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
        let ue = this._ah.focusable.findPrevGroupper(from);
        let pue: HTMLElement | null = null;

        while (ue) {
            pue = ue;

            ue = isElementVerticallyVisibleInContainer(ue)
                ? this._ah.focusable.findPrevGroupper(ue)
                : null;
        }

        return pue;
    }

    private _findPageDownGroupper(from: HTMLElement): HTMLElement | null {
        let de = this._ah.focusable.findNextGroupper(from);
        let pde: HTMLElement | null = null;

        while (de) {
            pde = de;

            de = isElementVerticallyVisibleInContainer(de)
                ? this._ah.focusable.findNextGroupper(de)
                : null;
        }

        return pde;
    }

    private _validateFocusedElement = (element: HTMLElement, details: Types.FocusedElementDetails): void => {
        const rootAndModalizer = RootAPI.findRootAndModalizer(element);
        const curModalizerId = rootAndModalizer ? rootAndModalizer.root.getCurrentModalizerId() : undefined;

        this._ah.focusable.setCurrentGroupper(element);

        if (!rootAndModalizer || !rootAndModalizer.modalizer) {
            return;
        }

        let eModalizer = rootAndModalizer.modalizer;

        if (curModalizerId === eModalizer.userId) {
            return;
        }

        if ((curModalizerId === undefined) || details.isFocusedProgrammatically) {
            rootAndModalizer.root.setCurrentModalizerId(eModalizer.userId);

            return;
        }

        if (eModalizer && element.ownerDocument) {
            let toFocus = this._ah.focusable.findFirst(rootAndModalizer.root.getElement());

            if (toFocus) {
                if (element.compareDocumentPosition(toFocus) & document.DOCUMENT_POSITION_PRECEDING) {
                    toFocus = this._ah.focusable.findLast(element.ownerDocument.body);

                    if (!toFocus) {
                        // This only might mean that findFirst/findLast are buggy and inconsistent.
                        throw new Error('Something went wrong.');
                    }
                }

                this._ah.focusedElement.focus(toFocus);
            } else {
                // Current Modalizer doesn't seem to have focusable elements.
                // Blurring the currently focused element which is outside of the current Modalizer.
                element.blur();
            }
        }
    }
}

export function setupFocusedElementStateInIFrame(iframeDocument: HTMLDocument, mainWindow?: Window): void {
    FocusedElementState.replaceFocus(iframeDocument);

    if (!mainWindow) {
        return;
    }

    setupIFrameToMainWindowEventsDispatcher(mainWindow, iframeDocument, _customEventName, [
        { type: EventFromIFrameDescriptorType.Document, name: 'focusin', capture: true },
        { type: EventFromIFrameDescriptorType.Document, name: 'focusout', capture: true },
        { type: EventFromIFrameDescriptorType.Document, name: 'mousedown', capture: true },
        { type: EventFromIFrameDescriptorType.Window, name: 'keydown', capture: false }
    ]);
}
