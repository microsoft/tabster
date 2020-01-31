/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from '../IFrameEvents';
import { getAbilityHelpersOnElement } from '../Instance';
import { KeyboardNavigationState } from './KeyboardNavigation';
import { Keys } from '../Keys';
import { ModalityLayer } from '../ModalityLayer';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';
import { isElementVerticallyVisibleInContainer, scrollIntoView } from '../Utils';

interface FocusedElementWithIgnoreFlag extends HTMLElement {
    __shouldIgnoreFocus: boolean;
}

const _customEventName = 'ability-helpers:focused-element-related';
const _canOverrideNativeFocus = canOverrideNativeFocus();

interface WindowWithHTMLElement extends Window {
    HTMLElement: typeof HTMLElement;
}

interface CustomFocusFunctionWithOriginal {
    __abilityHelpersFocus?: (options?: FocusOptions | undefined) => void;
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

export function ignoreFocus(element: HTMLElement): void {
    (element as FocusedElementWithIgnoreFlag).__shouldIgnoreFocus = true;
}

export function shouldIgnoreFocus(element: HTMLElement): boolean {
    return !!(element as FocusedElementWithIgnoreFlag).__shouldIgnoreFocus;
}

export class FocusedElementState
        extends Subscribable<HTMLElement | undefined, Types.FocusedElementDetails> implements Types.FocusedElementState {

    private static _lastFocusedProgrammatically: HTMLElement | undefined;

    private _ah: Types.AbilityHelpers;
    private _initTimer: number | undefined;
    private _mainWindow: Window | undefined;
    private _moveOutInput: HTMLInputElement | undefined;
    private _nextVal: { element: HTMLElement | undefined, details: Types.FocusedElementDetails } | undefined;
    private _lastVal: HTMLElement | undefined;

    constructor(ah: Types.AbilityHelpers, mainWindow?: Window) {
        super();

        this._ah = ah;

        if (mainWindow) {
            this._mainWindow = mainWindow;
            this._initTimer = this._mainWindow.setTimeout(this._init, 0);
        }
    }

    private _init = (): void => {
        if (!this._mainWindow) {
            return;
        }

        this._initTimer = undefined;

        FocusedElementState._replaceFocus(this._mainWindow.document);

        this._mainWindow.document.addEventListener('focusin', this._onFocusIn, true); // Capture!
        this._mainWindow.document.addEventListener('focusout', this._onFocusOut, true); // Capture!
        this._mainWindow.document.addEventListener('mousedown', this._onMouseDown, true); // Capture!
        this._mainWindow.addEventListener('keydown', this._onKeyDown);
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent, true); // Capture!
    }

