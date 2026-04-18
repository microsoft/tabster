/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface FocusedElementDetail {
    relatedTarget?: HTMLElement;
    isFocusedProgrammatically?: boolean;
}

export type FocusedElementCallback = (
    element: HTMLElement | undefined,
    detail: FocusedElementDetail
) => void;

export interface FocusedElementTracker {
    subscribe(callback: FocusedElementCallback): void;
    unsubscribe(callback: FocusedElementCallback): void;
    dispose(): void;
}

// One patch entry per window, shared across all tracker instances for that window.
// refCount tracks how many trackers are alive so we unpatch only when the last one disposes.
interface PatchEntry {
    original: (this: HTMLElement, options?: FocusOptions) => void;
    isProgrammatic: boolean;
    refCount: number;
}

const _patches = new WeakMap<Window & typeof globalThis, PatchEntry>();

function _patchFocus(win: Window & typeof globalThis): void {
    let p = _patches.get(win);
    if (!p) {
        const proto = win.HTMLElement.prototype as {
            focus(options?: FocusOptions): void;
        };
        const original = proto.focus;
        p = { original, isProgrammatic: false, refCount: 0 };
        _patches.set(win, p);

        const patch = p; // capture for closure
        proto.focus = function (this: HTMLElement, options?: FocusOptions) {
            patch.isProgrammatic = true;
            original.call(this, options);
        };
    }
    p.refCount++;
}

function _unpatchFocus(win: Window & typeof globalThis): void {
    const p = _patches.get(win);
    if (p && --p.refCount <= 0) {
        (
            win.HTMLElement.prototype as {
                focus(options?: FocusOptions): void;
            }
        ).focus = p.original;
        _patches.delete(win);
    }
}

/**
 * Creates a tracker that calls subscribers whenever the focused element changes.
 *
 * Provides the same information as tabster's `focusedElement.subscribe`:
 * - `element` — the newly focused element, or `undefined` when focus leaves the document
 * - `detail.relatedTarget` — the previously focused element
 * - `detail.isFocusedProgrammatically` — true when focus was set via `.focus()`, false for user interaction
 *
 * The tracker patches `HTMLElement.prototype.focus` on the document's window to detect
 * programmatic focus. The patch is ref-counted and removed when the last tracker disposes.
 */
export function createFocusedElementTracker(
    doc: Document
): FocusedElementTracker {
    const win = doc.defaultView as (Window & typeof globalThis) | null;

    const _callbacks = new Set<FocusedElementCallback>();
    let _disposed = false;
    let _pendingBlurTimer: ReturnType<typeof setTimeout> | null = null;

    if (win) {
        _patchFocus(win);
    }

    function _notify(
        element: HTMLElement | undefined,
        detail: FocusedElementDetail
    ): void {
        for (const cb of _callbacks) {
            cb(element, detail);
        }
    }

    function _onFocusIn(e: FocusEvent): void {
        // Cancel any deferred "focus left document" notification — focus came back.
        if (_pendingBlurTimer !== null) {
            clearTimeout(_pendingBlurTimer);
            _pendingBlurTimer = null;
        }

        const target = e.target as HTMLElement | null;
        const relatedTarget = e.relatedTarget as HTMLElement | undefined;

        // Read and reset the programmatic flag before notifying so that nested
        // subscribe callbacks see the correct value.
        const patch = win ? _patches.get(win) : undefined;
        const isProgrammatic = patch?.isProgrammatic ?? false;
        if (patch) {
            patch.isProgrammatic = false;
        }

        _notify(target ?? undefined, {
            relatedTarget,
            isFocusedProgrammatically: isProgrammatic,
        });
    }

    function _onFocusOut(e: FocusEvent): void {
        // Only care when focus is leaving the document entirely (relatedTarget is null).
        // For same-document moves, focusin will fire immediately after and cancel the timer.
        if (e.relatedTarget) {
            return;
        }

        const prev = e.target as HTMLElement;
        _pendingBlurTimer = setTimeout(() => {
            _pendingBlurTimer = null;
            _notify(undefined, { relatedTarget: prev });
        }, 0);
    }

    doc.addEventListener("focusin", _onFocusIn, true);
    doc.addEventListener("focusout", _onFocusOut, true);

    return {
        subscribe(cb: FocusedElementCallback): void {
            _callbacks.add(cb);
        },
        unsubscribe(cb: FocusedElementCallback): void {
            _callbacks.delete(cb);
        },
        dispose(): void {
            if (_disposed) {
                return;
            }
            _disposed = true;

            if (_pendingBlurTimer !== null) {
                clearTimeout(_pendingBlurTimer);
                _pendingBlurTimer = null;
            }

            doc.removeEventListener("focusin", _onFocusIn, true);
            doc.removeEventListener("focusout", _onFocusOut, true);
            _callbacks.clear();

            if (win) {
                _unpatchFocus(win);
            }
        },
    };
}
