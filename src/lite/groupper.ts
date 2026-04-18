/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { DOMAPI } from "../Types";
import {
    FOCUSABLE_SELECTOR,
    findFirst,
    findDefault,
    findAll,
} from "./focusable";

export const GroupperTabbability = {
    Unlimited: 0,
    Limited: 1,
    LimitedTrapFocus: 2,
} as const;
export type GroupperTabbability =
    (typeof GroupperTabbability)[keyof typeof GroupperTabbability];

export interface GroupperOptions {
    tabbability?: GroupperTabbability;
    /**
     * When true, the first child acts as a delegate: Tab focuses it,
     * then Enter moves focus into the rest of the group.
     * Only meaningful with Limited or LimitedTrapFocus tabbability.
     */
    delegated?: boolean;
    delegateFocus?: string | ((container: HTMLElement) => HTMLElement | null);
    /**
     * Keys the groupper should NOT intercept, allowing default browser/component handling.
     * E.g. `{ Tab: true }` to allow Tab to leave a LimitedTrapFocus group.
     */
    ignoreKeydown?: Record<string, boolean>;
    domAPI?: DOMAPI;
}

export interface GroupperInstance {
    readonly element: HTMLElement;
    enter(options?: { focus?: boolean }): void;
    exit(options?: { focus?: boolean }): void;
    isActive(): boolean | undefined;
    dispose(): void;
}

const GroupperMoveFocusEventName = "tabster:groupper:movefocus";
const GroupperMoveFocusActions = {
    Enter: 1,
    Escape: 2,
} as const;

function _findDelegate(
    container: HTMLElement,
    delegateFocus: GroupperOptions["delegateFocus"]
): HTMLElement | null {
    if (typeof delegateFocus === "function") {
        return delegateFocus(container);
    }
    if (typeof delegateFocus === "string") {
        return container.querySelector(delegateFocus) as HTMLElement | null;
    }
    // Default: first focusable child
    return findFirst({ container, includeProgrammaticallyFocusable: true });
}