    protected dispose(): void {
        super.dispose();

        if (!this._mainWindow) {
            return;
        }

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

    focus(element: HTMLElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): boolean {
        if (!this._ah.focusable.isFocusable(element, noFocusedProgrammaticallyFlag, noAccessibleCheck)) {
            return false;
        }

        FocusedElementState._lastFocusedProgrammatically = element;

        element.focus();

        return true;
    }

    private _setFocusedElement(element?: HTMLElement, relatedTarget?: HTMLElement): void {
        const details: Types.FocusedElementDetails = { relatedTarget };

        if (element) {
            if (shouldIgnoreFocus(element)) {
                return;
            }

            if (_canOverrideNativeFocus || FocusedElementState._lastFocusedProgrammatically) {
                details.isFocusedProgrammatically = (element === FocusedElementState._lastFocusedProgrammatically);

                FocusedElementState._lastFocusedProgrammatically = undefined;
            }
        }

        const nextVal = this._nextVal = { element, details };

        if (element !== this._val) {
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

    private static _replaceFocus(doc: HTMLDocument): void {
        const win = doc.defaultView as (WindowWithHTMLElement | null);

        if (!win) {
            throw new Error('Wrong document for replaceFocus().');
        }

        const origFocus =  win.HTMLElement.prototype.focus;

        if ((origFocus as CustomFocusFunctionWithOriginal).__abilityHelpersFocus) {
            // Already set up.
            return;
        }

        win.HTMLElement.prototype.focus = focus;

        function focus(this: HTMLElement) {
            FocusedElementState._lastFocusedProgrammatically = this;
            return origFocus.apply(this, arguments);
        }

        (focus as CustomFocusFunctionWithOriginal).__abilityHelpersFocus = origFocus;
    }

    private _onMouseDown = (e: MouseEvent): void => {
        const group = this._ah.focusable.findGroup(e.target as HTMLElement);

        if (group) {
            this._ah.focusable.setCurrentGroup(group);
        }
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        const curElement = this.getVal();

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
            let l = ModalityLayer.getLayerFor(curElement);

            if (!l) {
                if (!this._ah.focusable.isInCurrentGroup(curElement)) {
                    // We're not in a modality layer and not in a current group,
                    // do not custom-handle the Tab press.
                    return;
                }
            }

            let next = e.shiftKey
                ? this._ah.focusable.findPrev(curElement)
                : this._ah.focusable.findNext(curElement);

            const group = this._getGroup(curElement);

            if (group) {
                const groupElement = group.getElement();
                const first = this._getGroupFirst(groupElement, false);

                if (first && (curElement !== first) &&
                    (group.getProps().isLimited === Types.FocusableGroupFocusLimit.LimitedTrapFocus) &&
                    (!next || (next === first) || !groupElement.contains(next))
                ) {
                    next = e.shiftKey
                        ? this._ah.focusable.findLast(groupElement)
                        : this._ah.focusable.findNext(first, groupElement);
                } else if ((curElement === first) && groupElement.parentElement) {
                    const parentGroup = this._getGroup(groupElement.parentElement);

                    if (
                        parentGroup &&
                        !parentGroup.getElement().contains(next) &&
                        parentGroup.getProps().isLimited === Types.FocusableGroupFocusLimit.LimitedTrapFocus
                    ) {
                        next = curElement;
                    }
                }
            }

            if (l && l.layer) {
                const nml = next && ModalityLayer.getLayerFor(next);

                if (!nml || (l.root.id !== nml.root.id) || (nml.root.getCurrentLayerId() !== nml.layer.userId)) {
                    if (l.layer.onBeforeFocusOut()) {
                        e.preventDefault();

                        return;
                    }
                }
            }

            if (next) {
                e.preventDefault();

                callOriginalFocusOnly(next);
            } else {
                this._moveOutWithDefaultAction(l ? l.root.getElement() : curElement.ownerDocument.body, e.shiftKey);
            }
        } else {
            let group = this._getGroup(curElement);

            if (!group) {
                return;
            }

            let groupElement = group.getElement();
            let shouldStopPropagation = true;

            let next: HTMLElement | null = null;

            switch (e.keyCode) {
                case Keys.Enter:
                case Keys.Esc:
                    let state = group.getState();

                    if (e.keyCode === Keys.Enter) {
                        if (state.isLimited && (curElement === this._getGroupFirst(groupElement, true))) {
                            group.setUnlimited(true);

                            next = this._ah.focusable.findNext(curElement);

                            if (!groupElement.contains(next)) {
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
                            if (groupElement.parentElement) {
                                const parentGroup = this._getGroup(groupElement.parentElement);

                                if (parentGroup) {
                                    groupElement = parentGroup.getElement();
                                    group = parentGroup;
                                    state = parentGroup.getState();
                                }
                            }
                        }

                        if (!state.isLimited) {
                            group.setUnlimited(false);
                            next = groupElement;
                        }
                    }
                    break;

                case Keys.Down:
                case Keys.Right:
                case Keys.Up:
                case Keys.Left:
                    next = this._findNextGroup(groupElement, e.keyCode, group.getProps().nextDirection);
                    break;

                case Keys.PageDown:
                    next = this._findPageDownGroup(groupElement);
                    if (next) {
                        scrollIntoView(next, true);
                    }
                    break;

                case Keys.PageUp:
                    next = this._findPageUpGroup(groupElement);
                    if (next) {
                        scrollIntoView(next, false);
                    }
                    break;

                case Keys.Home:
                    if (groupElement.parentElement) {
                        next = this._ah.focusable.findFirstGroup(groupElement);
                    }
                    break;

                case Keys.End:
                    if (groupElement.parentElement) {
                        next = this._ah.focusable.findLastGroup(groupElement);
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
                    this._ah.focusable.setCurrentGroup(next);

                    KeyboardNavigationState.setVal(this._ah.keyboardNavigation, true);

                    callOriginalFocusOnly(next);
                }
            }
        }
    }

    private _getGroupFirst(groupElement: HTMLElement, ignoreGroup: boolean): HTMLElement | null {
        return this._ah.focusable.isFocusable(groupElement)
            ? groupElement
            : this._ah.focusable.findFirst(groupElement, false, false, ignoreGroup);
    }

    private _getGroup(element: HTMLElement): Types.FocusableGroup | undefined {
        let groupElement = this._ah.focusable.findGroup(element);

        if (!groupElement) {
            return;
        }

        let ah = getAbilityHelpersOnElement(groupElement);

        return ah && ah.focusableGroup;
    }

    private _findNextGroup(from: HTMLElement, key: Keys, direction?: Types.FocusableGroupNextDirection): HTMLElement | null {
        if ((direction === Types.FocusableGroupNextDirection.Vertical) && ((key === Keys.Left) || (key === Keys.Right))) {
            return null;
        }

        if ((direction === Types.FocusableGroupNextDirection.Horizontal) && ((key === Keys.Up) || (key === Keys.Down))) {
            return null;
        }

        if ((direction === undefined) || (direction === Types.FocusableGroupNextDirection.Both)) {
            if ((key === Keys.Left) || (key === Keys.Up)) {
                return this._ah.focusable.findPrevGroup(from);
            } else {
                return this._ah.focusable.findNextGroup(from);
            }
        }

        const fromRect = from.getBoundingClientRect();
        let next: HTMLElement | undefined;
        let lastEl: HTMLElement | undefined;
        let prevTop: number | undefined;

        const nextMethod = ((key === Keys.Down) || (key === Keys.Right)) ? 'findNextGroup' : 'findPrevGroup';

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

    private _findPageUpGroup(from: HTMLElement): HTMLElement | null {
        let ue = this._ah.focusable.findPrevGroup(from);
        let pue: HTMLElement | null = null;

        while (ue) {
            pue = ue;

            ue = isElementVerticallyVisibleInContainer(ue)
                ? this._ah.focusable.findPrevGroup(ue)
                : null;
        }

        return pue;
    }

    private _findPageDownGroup(from: HTMLElement): HTMLElement | null {
        let de = this._ah.focusable.findNextGroup(from);
        let pde: HTMLElement | null = null;

        while (de) {
            pde = de;

            de = isElementVerticallyVisibleInContainer(de)
                ? this._ah.focusable.findNextGroup(de)
                : null;
        }

        return pde;
    }

    private _moveOutWithDefaultAction(element: HTMLElement, prev?: boolean): void {
        const win = element.ownerDocument && element.ownerDocument.defaultView;

        if (!win) {
            return;
        }

        this._removeMoveOutInput();

        this._moveOutInput = win.document.createElement('input');

        ignoreFocus(this._moveOutInput);

        const style = this._moveOutInput.style;

        style.position = 'absolute';
        style.opacity = '0';
        style.zIndex = '-1';
        style.left = style.top = '-100500px';

        this._moveOutInput.setAttribute('aria-hidden', 'true');

        this._moveOutInput.addEventListener('focusout', () => {
            this._removeMoveOutInput();
        });

        if (!prev || !element.firstChild) {
            element.appendChild(this._moveOutInput);
        } else {
            element.insertBefore(this._moveOutInput, element.firstChild);
        }

        callOriginalFocusOnly(this._moveOutInput);
    }

    private _removeMoveOutInput(): void {
        if (this._moveOutInput) {
            if (this._moveOutInput.parentElement) {
                this._moveOutInput.parentElement.removeChild(this._moveOutInput);
            }

            this._moveOutInput = undefined;
        }
    }

    private _validateFocusedElement = (e: HTMLElement | undefined, d: Types.FocusedElementDetails): void => {
        if (e) {
            const l = ModalityLayer.getLayerFor(e);
            const curLayerId = l ? l.root.getCurrentLayerId() : undefined;

            this._ah.focusable.setCurrentGroup(e);

            if (!l) {
                return;
            }

            let eLayer = l.layer;

            if (curLayerId === eLayer.userId) {
                return;
            }

            if ((curLayerId === undefined) || d.isFocusedProgrammatically) {
                l.root.setCurrentLayerId(eLayer.userId);

                return;
            }

            if (eLayer && e.ownerDocument) {
                let toFocus = this._ah.focusable.findFirst(l.root.getElement());

                if (toFocus) {
                    if (e.compareDocumentPosition(toFocus) & document.DOCUMENT_POSITION_PRECEDING) {
                        toFocus = this._ah.focusable.findLast(e.ownerDocument.body);

                        if (!toFocus) {
                            // This only might mean that findFirst/findLast are buggy and inconsistent.
                            throw new Error('Something went wrong.');
                        }
                    }

                    this._ah.focusedElement.focus(toFocus);
                } else {
                    // Current layer doesn't seem to have focusable elements.
                    // Blurring the currently focused element which is outside of the current layer.
                    e.blur();
                }
           }
        }
    }
}

function callOriginalFocusOnly(element: HTMLElement): void {
    const focus = element.focus as CustomFocusFunctionWithOriginal;

    if (focus.__abilityHelpersFocus) {
        focus.__abilityHelpersFocus.call(element);
    } else {
        element.focus();
    }
}

export function setupFocusedElementStateInIFrame(iframeDocument: HTMLDocument, mainWindow?: Window): void {
    (FocusedElementState as any).replaceFocus(iframeDocument);

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
