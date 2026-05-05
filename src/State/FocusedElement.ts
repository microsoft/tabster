/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    KEYBORG_FOCUSIN,
    KEYBORG_FOCUSOUT,
    type KeyborgFocusInEvent,
    type KeyborgFocusOutEvent,
} from "keyborg";

import {
    _findDefaultFocusable,
    _isElementVisible,
    _isFocusable,
} from "../Focusable.js";
import { getTabsterContext } from "../Context.js";
import { findNextTabbable } from "../Tab.js";
import type * as Types from "../Types.js";
import { AsyncFocusSources } from "../Consts.js";
import { TabsterFocusInEvent, TabsterFocusOutEvent } from "../Events.js";
import {
    addListener,
    clearTimer,
    createTimer,
    dispatchEvent,
    documentContains,
    getLastChild,
    removeListener,
    setTimer,
    shouldIgnoreFocus,
    type Timer,
    WeakHTMLElement,
} from "../Utils.js";
import { dom } from "../DOMAPI.js";
import { createSubscribable } from "./Subscribable.js";

const AsyncFocusIntentPriorityBySource = {
    [AsyncFocusSources.Restorer]: 0,
    [AsyncFocusSources.Deloser]: 1,
    [AsyncFocusSources.EscapeGroupper]: 2,
};

interface AsyncFocus {
    source: Types.AsyncFocusSource;
    callback: () => void;
    timer: Timer;
}

/**
 * Internal shape of the focused-element state. Public surface is
 * deliberately slim (just `dispose`, `subscribe*`/`unsubscribe`,
 * `getFocusedElement`, `focus`); rarely-touched helpers like `focusFirst`,
 * `resetFocus`, `requestAsyncFocus`, etc. live as module-level functions
 * (`_focusFirst`, `_resetFocus`, ...) so they tree-shake out of fixtures
 * that don't pull a feature module that needs them. The cast back to this
 * interface lets those helpers reach the few stateful slots
 * (`_lastVal`, `_asyncFocus`, `_nextVal`) without paying for them on every
 * api consumer that doesn't.
 */
interface FocusedElementStateInternal extends Types.FocusedElementState {
    _nextVal:
        | {
              element: WeakHTMLElement | undefined;
              detail: Types.FocusedElementDetail;
          }
        | undefined;
    _lastVal: WeakHTMLElement | undefined;
    _asyncFocus: AsyncFocus | undefined;
}

let _lastResetElement: WeakHTMLElement | undefined;

function setOrRemoveAttribute(
    element: HTMLElement,
    name: string,
    value: string | null
): void {
    if (value === null) {
        element.removeAttribute(name);
    } else {
        element.setAttribute(name, value);
    }
}

