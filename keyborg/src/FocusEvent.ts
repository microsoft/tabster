/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const KEYBORG_FOCUSIN = 'keyborg:focusin';

interface CustomFocusFunctionWithOriginal {
    __keyborgFocus?: (options?: FocusOptions | undefined) => void;
}

interface KeyborgFocusEventData {
    focusInHandler: (e: FocusEvent) => void;
    lastFocusedProgrammatically?: WeakHTMLElement;
}

interface WindowWithHTMLElementAndLastFocusedElement extends Window {
    HTMLElement: typeof HTMLElement;
    __keyborgData?: KeyborgFocusEventData;
}

function canOverrideNativeFocus(win: Window): boolean {
    const HTMLElement = (win as WindowWithHTMLElementAndLastFocusedElement).HTMLElement;
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

let _canOverrideNativeFocus = false;

const _hasWeakRef = typeof WeakRef !== 'undefined';

class WeakHTMLElement {
    private _weakRef?: WeakRef<HTMLElement>;
    private _element?: HTMLElement;

    constructor(element: HTMLElement) {
        if (_hasWeakRef) {
            this._weakRef = new WeakRef(element);
        } else {
            this._element = element;
        }
    }

    deref(): HTMLElement | undefined {
        let target: HTMLElement | undefined;

        if (_hasWeakRef) {
            target = this._weakRef?.deref();

            if (!target) {
                delete this._weakRef;
            }
        } else {
            target = this._element;
        }

        return target;
    }
}

export interface KeyborgFocusInEventDetails {
    relatedTarget?: HTMLElement;
    isFocusedProgrammatically?: boolean;
}

export interface KeyborgFocusInEvent extends Event {
    details: KeyborgFocusInEventDetails;
}

export function callOriginalFocusOnly(element: HTMLElement): void {
    const focus = element.focus as CustomFocusFunctionWithOriginal;

    if (focus.__keyborgFocus) {
        focus.__keyborgFocus.call(element);
    } else {
        element.focus();
    }
}

export function setupFocusEvent(win: Window): void {
    const wnd = win as WindowWithHTMLElementAndLastFocusedElement;

    if (!_canOverrideNativeFocus) {
        _canOverrideNativeFocus = canOverrideNativeFocus(wnd);
    }

    const origFocus = wnd.HTMLElement.prototype.focus;

    if ((origFocus as CustomFocusFunctionWithOriginal).__keyborgFocus) {
        // Already set up.
        return;
    }

    wnd.HTMLElement.prototype.focus = focus;

    const data: KeyborgFocusEventData = wnd.__keyborgData = {
        focusInHandler: (e: FocusEvent) => {
            const target = e.target as HTMLElement;

            if (target) {
                const event = document.createEvent('HTMLEvents') as KeyborgFocusInEvent;

                event.initEvent(KEYBORG_FOCUSIN, true, true);

                const details: KeyborgFocusInEventDetails = {
                    relatedTarget: (e.relatedTarget as HTMLElement) || undefined
                };

                if (_canOverrideNativeFocus || data.lastFocusedProgrammatically) {
                    details.isFocusedProgrammatically = (target === data.lastFocusedProgrammatically?.deref());

                    data.lastFocusedProgrammatically = undefined;
                }

                event.details = details;

                target.dispatchEvent(event);
            }
        }
    };

    wnd.document.addEventListener('focusin', wnd.__keyborgData.focusInHandler, true);

    function focus(this: HTMLElement) {
        const keyborgFocusEvent = (wnd as WindowWithHTMLElementAndLastFocusedElement).__keyborgData;

        if (keyborgFocusEvent) {
            keyborgFocusEvent.lastFocusedProgrammatically = new WeakHTMLElement(this);
        }

        return origFocus.apply(this, arguments);
    }

    (focus as CustomFocusFunctionWithOriginal).__keyborgFocus = origFocus;
}

export function disposeFocusEvent(win: Window): void {
    const wnd = win as WindowWithHTMLElementAndLastFocusedElement;
    const proto = wnd.HTMLElement.prototype;
    const origFocus = (proto.focus as CustomFocusFunctionWithOriginal).__keyborgFocus;
    const keyborgFocusEvent = wnd.__keyborgData;

    if (keyborgFocusEvent) {
        wnd.document.removeEventListener('focusin', keyborgFocusEvent.focusInHandler, true);
        delete wnd.__keyborgData;
    }

    if (origFocus) {
        proto.focus = origFocus;
    }
}

export function getLastFocusedProgrammatically(win: Window): HTMLElement | null | undefined {
    const keyborgFocusEvent = (win as WindowWithHTMLElementAndLastFocusedElement).__keyborgData;

    return keyborgFocusEvent
        ? (keyborgFocusEvent.lastFocusedProgrammatically?.deref() || null)
        : undefined;
}
