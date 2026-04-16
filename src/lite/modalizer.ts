/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { DOMAPI } from "../Types";
import { findAll, findDefault, findFirst } from "./focusable";

export interface ModalizerOptions {
    id?: string;
    useDialog?: boolean;
    initialFocus?: string | ((container: HTMLElement) => HTMLElement | null);
    restoreFocusTo?: HTMLElement | (() => HTMLElement | null);
    onEscape?: (event: KeyboardEvent) => void;
    closeOnEscape?: boolean;
    allowNested?: boolean;
    isOthersAccessible?: boolean;
    /**
     * When true, a keydown Tab-trap listener is added so focus cannot leave via
     * Tab even to browser chrome (legacy "force trap" behaviour).
     */
    isTrapped?: boolean;
    /**
     * When true, this modalizer container is always accessible even when other
     * modals are active. Lite honours this by virtue of skipping all elements
     * that have data-tabster-lite-modalizer, so no extra runtime logic is needed.
     */
    isAlwaysAccessible?: boolean;
    /**
     * Called for each sibling that would otherwise be made inert.
     * Return true to keep the element accessible (e.g. elements with a "never-hidden" attribute).
     */
    accessibleCheck?: (element: HTMLElement) => boolean;
    isNoFocusFirst?: boolean;
    isNoFocusDefault?: boolean;
    domAPI?: DOMAPI;
}

export interface ModalizerInstance {
    readonly element: HTMLElement;
    readonly id: string | undefined;
    readonly isActive: boolean;
    /**
     * Activate the modal trap.
     * @param restoreTarget - Element to return focus to on deactivate/dispose.
     *   If omitted, document.activeElement is captured at the time of the call.
     */
    activate(restoreTarget?: HTMLElement | null): void;
    deactivate(): void;
    dispose(): void;
}

// Track elements whose `inert` was set by this instance (not pre-existing)
type InertRecord = WeakMap<HTMLElement, boolean>; // value: was inert before we touched it

let _lastFocusRelatedTarget: HTMLElement | null = null;
let _globalFocusTrackerInitialized = false;

function _ensureGlobalFocusTracker(doc: Document): void {
    if (_globalFocusTrackerInitialized) {
        return;
    }

    doc.addEventListener(
        "focusin",
        (e) => {
            const related = (e as FocusEvent)
                .relatedTarget as HTMLElement | null;
            if (related) {
                _lastFocusRelatedTarget = related;
            }
        },
        true
    );

    _globalFocusTrackerInitialized = true;
}

