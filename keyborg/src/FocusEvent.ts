/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { WeakRefInstance } from './WeakRefInstance';

export const KEYBORG_FOCUSIN = 'keyborg:focusin';

interface KeyborgFocus {
    /**
     * This is the native `focus` function that is retained so that it can be restored when keyborg is disposed
     */
    __keyborgNativeFocus?: (options?: FocusOptions | undefined) => void;
}

interface KeyborgFocusEventData {
    focusInHandler: (e: FocusEvent) => void;
    lastFocusedProgrammatically?: WeakRefInstance<HTMLElement>;
}

/**
 * Extends the global window with keyborg focus event data
 */
interface WindowWithKeyborgFocusEvent extends Window {
    HTMLElement: typeof HTMLElement;
    __keyborgData?: KeyborgFocusEventData;
}

function canOverrideNativeFocus(win: Window): boolean {
    const HTMLElement = (win as WindowWithKeyborgFocusEvent).HTMLElement;
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

export interface KeyborgFocusInEventDetails {
    relatedTarget?: HTMLElement;
    isFocusedProgrammatically?: boolean;
}

export interface KeyborgFocusInEvent extends Event {
    details: KeyborgFocusInEventDetails;
}

/**
 * Guarantees that the native `focus` will be used
 */
export function nativeFocus(element: HTMLElement): void {
    const focus = element.focus as KeyborgFocus;

    if (focus.__keyborgNativeFocus) {
        focus.__keyborgNativeFocus.call(element);
    } else {
        element.focus();
    }
}

/**
 * Overrides the native `focus` and setups the keyborg focus event
 */
export function setupFocusEvent(win: Window): void {
    const kwin = win as WindowWithKeyborgFocusEvent;

    if (!_canOverrideNativeFocus) {
        _canOverrideNativeFocus = canOverrideNativeFocus(kwin);
    }

    const origFocus = kwin.HTMLElement.prototype.focus;

    if ((origFocus as KeyborgFocus).__keyborgNativeFocus) {
        // Already set up.
        return;
    }

    kwin.HTMLElement.prototype.focus = focus;

    const data: KeyborgFocusEventData = kwin.__keyborgData = {
        focusInHandler: (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (!target) {
                return;
            }

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
    };

    kwin.document.addEventListener('focusin', kwin.__keyborgData.focusInHandler, true);

    function focus(this: HTMLElement) {
        const keyborgNativeFocusEvent = (kwin as WindowWithKeyborgFocusEvent).__keyborgData;

        if (keyborgNativeFocusEvent) {
            keyborgNativeFocusEvent.lastFocusedProgrammatically = new WeakRefInstance(this);
        }

        return origFocus.apply(this, arguments);
    }

    (focus as KeyborgFocus).__keyborgNativeFocus = origFocus;
}

/**
 * Removes keyborg event listeners and custom focus override
 * @param win The window that stores keyborg focus events
 */
export function disposeFocusEvent(win: Window): void {
    const kwin = win as WindowWithKeyborgFocusEvent;
    const proto = kwin.HTMLElement.prototype;
    const origFocus = (proto.focus as KeyborgFocus).__keyborgNativeFocus;
    const keyborgNativeFocusEvent = kwin.__keyborgData;

    if (keyborgNativeFocusEvent) {
        kwin.document.removeEventListener('focusin', keyborgNativeFocusEvent.focusInHandler, true);
        delete kwin.__keyborgData;
    }

    if (origFocus) {
        proto.focus = origFocus;
    }
}

/**
 * @param win The window that stores keyborg focus events
 * @returns The last element focused with element.focus()
 */
export function getLastFocusedProgrammatically(win: Window): HTMLElement | null | undefined {
    const keyborgNativeFocusEvent = (win as WindowWithKeyborgFocusEvent).__keyborgData;

    return keyborgNativeFocusEvent
        ? (keyborgNativeFocusEvent.lastFocusedProgrammatically?.deref() || null)
        : undefined;
}