export function createGroupper(
    element: HTMLElement,
    options?: GroupperOptions
): GroupperInstance {
    const tabbability = options?.tabbability ?? GroupperTabbability.Unlimited;
    const delegated = options?.delegated ?? false;
    const _savedTabIndexes = new Map<HTMLElement, string | null>();

    // Whether Tab is currently cycling inside the group (Limited/LimitedTrapFocus modes).
    // Starts false — first Tab from outside enters the group.
    let _active = false;

    // Track if we are currently inside the group
    let _insideGroup = false;

    function _isLimited(): boolean {
        return (
            tabbability === GroupperTabbability.Limited ||
            tabbability === GroupperTabbability.LimitedTrapFocus
        );
    }

    function _isTrapFocus(): boolean {
        return tabbability === GroupperTabbability.LimitedTrapFocus;
    }

    function _setInnerTabbable(enabled: boolean): void {
        if (enabled) {
            const savedEntries = Array.from(_savedTabIndexes.entries());

            savedEntries.forEach(([el, previousTabIndex]) => {
                if (!element.contains(el)) {
                    return;
                }

                if (previousTabIndex === null) {
                    el.removeAttribute("tabindex");
                } else {
                    el.setAttribute("tabindex", previousTabIndex);
                }
            });

            _savedTabIndexes.clear();

            return;
        }

        const candidates = Array.from(
            element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );

        candidates.forEach((el) => {
            if (el === element) {
                return;
            }

            if (!_savedTabIndexes.has(el)) {
                _savedTabIndexes.set(el, el.getAttribute("tabindex"));
            }

            el.setAttribute("tabindex", "-1");
        });
    }

    function _enterFromContainer(): boolean {
        _setInnerTabbable(true);

        const defaultEl = findDefault({
            container: element,
            includeProgrammaticallyFocusable: true,
        });
        const firstDescendant =
            findAll({
                container: element,
                includeProgrammaticallyFocusable: true,
            }).find((el) => el !== element) ?? null;
        const toFocus =
            defaultEl && defaultEl !== element ? defaultEl : firstDescendant;

        if (toFocus) {
            _insideGroup = true;
            _active = true;
            toFocus.focus();
            return true;
        }

        return false;
    }

    // ---- Keyboard handler ----

    function _onKeyDown(e: KeyboardEvent): void {
        const key = e.key;

        // Let the component handle keys it has opted out of.
        // `Tab` is handled specially inside the Tab branch so that consumers
        // can request "enter on Tab from container" via `{ Tab: true }`
        // (mirroring full Tabster's dummy-input based natural Tab entry).
        if (key !== "Tab" && options?.ignoreKeydown?.[key]) {
            return;
        }

        const doc = element.ownerDocument;
        const active = doc.activeElement as HTMLElement | null;
        let target = e.target as Element | null;

        // Prefer the currently focused element when focus is within this group.
        // This matches full Tabster behavior and avoids environment-specific
        // key event retargeting issues.
        if (active && (active === element || element.contains(active))) {
            target = active;
        }

        // Some synthetic environments dispatch key events from document/body.
        // In those cases, use the currently focused element as the key target.
        const isInvalidTarget =
            !(target instanceof HTMLElement) ||
            target === doc.body ||
            target === doc.documentElement;

        if (isInvalidTarget) {
            target = active;
        }

        if (!(target instanceof HTMLElement)) {
            return;
        }

        const isInsideContainer =
            element.contains(target) && target !== element;

        if (
            key === "Enter" ||
            key === "NumpadEnter" ||
            key === "enter" ||
            key === "Return"
        ) {
            if (!_insideGroup && (target === element || isInsideContainer)) {
                if (
                    !delegated ||
                    target === element ||
                    target === _findDelegate(element, options?.delegateFocus)
                ) {
                    if (_enterFromContainer()) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            }

            return;
        }

        if (delegated && !_insideGroup && isInsideContainer) {
            return;
        }

        if (!isInsideContainer && target !== element) {
            return;
        }

        if (key === "Tab") {
            const isShift = e.shiftKey;

            if (!_insideGroup && !_isLimited()) {
                return;
            }

            if (!_insideGroup && _isLimited()) {
                // When the consumer opts into `ignoreKeydown: { Tab: true }`
                // on a LimitedTrapFocus groupper, Tab on the container
                // enters the group (mirroring full Tabster's natural Tab
                // entry via dummy inputs).
                if (
                    _isTrapFocus() &&
                    options?.ignoreKeydown?.Tab &&
                    target === element
                ) {
                    const allFocusable = findAll({
                        container: element,
                        includeProgrammaticallyFocusable: true,
                    });
                    const innerFocusable = allFocusable.filter(
                        (el) => el !== element
                    );
                    const toFocus = isShift
                        ? innerFocusable[innerFocusable.length - 1]
                        : innerFocusable[0];
                    if (toFocus) {
                        e.preventDefault();
                        e.stopPropagation();
                        _insideGroup = true;
                        _active = true;
                        _setInnerTabbable(true);
                        toFocus.focus();
                        return;
                    }
                }

                // In limited modes, Tab on the container exits the group without entering.
                // Child tabbability stays disabled until explicit Enter or direct inner focus.
                if (target === element || !isInsideContainer) {
                    _insideGroup = false;
                    _active = false;
                    return;
                }
            }

            if (_insideGroup) {
                // In LimitedTrapFocus, the trap only applies after the group
                // has been explicitly entered (_active=true, e.g. via Enter
                // key or GroupperMoveFocusEvent). When _active is false
                // (e.g. imperative .focus() landed on a descendant), let
                // the browser default Tab order handle it — with sibling
                // descendants at tabindex=-1, Tab will exit the group.
                if (_isTrapFocus() && !_active) {
                    return;
                }

                const allFocusable = findAll({
                    container: element,
                    includeProgrammaticallyFocusable: true,
                });
                const first = allFocusable[0];
                const last = allFocusable[allFocusable.length - 1];
                const atFirst = target === first || !isInsideContainer;
                const atLast = target === last || !isInsideContainer;

                if (_isTrapFocus()) {
                    const innerFocusable = allFocusable.filter(
                        (el) => el !== element
                    );
                    const firstInner = innerFocusable[0] ?? null;
                    const lastInner =
                        innerFocusable[innerFocusable.length - 1] ?? null;

                    if (!isShift && target === lastInner) {
                        e.preventDefault();
                        e.stopPropagation();
                        (firstInner ?? first)?.focus();
                        return;
                    }

                    if (isShift && target === element) {
                        e.preventDefault();
                        e.stopPropagation();
                        (lastInner ?? last)?.focus();
                        return;
                    }

                    const currentIdx = allFocusable.indexOf(target);

                    // Shift+Tab from the first inner element should move to the
                    // groupper container first (for parity with full Tabster).
                    if (isShift && target === firstInner) {
                        e.preventDefault();
                        e.stopPropagation();
                        element.focus();
                        return;
                    }

                    if (!isShift && !atLast && currentIdx !== -1) {
                        const next = allFocusable[currentIdx + 1];
                        if (next) {
                            e.preventDefault();
                            e.stopPropagation();
                            next.focus();
                        }
                        return;
                    }

                    if (isShift && !atFirst && currentIdx !== -1) {
                        const prev = allFocusable[currentIdx - 1];
                        if (prev) {
                            e.preventDefault();
                            e.stopPropagation();
                            prev.focus();
                        }
                        return;
                    }

                    // Cycle focus inside
                    if (!isShift && atLast) {
                        e.preventDefault();
                        e.stopPropagation();
                        (firstInner ?? first)?.focus();
                    } else if (isShift && atFirst) {
                        e.preventDefault();
                        e.stopPropagation();
                        (lastInner ?? last)?.focus();
                    }
                } else {
                    // Limited: allow browser default tab order to leave the group.
                    if (!isShift && atLast) {
                        _insideGroup = false;
                        _active = false;
                    } else if (isShift && atFirst) {
                        _insideGroup = false;
                        _active = false;
                    }
                }
            }
        } else if (key === "Escape" && _insideGroup) {
            if (_isLimited() || tabbability === GroupperTabbability.Unlimited) {
                e.preventDefault();
                e.stopPropagation();
                _insideGroup = false;
                _active = false;
                element.focus();
            }
        }
    }

    function _onFocusIn(e: FocusEvent): void {
        const target = e.target as HTMLElement;
        if (target === element) {
            // Focus landed on the container itself. If focus came from an
            // inner element, keep the group in "inside" mode so
            // LimitedTrapFocus can continue cycling from the container.
            const related = e.relatedTarget as HTMLElement | null;
            const cameFromInside =
                !!related && element.contains(related) && related !== element;

            _insideGroup = cameFromInside;
            _active = cameFromInside;
        } else if (element.contains(target)) {
            if (_isLimited()) {
                _insideGroup = true;

                if (!(_isTrapFocus() && !_active)) {
                    if (delegated) {
                        const delegate = _findDelegate(
                            element,
                            options?.delegateFocus
                        );
                        if (target !== delegate) {
                            _active = true;
                        }
                    } else {
                        _active = true;
                    }
                }
            }
        }
    }

    function _onFocusOut(e: FocusEvent): void {
        const related = e.relatedTarget as HTMLElement | null;
        if (!related || !element.contains(related)) {
            _insideGroup = false;
            _active = false;
        }
    }

    function _onMouseDown(e: MouseEvent | PointerEvent): void {
        if (!_isLimited()) {
            return;
        }

        const target = e.target as HTMLElement | null;
        if (!target || !element.contains(target)) {
            return;
        }

        if (target === element) {
            _insideGroup = false;
            _active = false;
            if (element.ownerDocument.activeElement !== element) {
                element.focus();
            }
            return;
        }

        const focusableTarget = (
            target.matches(FOCUSABLE_SELECTOR)
                ? target
                : target.closest(FOCUSABLE_SELECTOR)
        ) as HTMLElement | null;
        const isFocusableDescendant =
            !!focusableTarget && focusableTarget !== element;

        if (!isFocusableDescendant) {
            _insideGroup = false;
            _active = false;
            if (element.ownerDocument.activeElement !== element) {
                element.focus();
            }
            return;
        }

        _insideGroup = true;
        _active = true;

        if (
            focusableTarget &&
            element.ownerDocument.activeElement !== focusableTarget
        ) {
            focusableTarget.focus();
        }
    }

    function _onGroupperMoveFocus(e: Event): void {
        const moveFocusEvent = e as CustomEvent<{ action?: number }>;
        const action = moveFocusEvent.detail?.action;
        const source =
            (moveFocusEvent.composedPath?.()[0] as HTMLElement | undefined) ||
            (moveFocusEvent.target as HTMLElement | null) ||
            null;

        if (!source || !element.contains(source)) {
            return;
        }

        if (action === GroupperMoveFocusActions.Enter) {
            if (
                source === element ||
                (delegated &&
                    source === _findDelegate(element, options?.delegateFocus))
            ) {
                enter();
                moveFocusEvent.stopImmediatePropagation();
            }
        } else if (action === GroupperMoveFocusActions.Escape) {
            exit();
            moveFocusEvent.stopImmediatePropagation();
        }
    }

    // Note: the consumer is responsible for making the root element tabbable
    // (e.g. Card/ListItem set `tabIndex: 0` themselves). This matches the
    // historical Tabster contract where `useFocusableGroup` only emits
    // attributes and never mutates the root's tabindex. Descendant
    // tabindexes are also left untouched on mount so that the natural DOM
    // tab order is preserved for consumers/tests that don't go through the
    // groupper's keydown interception (e.g. jsdom + userEvent.tab()). Tab
    // behavior inside the group is enforced by the keydown handler below.

    const win = element.ownerDocument.defaultView;
    win?.addEventListener("keydown", _onKeyDown, true);
    win?.addEventListener(GroupperMoveFocusEventName, _onGroupperMoveFocus);
    element.addEventListener("keydown", _onKeyDown, true);
    element.addEventListener("mousedown", _onMouseDown);
    element.addEventListener("pointerdown", _onMouseDown);
    element.addEventListener("focusin", _onFocusIn);
    element.addEventListener("focusout", _onFocusOut);

    function enter(opts?: { focus?: boolean }): void {
        _insideGroup = true;
        _active = true;
        if (opts?.focus !== false) {
            const defaultEl = findDefault({
                container: element,
                includeProgrammaticallyFocusable: true,
            });
            const firstDescendant =
                findAll({
                    container: element,
                    includeProgrammaticallyFocusable: true,
                }).find((el) => el !== element) ?? null;
            const toFocus =
                defaultEl && defaultEl !== element
                    ? defaultEl
                    : firstDescendant;
            toFocus?.focus();
        }
    }

    function exit(opts?: { focus?: boolean }): void {
        // When focusing the container, focusin fires synchronously with
        // cameFromInside=true and would re-activate the group (setting
        // _active=true). Focus first, then reset state so the final
        // state reflects the exit.
        if (opts?.focus !== false) {
            element.focus();
        }
        _insideGroup = false;
        _active = false;
    }

    function isActive(): boolean | undefined {
        if (tabbability === GroupperTabbability.Unlimited) {
            return false;
        }

        return _active;
    }

    function dispose(): void {
        // Restore any descendant tabIndex values that were saved during the
        // group's lifetime (e.g. via `enter()` cycling) before tearing down.
        // Without this, re-instantiation (e.g. StrictMode/effect replay) can
        // preserve `tabIndex=-1` and break Enter/Tab behavior.
        if (_isLimited()) {
            _setInnerTabbable(true);
        }

        win?.removeEventListener("keydown", _onKeyDown, true);
        win?.removeEventListener(
            GroupperMoveFocusEventName,
            _onGroupperMoveFocus
        );
        element.removeEventListener("keydown", _onKeyDown, true);
        element.removeEventListener("mousedown", _onMouseDown);
        element.removeEventListener("pointerdown", _onMouseDown);
        element.removeEventListener("focusin", _onFocusIn);
        element.removeEventListener("focusout", _onFocusOut);
    }

    return {
        get element() {
            return element;
        },
        enter,
        exit,
        isActive,
        dispose,
    };
}