export function createModalizer(
    element: HTMLElement,
    options?: ModalizerOptions
): ModalizerInstance {
    const id = options?.id;
    const useDialog = options?.useDialog ?? false;
    const closeOnEscape = options?.closeOnEscape ?? true;
    const isOthersAccessible = options?.isOthersAccessible ?? false;
    const isTrapped = options?.isTrapped ?? false;
    const accessibleCheck = options?.accessibleCheck;
    const role = element.getAttribute("role");
    const isNonModalDialogLike =
        role === "dialog" && element.getAttribute("aria-modal") !== "true";

    let _active = false;
    let _restoreTarget: HTMLElement | null = null;
    // Set to true while activate() is being triggered by the auto-focusin listener.
    // Used to skip restoreTarget overwrite and focus-movement in that code path.
    let _activatingFromFocusIn = false;
    // Per-instance map of elements we marked inert and whether they had inert before
    let _inertMap: InertRecord = new WeakMap();
    // Keep strong refs to all elements we touched so we can iterate them
    let _inertElements: HTMLElement[] = [];

    // Tab-trap listener (for isTrapped mode)
    let _tabTrapListener: ((e: KeyboardEvent) => void) | null = null;

    function _resolveInitialFocus(): HTMLElement | null {
        const ini = options?.initialFocus;
        if (typeof ini === "function") {
            return ini(element);
        }
        if (typeof ini === "string") {
            return element.querySelector(ini) as HTMLElement | null;
        }
        return null;
    }

    function _applyInert(): void {
        // Walk ancestor chain from element up to document.body
        const path = new Set<HTMLElement>();
        let cur: HTMLElement | null = element;
        while (cur && cur !== document.body) {
            path.add(cur);
            cur = cur.parentElement;
        }
        path.add(document.body);

        // For each node in path (including element), set inert on siblings NOT in path
        for (const ancestor of path) {
            const parent = ancestor.parentElement;
            if (!parent) continue;

            for (let i = 0; i < parent.children.length; i++) {
                const sibling = parent.children[i] as HTMLElement;
                if (path.has(sibling)) continue;
                // Keep other modalizer containers accessible for nested/sibling stacks.
                if (
                    sibling.hasAttribute("data-tabster-lite-modalizer") ||
                    !!sibling.querySelector("[data-tabster-lite-modalizer]")
                ) {
                    continue;
                }
                // Skip elements explicitly marked as never-hidden (useDangerousNeverHidden_unstable).
                if (
                    sibling.hasAttribute("data-tabster-never-hide") ||
                    !!sibling.querySelector("[data-tabster-never-hide]")
                ) {
                    continue;
                }
                // Skip elements the caller wants to keep accessible (e.g. DangerousNeverHidden).
                if (accessibleCheck?.(sibling)) continue;

                const wasAlreadyInert =
                    (sibling as HTMLElement & { inert?: boolean }).inert ===
                    true;
                if (!wasAlreadyInert) {
                    (sibling as HTMLElement & { inert: boolean }).inert = true;
                    _inertMap.set(sibling, false); // we set it; it wasn't inert before
                    _inertElements.push(sibling);
                }
                // If already inert, leave it alone (and don't record it)
            }
        }
    }

    function _removeInert(): void {
        for (const el of _inertElements) {
            const wasInertBefore = _inertMap.get(el);
            if (wasInertBefore === false) {
                // We set inert on it; remove it
                (el as HTMLElement & { inert: boolean }).inert = false;
            }
        }
        _inertElements = [];
        _inertMap = new WeakMap();
    }

    function _onKeyDown(e: KeyboardEvent): void {
        if (e.defaultPrevented) {
            return;
        }

        if (e.key === "Escape") {
            if (isNonModalDialogLike) {
                return;
            }

            if (options?.onEscape) {
                options.onEscape(e);
            }
            if (e.defaultPrevented) {
                return;
            }
            if (closeOnEscape) {
                deactivate();
            }
        }
    }

    function _resolveRestoreTarget(
        relatedTarget: HTMLElement | null,
        currentTargetInsideModal?: HTMLElement | null
    ): HTMLElement | null {
        if (relatedTarget && !element.contains(relatedTarget)) {
            return relatedTarget;
        }

        // For non-modal/modalizers that keep outside content accessible,
        // avoid global fallbacks that can interfere with nested components
        // (e.g. Popover/Menu restore focus behavior).
        if (isOthersAccessible && !isNonModalDialogLike) {
            if (
                _lastFocusRelatedTarget &&
                _lastFocusRelatedTarget.isConnected &&
                _lastFocusRelatedTarget.hasAttribute(
                    "data-tabster-lite-restorer"
                )
            ) {
                return _lastFocusRelatedTarget;
            }

            return null;
        }

        if (
            _lastFocusRelatedTarget &&
            !_lastFocusRelatedTarget.contains(element) &&
            !element.contains(_lastFocusRelatedTarget) &&
            _lastFocusRelatedTarget.isConnected
        ) {
            return _lastFocusRelatedTarget;
        }

        if (
            currentTargetInsideModal &&
            currentTargetInsideModal.ownerDocument.activeElement instanceof
                HTMLElement
        ) {
            const active = currentTargetInsideModal.ownerDocument
                .activeElement as HTMLElement;
            if (!element.contains(active)) {
                return active;
            }
        }

        return null;
    }

    function activate(restoreTarget?: HTMLElement | null): void {
        if (_active) return;

        // When auto-activated by focusin, _restoreTarget was pre-set to e.relatedTarget
        // (the element that had focus before entering the container — e.g. the trigger button).
        // For explicit activate() calls, use the provided restoreTarget, or fall back to
        // document.activeElement.
        if (!_activatingFromFocusIn) {
            _restoreTarget =
                restoreTarget !== undefined
                    ? restoreTarget
                    : (document.activeElement as HTMLElement | null);
        }
        _active = true;

        if (useDialog && element instanceof HTMLDialogElement) {
            (element as HTMLDialogElement).showModal();

            if (closeOnEscape) {
                element.addEventListener("cancel", (e) => {
                    e.preventDefault();
                    if (options?.onEscape) {
                        options.onEscape(e as unknown as KeyboardEvent);
                    }
                    deactivate();
                });
            }
        } else {
            if (!isOthersAccessible) {
                _applyInert();
            }

            // Keyboard Tab-trap: intercept Tab so focus cannot leave even to browser chrome.
            if (isTrapped && !isOthersAccessible) {
                _tabTrapListener = (e: KeyboardEvent) => {
                    if (e.key !== "Tab") return;
                    const focusables = findAll({ container: element });
                    if (focusables.length === 0) return;
                    const first = focusables[0]!;
                    const last = focusables[focusables.length - 1]!;
                    const active = document.activeElement as HTMLElement | null;
                    if (e.shiftKey) {
                        if (active === first || !element.contains(active)) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (active === last || !element.contains(active)) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                };
                document.addEventListener("keydown", _tabTrapListener, true);
            }
        }

        element.addEventListener("keydown", _onKeyDown);

        element.dispatchEvent(
            new CustomEvent("tabster:lite:modalizer:activate", {
                bubbles: true,
                composed: true,
            })
        );

        // Move focus into the modal unless opted out or unless we were triggered by a
        // focusin event (in which case focus has already arrived inside the container).
        if (!_activatingFromFocusIn && !options?.isNoFocusFirst) {
            let toFocus: HTMLElement | null = null;

            toFocus = _resolveInitialFocus();

            if (!toFocus && !options?.isNoFocusDefault) {
                toFocus = findDefault({ container: element });
            }

            if (!toFocus) {
                toFocus = findFirst({ container: element });
            }

            toFocus?.focus();
        }
    }

    function deactivate(): void {
        if (!_active) return;

        _active = false;

        element.removeEventListener("keydown", _onKeyDown);

        if (useDialog && element instanceof HTMLDialogElement) {
            (element as HTMLDialogElement).close();
        } else {
            if (!isOthersAccessible) {
                _removeInert();
            }

            if (_tabTrapListener) {
                document.removeEventListener("keydown", _tabTrapListener, true);
                _tabTrapListener = null;
            }
        }

        element.dispatchEvent(
            new CustomEvent("tabster:lite:modalizer:deactivate", {
                bubbles: true,
                composed: true,
            })
        );

        // Restore focus
        const rf = options?.restoreFocusTo;
        const restoreTo = rf
            ? typeof rf === "function"
                ? rf()
                : rf
            : _restoreTarget;

        if (restoreTo && restoreTo.isConnected) {
            restoreTo.focus();
        }

        _restoreTarget = null;
    }

    // Auto-activation: mirrors full tabster's behaviour where focus entering a modalizer
    // container automatically activates the trap.  This means components like Dialog do
    // not need to call useActivateModal explicitly — moving focus into the container is
    // sufficient (e.g. via useFocusFirstElement).
    //
    // We capture e.relatedTarget (the previously focused element) as the restore target so
    // that deactivation later returns focus to the trigger, not to an element inside the modal.
    //
    // The listener is kept alive across deactivate() calls so re-opening the same element
    // (unmountOnClose=false) re-activates correctly.  It is only removed on dispose().
    //
    // We attach to the ownerDocument rather than the element with capture:true so the listener
    // fires reliably in all environments (including Cypress / CDP-driven tests where element-level
    // capture listeners can be missed).
    function _onFocusInAutoActivate(e: FocusEvent): void {
        if (_active) return;
        const target = e.target as HTMLElement;
        // Only react when focus arrives INSIDE the container from OUTSIDE.
        if (!element.contains(target)) return;
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        if (relatedTarget && element.contains(relatedTarget)) return;

        _restoreTarget = _resolveRestoreTarget(relatedTarget, target);
        _activatingFromFocusIn = true;
        activate();
        _activatingFromFocusIn = false;
    }

    const _doc = element.ownerDocument;
    _ensureGlobalFocusTracker(_doc);
    _doc.addEventListener("focusin", _onFocusInAutoActivate);

    // If focus has already entered this modalizer before the instance was mounted
    // (possible due to async observer wiring), activate immediately.
    const currentlyFocused = _doc.activeElement as HTMLElement | null;
    if (
        (!isOthersAccessible || isNonModalDialogLike) &&
        currentlyFocused &&
        element.contains(currentlyFocused)
    ) {
        _restoreTarget = _resolveRestoreTarget(null, currentlyFocused);
        _activatingFromFocusIn = true;
        activate();
        _activatingFromFocusIn = false;
    }

    function dispose(): void {
        if (_active) {
            deactivate();
        }
        _doc.removeEventListener("focusin", _onFocusInAutoActivate);
    }

    return {
        get element() {
            return element;
        },
        get id() {
            return id;
        },
        get isActive() {
            return _active;
        },
        activate,
        deactivate,
        dispose,
    };
}
