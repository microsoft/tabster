/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from '../IFrameEvents';
import { Keys } from '../Keys';
import { List, ListNavigation } from '../List';
import { ModalityLayer } from '../ModalityLayer';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';

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
    private _mainWindow: Window;
    private _moveOutInput: HTMLInputElement | undefined;
    private _insideListTimer: number | undefined;
    private _curList: Types.ListContainer | undefined;
    private _nextVal: { element: HTMLElement | undefined, details: Types.FocusedElementDetails } | undefined;

    constructor(mainWindow: Window, ah: Types.AbilityHelpers) {
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
        this._mainWindow.addEventListener('keydown', this._onKeyDown, true); // Capture!

        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent, true); // Capture!
    }

    protected dispose(): void {
        super.dispose();

        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._mainWindow.document.removeEventListener('focusin', this._onFocusIn, true);
        this._mainWindow.document.removeEventListener('focusout', this._onFocusOut, true);

        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent, true);

        this._mainWindow.removeEventListener('keydown', this._onKeyDown, true); // Capture!
        this._mainWindow.document.removeEventListener('mousedown', this._onMouseDown, true);
    }

    getFocusedElement(): HTMLElement | undefined {
        return this.getVal();
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

    private static replaceFocus(doc: HTMLDocument): void {
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
        const li = List.getItemFor(e.target as HTMLElement);

        if (li && (li.list.getCurrentItem() !== li.listItem)) {
            li.list.setCurrentItem(li.listItem);
        }
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        const curElement = this.getVal();

        if (!curElement || !curElement.ownerDocument) {
            return;
        }

        switch (e.keyCode) {
            case Keys.Tab:
            case Keys.Down:
            case Keys.Right:
            case Keys.Up:
            case Keys.Left:
            case Keys.Enter:
            case Keys.Space:
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
                const li = List.getItemFor(curElement);

                if (!li) {
                    // We're not in a modality layer and not in a list,
                    // do not custom-handle the Tab press.
                    return;
                }
            }

            const next = e.shiftKey
                ? this._ah.focusable.findPrev()
                : this._ah.focusable.findNext();

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
            const li = List.getItemFor(curElement);

            if (!li) {
                return;
            }

            if ((e.keyCode === Keys.Enter) || (e.keyCode === Keys.Space)) {
                const liElement = li.listItem.getElement();

                if (liElement === curElement) {
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    (List.findActionable(liElement) || liElement).click();
                }

                return;
            }

            e.preventDefault();
            e.stopImmediatePropagation();

            const listNavigation = new ListNavigation(li.list.getElement(), curElement, (el) => callOriginalFocusOnly(el), this._ah);

            switch (e.keyCode) {
                case Keys.Down:
                case Keys.Right:
                    listNavigation.next();
                    break;

                case Keys.Up:
                case Keys.Left:
                    listNavigation.prev();
                    break;

                case Keys.PageDown:
                    listNavigation.pageDown();
                    break;

                case Keys.PageUp:
                    listNavigation.pageUp();
                    break;

                case Keys.Home:
                    listNavigation.home();
                    break;

                case Keys.End:
                    listNavigation.end();
                    break;
            }
        }
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
        if (this._insideListTimer) {
            this._mainWindow.clearTimeout(this._insideListTimer);
            this._insideListTimer = undefined;
        }

        if (e) {
            const li = List.getItemFor(e);
            const l = ModalityLayer.getLayerFor(e);
            const curLayerId = l ? l.root.getCurrentLayerId() : undefined;

            if (li && (!l || curLayerId === undefined || (l.layer.userId === curLayerId))) {
                if (this._curList === li.list) {
                    if (li && (li.list.getCurrentItem() !== li.listItem)) {
                        li.list.setCurrentItem(li.listItem);
                    }
                } else {
                    this._curList = li.list;

                    const cur = li.list.getCurrentItem();
                    const el = cur ? cur.getElement() : undefined;

                    if (el && (el !== e) && !el.contains(e)) {
                        this._ah.focusedElement.focus(el);

                        return;
                    }
                }
            } else {
                this._curList = undefined;
            }

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
                    // Blurring the one outside which is focused.
                    e.blur();
                }
           }
        } else if (this._curList) {
            // In case the list item is focused by the screen reader,
            // we want to avoid refocusing the previously selected item in
            // the list.
            this._insideListTimer = this._mainWindow.setTimeout(() => {
                this._insideListTimer = undefined;
                this._curList = undefined;
            }, 0);
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

export function setupFocusedElementStateInIFrame(mainWindow: Window, iframeDocument: HTMLDocument): void {
    (FocusedElementState as any).replaceFocus(iframeDocument);

    setupIFrameToMainWindowEventsDispatcher(mainWindow, iframeDocument, _customEventName, [
        { type: EventFromIFrameDescriptorType.Document, name: 'focusin', capture: true },
        { type: EventFromIFrameDescriptorType.Document, name: 'focusout', capture: true },
        { type: EventFromIFrameDescriptorType.Document, name: 'mousedown', capture: true },
        { type: EventFromIFrameDescriptorType.Window, name: 'keydown', capture: true }
    ]);
}