export function createFocusedElementState(
    tabster: Types.TabsterCore,
    getWindow: Types.GetWindow
): Types.FocusedElementState {
    const sub = createSubscribable<
        HTMLElement | undefined,
        Types.FocusedElementDetail
    >();
    let nextVal:
        | {
              element: WeakHTMLElement | undefined;
              detail: Types.FocusedElementDetail;
          }
        | undefined;
    let lastVal: WeakHTMLElement | undefined;
    let asyncFocus: AsyncFocus | undefined;

    const setVal = (
        val: HTMLElement | undefined,
        detail: Types.FocusedElementDetail
    ): void => {
        sub.setVal(val, detail);

        if (val) {
            lastVal = new WeakHTMLElement(val);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validateFocusedElement = (element: HTMLElement): void => {
        // TODO: Make sure this is not needed anymore and write tests.
    };

    const setFocusedElement = (
        element?: HTMLElement,
        relatedTarget?: HTMLElement,
        isFocusedProgrammatically?: boolean
    ): void => {
        if (tabster._noop) {
            return;
        }

        const detail: Types.FocusedElementDetail = { relatedTarget };

        if (element) {
            const lastResetElement = _lastResetElement?.get();
            _lastResetElement = undefined;

            if (lastResetElement === element || shouldIgnoreFocus(element)) {
                return;
            }

            detail.isFocusedProgrammatically = isFocusedProgrammatically;

            const ctx = getTabsterContext(tabster, element);

            const modalizerId = ctx?.modalizer?.userId;

            if (modalizerId) {
                detail.modalizerId = modalizerId;
            }
        }

        const tracked = (nextVal = {
            element: element ? new WeakHTMLElement(element) : undefined,
            detail,
        });

        if (element && element !== sub.getVal()) {
            validateFocusedElement(element);
        }

        // validateFocusedElement() might cause the refocus which will trigger
        // another call to this function. Making sure that the value is correct.
        if (nextVal === tracked) {
            setVal(element, detail);
        }

        nextVal = undefined;
    };

    const onFocusIn = (e: KeyborgFocusInEvent): void => {
        const target = e.composedPath()[0] as HTMLElement;

        if (target) {
            setFocusedElement(
                target,
                e.detail.relatedTarget as HTMLElement | undefined,
                e.detail.isFocusedProgrammatically
            );
        }
    };

    const onFocusOut = (e: KeyborgFocusOutEvent): void => {
        setFocusedElement(
            undefined,
            e.detail?.originalEvent.relatedTarget as HTMLElement | undefined
        );
    };

    const onChanged = (
        element: HTMLElement | undefined,
        detail: Types.FocusedElementDetail
    ): void => {
        if (element) {
            dispatchEvent(element, new TabsterFocusInEvent(detail));
        } else {
            const last = lastVal?.get();

            if (last) {
                const d = { ...detail };
                const lastCtx = getTabsterContext(tabster, last);
                const modalizerId = lastCtx?.modalizer?.userId;

                if (modalizerId) {
                    d.modalizerId = modalizerId;
                }

                dispatchEvent(last, new TabsterFocusOutEvent(d));
            }
        }
    };

    tabster.queueInit(() => {
        const win = getWindow();
        const doc = win.document;

        // Add these event listeners as capture - we want Tabster to run before user event handlers
        addListener(doc, KEYBORG_FOCUSIN, onFocusIn as EventListener, true);
        addListener(doc, KEYBORG_FOCUSOUT, onFocusOut as EventListener, true);

        const activeElement = dom.getActiveElement(doc);

        if (activeElement && activeElement !== doc.body) {
            setFocusedElement(activeElement as HTMLElement);
        }

        sub.subscribe(onChanged);
    });

    const api: FocusedElementStateInternal = {
        get _nextVal() {
            return nextVal;
        },
        set _nextVal(value) {
            nextVal = value;
        },
        get _lastVal() {
            return lastVal;
        },
        set _lastVal(value) {
            lastVal = value;
        },
        get _asyncFocus() {
            return asyncFocus;
        },
        set _asyncFocus(value) {
            asyncFocus = value;
        },

        subscribe: sub.subscribe,
        subscribeFirst: sub.subscribeFirst,
        unsubscribe: sub.unsubscribe,

        dispose(): void {
            sub.dispose();

            const win = getWindow();
            const doc = win.document;

            removeListener(
                doc,
                KEYBORG_FOCUSIN,
                onFocusIn as EventListener,
                true
            );
            removeListener(
                doc,
                KEYBORG_FOCUSOUT,
                onFocusOut as EventListener,
                true
            );

            sub.unsubscribe(onChanged);

            if (asyncFocus) {
                clearTimer(asyncFocus.timer, win);
                asyncFocus = undefined;
            }

            _lastResetElement = undefined;

            nextVal = undefined;
            lastVal = undefined;
        },

        getFocusedElement(): HTMLElement | undefined {
            return sub.getVal();
        },

        focus(
            element: HTMLElement,
            noFocusedProgrammaticallyFlag?: boolean,
            noAccessibleCheck?: boolean,
            preventScroll?: boolean
        ): boolean {
            if (
                !_isFocusable(
                    tabster,
                    element,
                    noFocusedProgrammaticallyFlag,
                    false,
                    noAccessibleCheck
                )
            ) {
                return false;
            }

            element.focus({ preventScroll });

            return true;
        },
    };

    return api;
}

/**
 * Forgets any focused-element references that point inside `parent` —
 * called by `Tabster.forceCleanup` when a subtree is being torn down so
 * we don't keep dangling weakrefs.
 */
export function _forgetMemorized(
    instance: Types.FocusedElementState,
    parent: HTMLElement
): void {
    const internal = instance as FocusedElementStateInternal;

    let wel = _lastResetElement;
    let el = wel && wel.get();
    if (el && dom.nodeContains(parent, el)) {
        _lastResetElement = undefined;
    }

    el = internal._nextVal?.element?.get();
    if (el && dom.nodeContains(parent, el)) {
        internal._nextVal = undefined;
    }

    wel = internal._lastVal;
    el = wel && wel.get();
    if (el && dom.nodeContains(parent, el)) {
        internal._lastVal = undefined;
    }
}

/**
 * Parent-context fallback used by Mover/Groupper findNext strategies — when
 * the part itself yields nothing, walk up to the parent context and recurse.
 * Exported so the bytes only join the bundle when getMover or getGroupper is
 * imported. Modalizer is a hard trap and never calls this.
 */
export function findNextTabbableWithParentFallback(
    tabster: Types.TabsterCore,
    part: Types.TabsterPartWithFindNextTabbable & {
        getElement(): HTMLElement | undefined;
    },
    container: HTMLElement | undefined,
    currentElement: HTMLElement | undefined,
    referenceElement: HTMLElement | undefined,
    isBackward: boolean | undefined,
    ignoreAccessibility: boolean | undefined
): Types.NextTabbable | null {
    let next = part.findNextTabbable(
        currentElement,
        referenceElement,
        isBackward,
        ignoreAccessibility
    );

    if (currentElement && !next?.element) {
        const parentElement = dom.getParentElement(part.getElement());

        if (parentElement) {
            const parentCtx = getTabsterContext(tabster, currentElement, {
                referenceElement: parentElement,
            });

            if (parentCtx) {
                const currentScopeElement = part.getElement();
                const newCurrent = isBackward
                    ? currentScopeElement
                    : (currentScopeElement &&
                          getLastChild(currentScopeElement)) ||
                      currentScopeElement;

                if (newCurrent) {
                    next = findNextTabbable(
                        tabster,
                        parentCtx,
                        container,
                        newCurrent,
                        parentElement,
                        isBackward,
                        ignoreAccessibility
                    );

                    if (next) {
                        next.outOfDOMOrder = true;
                    }
                }
            }
        }
    }

    return next;
}

// -----------------------------------------------------------------------
// Module-level focused-element helpers
//
// These used to live as methods on the `api` object returned by
// `createFocusedElementState`. Object methods aren't tree-shakeable, so
// they shipped to every consumer that pulled `tabster.focusedElement`. As
// module-level functions they only enter the bundle when something
// imports them — typically a feature module (Deloser/Modalizer/Groupper/
// RootDummyManager). Internal callers use the `_`-prefixed forms; public
// consumers use the `Tabster`-wrapper variants exported below.
// -----------------------------------------------------------------------

/** @internal */
export function _getLastFocusedElement(
    tabster: Types.TabsterCore
): HTMLElement | undefined {
    const state = tabster.focusedElement as FocusedElementStateInternal;
    let el = state._lastVal?.get();

    if (!el || (el && !documentContains(el.ownerDocument, el))) {
        state._lastVal = undefined;
        el = undefined;
    }

    return el;
}

/** @internal */
export function _getFirstOrLastTabbable(
    tabster: Types.TabsterCore,
    isFirst: boolean,
    props: Pick<Types.FindFocusableProps, "container" | "ignoreAccessibility">
): HTMLElement | undefined {
    const { container, ignoreAccessibility } = props;
    let toFocus: HTMLElement | null | undefined;

    if (container) {
        const ctx = getTabsterContext(tabster, container);

        if (ctx) {
            toFocus = findNextTabbable(
                tabster,
                ctx,
                container,
                undefined,
                undefined,
                !isFirst,
                ignoreAccessibility
            )?.element;
        }
    }

    if (toFocus && !dom.nodeContains(container, toFocus)) {
        toFocus = undefined;
    }

    return toFocus || undefined;
}

/** @internal */
export function _focusFirst(
    tabster: Types.TabsterCore,
    props: Types.FindFirstProps
): boolean {
    const toFocus = _getFirstOrLastTabbable(tabster, true, props);

    if (toFocus) {
        tabster.focusedElement.focus(toFocus, false, true);
        return true;
    }

    return false;
}

/** @internal */
export function _focusLast(
    tabster: Types.TabsterCore,
    props: Types.FindFirstProps
): boolean {
    const toFocus = _getFirstOrLastTabbable(tabster, false, props);

    if (toFocus) {
        tabster.focusedElement.focus(toFocus, false, true);
        return true;
    }

    return false;
}

/** @internal */
export function _focusDefault(
    tabster: Types.TabsterCore,
    container: HTMLElement
): boolean {
    const el = _findDefaultFocusable(tabster, { container });

    if (el) {
        tabster.focusedElement.focus(el);
        return true;
    }

    return false;
}

/** @internal */
export function _resetFocus(
    tabster: Types.TabsterCore,
    container: HTMLElement
): boolean {
    if (!_isElementVisible(container)) {
        return false;
    }

    if (!_isFocusable(tabster, container, true, true, true)) {
        const prevTabIndex = container.getAttribute("tabindex");
        const prevAriaHidden = container.getAttribute("aria-hidden");

        container.tabIndex = -1;
        container.setAttribute("aria-hidden", "true");

        _lastResetElement = new WeakHTMLElement(container);

        tabster.focusedElement.focus(container, true, true);

        setOrRemoveAttribute(container, "tabindex", prevTabIndex);
        setOrRemoveAttribute(container, "aria-hidden", prevAriaHidden);
    } else {
        tabster.focusedElement.focus(container);
    }

    return true;
}

/** @internal */
export function _requestAsyncFocus(
    tabster: Types.TabsterCore,
    source: Types.AsyncFocusSource,
    callback: () => void,
    delay: number
): void {
    const state = tabster.focusedElement as FocusedElementStateInternal;
    const win = tabster.getWindow();
    const current = state._asyncFocus;

    if (current) {
        if (
            AsyncFocusIntentPriorityBySource[source] >
            AsyncFocusIntentPriorityBySource[current.source]
        ) {
            // Previously registered intent has higher priority.
            return;
        }

        // New intent has higher priority.
        clearTimer(current.timer, win);
    }

    const timer = createTimer();
    state._asyncFocus = {
        source,
        callback,
        timer,
    };
    setTimer(
        timer,
        win,
        () => {
            state._asyncFocus = undefined;
            callback();
        },
        delay
    );
}

/** @internal */
export function _cancelAsyncFocus(
    tabster: Types.TabsterCore,
    source: Types.AsyncFocusSource
): void {
    const state = tabster.focusedElement as FocusedElementStateInternal;

    if (state._asyncFocus?.source === source) {
        clearTimer(state._asyncFocus.timer, tabster.getWindow());
        state._asyncFocus = undefined;
    }
}

// -----------------------------------------------------------------------
// Public API — take the `Tabster` wrapper. Re-exported from `index.ts`.
// -----------------------------------------------------------------------

/**
 * Returns the last element that was focused via Tabster, if it is still in
 * the document. Used to be `tabster.focusedElement.getLastFocusedElement()`.
 */
export function getLastFocusedElement(
    tabster: Types.Tabster
): HTMLElement | undefined {
    return _getLastFocusedElement(tabster.core);
}

/**
 * Focuses the first tabbable element in `props.container`. Used to be
 * `tabster.focusedElement.focusFirst(props)`.
 */
export function focusFirst(
    tabster: Types.Tabster,
    props: Types.FindFirstProps
): boolean {
    return _focusFirst(tabster.core, props);
}

/**
 * Focuses the last tabbable element in `props.container`. Used to be
 * `tabster.focusedElement.focusLast(props)`.
 */
export function focusLast(
    tabster: Types.Tabster,
    props: Types.FindFirstProps
): boolean {
    return _focusLast(tabster.core, props);
}

/**
 * Focuses the element marked as `[isDefault]` within `container`. Used to
 * be `tabster.focusedElement.focusDefault(container)`.
 */
export function focusDefault(
    tabster: Types.Tabster,
    container: HTMLElement
): boolean {
    return _focusDefault(tabster.core, container);
}

/**
 * Focuses `container` itself, applying a temporary `tabindex=-1` /
 * `aria-hidden=true` if it isn't already focusable. Used to be
 * `tabster.focusedElement.resetFocus(container)`.
 */
export function resetFocus(
    tabster: Types.Tabster,
    container: HTMLElement
): boolean {
    return _resetFocus(tabster.core, container);
}
