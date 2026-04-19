/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { DOMAPI, RestorerType } from "../Types";
import { RestorerTypes } from "../Consts";
export { RestorerTypes } from "../Consts";
export type { RestorerType } from "../Types";

export interface RestorerOptions {
    type: RestorerType;
    id?: string;
    domAPI?: DOMAPI;
}

export interface RestorerInstance {
    readonly element: HTMLElement;
    readonly type: RestorerType;
    dispose(): void;
}

// ---- Module-level history stack ----

interface TargetEntry {
    ref: WeakRef<HTMLElement>;
    id: string | undefined;
}

const _MAX_HISTORY = 10;
const _targetHistory: TargetEntry[] = [];

function _pushTarget(el: HTMLElement, id: string | undefined): void {
    // Remove any existing entry for this element
    const existing = _targetHistory.findIndex((e) => e.ref.deref() === el);
    if (existing !== -1) {
        _targetHistory.splice(existing, 1);
    }

    _targetHistory.push({ ref: new WeakRef(el), id });

    if (_targetHistory.length > _MAX_HISTORY) {
        _targetHistory.shift();
    }
}

function _popTarget(id: string | undefined): HTMLElement | null {
    // Search newest → oldest for matching id
    for (let i = _targetHistory.length - 1; i >= 0; i--) {
        const entry = _targetHistory[i];
        if (entry.id === id) {
            const el = entry.ref.deref();
            _targetHistory.splice(i, 1);
            if (el) {
                return el;
            }
        }
    }
    return null;
}

// Track whether a pointer click is happening so we skip focus restoration
let _pointerActive = false;

if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", () => {
        _pointerActive = true;
    });
    document.addEventListener("pointerup", () => {
        // Reset after the focus event settles
        Promise.resolve().then(() => {
            _pointerActive = false;
        });
    });
}

export function createRestorer(
    element: HTMLElement,
    options: RestorerOptions
): RestorerInstance {
    const type = options.type;
    const id = options.id;

    let _disposed = false;

    if (type === RestorerTypes.Target) {
        // Target: push to history when it receives focus
        function _onFocusIn(): void {
            if (!_disposed) {
                _pushTarget(element, id);
            }
        }

        element.addEventListener("focusin", _onFocusIn);

        function dispose(): void {
            _disposed = true;
            element.removeEventListener("focusin", _onFocusIn);
        }

        return {
            get element() {
                return element;
            },
            get type() {
                return type;
            },
            dispose,
        };
    } else {
        // Source: when focus leaves to document.body (keyboard only), restore to matching Target
        function _onFocusOut(e: FocusEvent): void {
            if (_disposed || _pointerActive) {
                return;
            }

            const related = e.relatedTarget as HTMLElement | null;
            if (!related) {
                // Focus left the document — find and restore to matching target
                const target = _popTarget(id);
                if (target && target.isConnected) {
                    // Use microtask to let current focus settle
                    Promise.resolve().then(() => {
                        if (
                            !_pointerActive &&
                            (!document.activeElement ||
                                document.activeElement === document.body)
                        ) {
                            target.focus();
                        }
                    });
                }
            }
        }

        element.addEventListener("focusout", _onFocusOut);

        function dispose(): void {
            _disposed = true;
            element.removeEventListener("focusout", _onFocusOut);
        }

        return {
            get element() {
                return element;
            },
            get type() {
                return type;
            },
            dispose,
        };
    }
}
