/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { DOMAPI } from "../Types";
import { DeloserFocusRestoredEventName } from "../Events";
import { findFirst } from "./focusable";

export interface DeloserOptions {
    historyDepth?: number;
    onLoseFocus?: (
        lost: HTMLElement,
        container: HTMLElement
    ) => HTMLElement | false | null;
    fallbackElement?: HTMLElement | (() => HTMLElement | null);
    domAPI?: DOMAPI;
}

export interface DeloserInstance {
    readonly element: HTMLElement;
    addToHistory(el: HTMLElement): void;
    clearHistory(): void;
    dispose(): void;
}

export function createDeloser(
    element: HTMLElement,
    options?: DeloserOptions
): DeloserInstance {
    const historyDepth = options?.historyDepth ?? 10;

    // Fixed-size ring buffer: no splice/shift
    const _history: Array<WeakRef<HTMLElement>> = new Array(historyDepth).fill(
        null as unknown as WeakRef<HTMLElement>
    );
    let _head = 0; // points to next write slot
    let _size = 0;

    let _microtaskScheduled = false;
    // Track the last element focused inside the container so we know whether
    // a DOM removal is relevant to us (focus was inside when the removal happened).
    let _lastFocused: HTMLElement | null = null;

    function _push(el: HTMLElement): void {
        _history[_head] = new WeakRef(el);
        _head = (_head + 1) % historyDepth;
        if (_size < historyDepth) {
            _size++;
        }
    }

    function _walk(cb: (el: HTMLElement) => boolean): HTMLElement | null {
        // Walk newest → oldest
        for (let i = 1; i <= _size; i++) {
            const idx = (_head - i + historyDepth * 2) % historyDepth;
            const el = _history[idx]?.deref();
            if (el && cb(el)) {
                return el;
            }
        }
        return null;
    }

    function _restore(lostEl: HTMLElement): void {
        // Walk history newest→oldest, find first still in container
        const candidate = _walk(
            (el) => el !== lostEl && element.contains(el) && el.isConnected
        );

        if (candidate) {
            candidate.focus();
            element.dispatchEvent(
                new CustomEvent(DeloserFocusRestoredEventName, {
                    bubbles: true,
                    composed: true,
                })
            );
            return;
        }

        // Fallback chain: onLoseFocus callback
        if (options?.onLoseFocus) {
            const result = options.onLoseFocus(lostEl, element);
            if (result !== false && result !== null) {
                result.focus();
                return;
            }
            if (result === false) {
                return;
            }
        }

        // fallbackElement
        const fe = options?.fallbackElement;
        if (fe) {
            const target = typeof fe === "function" ? fe() : fe;
            if (target) {
                target.focus();
                return;
            }
        }

        // Last resort: first focusable in the container
        const first = findFirst({ container: element });
        if (first) {
            first.focus();
            return;
        }

        // If nothing focusable, try the container itself
        if (element.tabIndex >= 0) {
            element.focus();
        }
    }

    // MutationObserver: watch for DOM removals
    const _mo = new MutationObserver(() => {
        if (_microtaskScheduled) {
            return;
        }

        const active = document.activeElement as HTMLElement | null;

        // If active element is still inside the container, nothing to restore
        if (active && element.contains(active)) {
            return;
        }

        // Only restore if the last focused element inside the container was
        // removed. If focus was never inside (or was cleared), skip.
        if (!_lastFocused || _lastFocused.isConnected) {
            return;
        }

        // If active is outside or body — schedule restore
        _microtaskScheduled = true;
        Promise.resolve().then(() => {
            _microtaskScheduled = false;

            const currentActive = document.activeElement as HTMLElement | null;
            if (
                !currentActive ||
                currentActive === document.body ||
                !element.contains(currentActive)
            ) {
                _restore(currentActive ?? document.body);
            }
        });
    });

    _mo.observe(element, { childList: true, subtree: true });

    // Record focus history
    function _onFocusIn(e: FocusEvent): void {
        const target = e.target as HTMLElement;
        if (element.contains(target) && target !== element) {
            _push(target);
            _lastFocused = target;
        }
    }

    element.addEventListener("focusin", _onFocusIn);

    function addToHistory(el: HTMLElement): void {
        _push(el);
    }

    function clearHistory(): void {
        for (let i = 0; i < historyDepth; i++) {
            _history[i] = null as unknown as WeakRef<HTMLElement>;
        }
        _head = 0;
        _size = 0;
        _lastFocused = null;
    }

    function dispose(): void {
        element.removeEventListener("focusin", _onFocusIn);
        _mo.disconnect();
        clearHistory();
    }

    return {
        get element() {
            return element;
        },
        addToHistory,
        clearHistory,
        dispose,
    };
}
