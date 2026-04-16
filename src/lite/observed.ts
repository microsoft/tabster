/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const DEFAULT_ATTRIBUTE = "data-tabster-lite-observed";
const DEFAULT_TIMEOUT = 5000;

export interface ObservedElementRequest {
    cancel(): void;
    readonly result: Promise<HTMLElement | null>;
}

interface PendingRequest {
    name: string | string[];
    attributeName: string;
    resolve: (el: HTMLElement | null) => void;
    timeoutId: number | undefined;
    canceled: boolean;
}

// ---- Lazy singleton MutationObserver ----

let _mo: MutationObserver | null = null;
const _pending: Set<PendingRequest> = new Set();

function _tryResolve(req: PendingRequest): boolean {
    if (req.canceled) {
        return true;
    }
    const el = findObservedElement(req.name, {
        attributeName: req.attributeName,
    });
    if (el) {
        if (req.timeoutId !== undefined) {
            clearTimeout(req.timeoutId);
        }
        req.resolve(el);
        return true;
    }
    return false;
}

function _onMutation(mutations: MutationRecord[]): void {
    if (_pending.size === 0) {
        return;
    }

    for (const req of _pending) {
        if (_tryResolve(req)) {
            _pending.delete(req);
        }
    }

    if (_pending.size === 0) {
        _disposeMO();
    }
}

function _ensureMO(): void {
    if (_mo) return;
    _mo = new MutationObserver(_onMutation);
    _mo.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [DEFAULT_ATTRIBUTE],
    });
}

function _disposeMO(): void {
    if (_mo) {
        _mo.disconnect();
        _mo = null;
    }
}

// ---- Public API ----

export function findObservedElement(
    name: string | string[],
    options?: { attributeName?: string }
): HTMLElement | null {
    const attr = options?.attributeName ?? DEFAULT_ATTRIBUTE;
    const names = Array.isArray(name) ? name : [name];
    // ~= matches space-separated tokens, so it works for both single and multi-name attributes
    const selector = names
        .map((n) => `[${attr}~="${CSS.escape(n)}"]`)
        .join(",");
    return document.querySelector(selector) as HTMLElement | null;
}

export function observeElement(
    element: HTMLElement,
    name: string | string[],
    options?: { attributeName?: string }
): () => void {
    const attr = options?.attributeName ?? DEFAULT_ATTRIBUTE;
    const value = Array.isArray(name) ? name.join(" ") : name;
    element.setAttribute(attr, value);
    return () => {
        element.removeAttribute(attr);
    };
}

export function waitForObservedElement(
    name: string | string[],
    options?: { timeout?: number; attributeName?: string }
): ObservedElementRequest {
    const attr = options?.attributeName ?? DEFAULT_ATTRIBUTE;
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    let resolve!: (el: HTMLElement | null) => void;
    const result = new Promise<HTMLElement | null>((res) => {
        resolve = res;
    });

    const req: PendingRequest = {
        name,
        attributeName: attr,
        resolve,
        timeoutId: undefined,
        canceled: false,
    };

    // Check immediately
    const existing = findObservedElement(name, { attributeName: attr });
    if (existing) {
        resolve(existing);
        return {
            cancel: () => {},
            result,
        };
    }

    // Set up timeout
    req.timeoutId = window.setTimeout(() => {
        req.canceled = true;
        _pending.delete(req);
        resolve(null);
        if (_pending.size === 0) {
            _disposeMO();
        }
    }, timeout);

    _pending.add(req);
    _ensureMO();

    return {
        cancel(): void {
            if (!req.canceled) {
                req.canceled = true;
                if (req.timeoutId !== undefined) {
                    clearTimeout(req.timeoutId);
                }
                _pending.delete(req);
                resolve(null);
                if (_pending.size === 0) {
                    _disposeMO();
                }
            }
        },
        result,
    };
}

export function requestFocusObservedElement(
    name: string | string[],
    options?: {
        timeout?: number;
        focusOptions?: FocusOptions;
        attributeName?: string;
    }
): ObservedElementRequest {
    const waitOpts: { timeout?: number; attributeName?: string } = {};
    if (options?.timeout !== undefined) {
        waitOpts.timeout = options.timeout;
    }
    if (options?.attributeName !== undefined) {
        waitOpts.attributeName = options.attributeName;
    }
    const req = waitForObservedElement(name, waitOpts);

    req.result.then((el) => {
        if (el) {
            el.focus(options?.focusOptions);
        }
    });

    return req;
}

export function disposeObservedModule(): void {
    for (const req of _pending) {
        req.canceled = true;
        if (req.timeoutId !== undefined) {
            clearTimeout(req.timeoutId);
        }
        req.resolve(null);
    }
    _pending.clear();
    _disposeMO();
}
