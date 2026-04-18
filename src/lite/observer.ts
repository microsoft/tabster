/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// sideEffects: true — this module installs a MutationObserver on first call.

import { createGroupper } from "./groupper";
import { createMover } from "./mover";
import { createDeloser } from "./deloser";
import { createModalizer } from "./modalizer";
import { createRestorer } from "./restorer";
import type { GroupperInstance } from "./groupper";
import type { MoverInstance } from "./mover";
import type { DeloserInstance } from "./deloser";
import type { ModalizerInstance } from "./modalizer";
import type { RestorerInstance } from "./restorer";

export type ModuleKey =
    | "groupper"
    | "mover"
    | "deloser"
    | "modalizer"
    | "restorer";

export interface LiteObserverOptions {
    root?: HTMLElement;
    modules?: ModuleKey[];
}

export interface LiteObserver {
    dispose(): void;
    /** Returns the live instance for the given element and module, or null if none exists. */
    getInstance(element: HTMLElement, module: ModuleKey): AnyInstance | null;
}

type AnyInstance =
    | GroupperInstance
    | MoverInstance
    | DeloserInstance
    | ModalizerInstance
    | RestorerInstance;

const TABSTER_ATTR = "data-tabster";

function _parseJSON(value: string): Record<string, unknown> {
    try {
        return JSON.parse(value) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function _parseTabsterAttr(el: HTMLElement): Record<string, unknown> {
    const value = el.getAttribute(TABSTER_ATTR);
    if (!value) {
        return {};
    }
    return _parseJSON(value);
}

function _createInstance(
    module: ModuleKey,
    element: HTMLElement,
    opts: Record<string, unknown>
): AnyInstance | null {
    switch (module) {
        case "groupper":
            return createGroupper(
                element,
                opts as Parameters<typeof createGroupper>[1]
            );
        case "mover":
            return createMover(
                element,
                opts as Parameters<typeof createMover>[1]
            );
        case "deloser":
            return createDeloser(
                element,
                opts as Parameters<typeof createDeloser>[1]
            );
        case "modalizer":
            return createModalizer(
                element,
                opts as Parameters<typeof createModalizer>[1]
            );
        case "restorer":
            return createRestorer(
                element,
                opts as unknown as Parameters<typeof createRestorer>[1]
            );
        default:
            return null;
    }
}

export function createLiteObserver(
    options?: LiteObserverOptions
): LiteObserver {
    const root = options?.root ?? document.body;
    const modules: ModuleKey[] = options?.modules ?? [
        "groupper",
        "mover",
        "deloser",
        "modalizer",
        "restorer",
    ];

    // element → { module → instance }
    const _instances = new WeakMap<HTMLElement, Map<ModuleKey, AnyInstance>>();

    function _getOrCreateMap(el: HTMLElement): Map<ModuleKey, AnyInstance> {
        let map = _instances.get(el);
        if (!map) {
            map = new Map();
            _instances.set(el, map);
        }
        return map;
    }

    function _mountElement(el: HTMLElement): void {
        const parsed = _parseTabsterAttr(el);
        // `focusable.ignoreKeydown` is a top-level sibling of mover/groupper in
        // the data-tabster JSON envelope. Merge it into mover/groupper opts so
        // those primitives can honour caller-provided keydown overrides.
        const focusable = parsed["focusable"] as
            | { ignoreKeydown?: Record<string, boolean> }
            | undefined;
        for (const mod of modules) {
            if (parsed[mod] !== undefined) {
                const map = _getOrCreateMap(el);
                if (!map.has(mod)) {
                    const baseOpts = (parsed[mod] ?? {}) as Record<
                        string,
                        unknown
                    >;
                    const opts =
                        (mod === "groupper" || mod === "mover") &&
                        focusable?.ignoreKeydown &&
                        baseOpts.ignoreKeydown === undefined
                            ? {
                                  ...baseOpts,
                                  ignoreKeydown: focusable.ignoreKeydown,
                              }
                            : baseOpts;
                    const instance = _createInstance(mod, el, opts);
                    if (instance) {
                        map.set(mod, instance);
                    }
                }
            }
        }
    }

    function _unmountModule(el: HTMLElement, mod: ModuleKey): void {
        const map = _instances.get(el);
        if (!map) {
            return;
        }
        const instance = map.get(mod);
        if (instance) {
            instance.dispose();
            map.delete(mod);
        }
        if (map.size === 0) {
            _instances.delete(el);
        }
    }

    function _unmountElement(el: HTMLElement): void {
        for (const mod of modules) {
            _unmountModule(el, mod);
        }
    }

    // Initial scan
    {
        const els = Array.from(
            root.querySelectorAll(`[${TABSTER_ATTR}]`)
        ) as HTMLElement[];
        for (const el of els) {
            _mountElement(el);
        }
    }

    const _mo = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (!(node instanceof HTMLElement)) {
                        continue;
                    }
                    if (node.hasAttribute(TABSTER_ATTR)) {
                        _mountElement(node);
                    }
                    // Scan subtree
                    const children = Array.from(
                        node.querySelectorAll(`[${TABSTER_ATTR}]`)
                    ) as HTMLElement[];
                    for (const child of children) {
                        _mountElement(child);
                    }
                }
                for (const node of Array.from(mutation.removedNodes)) {
                    if (!(node instanceof HTMLElement)) {
                        continue;
                    }
                    if (node.hasAttribute(TABSTER_ATTR)) {
                        _unmountElement(node);
                    }
                    const children = Array.from(
                        node.querySelectorAll(`[${TABSTER_ATTR}]`)
                    ) as HTMLElement[];
                    for (const child of children) {
                        _unmountElement(child);
                    }
                }
            } else if (mutation.type === "attributes") {
                const el = mutation.target as HTMLElement;
                if (mutation.attributeName !== TABSTER_ATTR) {
                    continue;
                }

                if (el.hasAttribute(TABSTER_ATTR)) {
                    // Diff modules: dispose ones removed, mount ones added,
                    // remount ones whose JSON value changed.
                    const parsed = _parseTabsterAttr(el);
                    const focusable = parsed["focusable"] as
                        | { ignoreKeydown?: Record<string, boolean> }
                        | undefined;
                    const existing = _instances.get(el);
                    for (const mod of modules) {
                        const next = parsed[mod];
                        const had = existing?.has(mod) ?? false;
                        if (next === undefined && had) {
                            _unmountModule(el, mod);
                        } else if (next !== undefined) {
                            // Always remount when attribute mutates — we
                            // don't track previous opts, so re-create.
                            _unmountModule(el, mod);
                            const baseOpts = (next ?? {}) as Record<
                                string,
                                unknown
                            >;
                            const opts =
                                (mod === "groupper" || mod === "mover") &&
                                focusable?.ignoreKeydown &&
                                baseOpts.ignoreKeydown === undefined
                                    ? {
                                          ...baseOpts,
                                          ignoreKeydown:
                                              focusable.ignoreKeydown,
                                      }
                                    : baseOpts;
                            const instance = _createInstance(mod, el, opts);
                            if (instance) {
                                _getOrCreateMap(el).set(mod, instance);
                            }
                        }
                    }
                } else {
                    _unmountElement(el);
                }
            }
        }
    });

    _mo.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [TABSTER_ATTR],
    });

    function dispose(): void {
        _mo.disconnect();
        const els = Array.from(
            root.querySelectorAll(`[${TABSTER_ATTR}]`)
        ) as HTMLElement[];
        for (const el of els) {
            _unmountElement(el);
        }
    }

    function getInstance(
        element: HTMLElement,
        module: ModuleKey
    ): AnyInstance | null {
        return _instances.get(element)?.get(module) ?? null;
    }

    return { dispose, getInstance };
}
