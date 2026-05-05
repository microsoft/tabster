/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    KEYBORG_FOCUSIN,
    KEYBORG_FOCUSOUT,
    type KeyborgFocusInEvent,
    type KeyborgFocusOutEvent,
    nativeFocus,
} from "keyborg";

import {
    _findDefaultFocusable,
    _findFocusable,
    _isElementVisible,
    _isFocusable,
} from "../Focusable.js";
import { Keys } from "../Keys.js";
import { getTabsterContext } from "../Context.js";
import type * as Types from "../Types.js";
import { AsyncFocusSources } from "../Consts.js";
import {
    TabsterFocusInEvent,
    TabsterFocusOutEvent,
    TabsterMoveFocusEvent,
} from "../Events.js";
import { DummyInputManager } from "../DummyInput.js";
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
import { getTabsterOnElement } from "../Instance.js";
import { dom } from "../DOMAPI.js";
import { createSubscribable } from "./Subscribable.js";

function getUncontrolledCompletelyContainer(
    tabster: Types.TabsterCore,
    element: HTMLElement
): HTMLElement | undefined {
    const getParent = tabster.getParent;
    let el: HTMLElement | null = element;

    do {
        const uncontrolledOnElement = getTabsterOnElement(
            tabster,
            el
        )?.uncontrolled;

        if (
            uncontrolledOnElement &&
            tabster.uncontrolled.isUncontrolledCompletely(
                el,
                !!uncontrolledOnElement.completely
            )
        ) {
            return el;
        }

        el = getParent(el) as HTMLElement | null;
    } while (el);

    return undefined;
}

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

interface FocusedElementStateInternal extends Types.FocusedElementState {
    _nextVal:
        | {
              element: WeakHTMLElement | undefined;
              detail: Types.FocusedElementDetail;
          }
        | undefined;
    _lastVal: WeakHTMLElement | undefined;
}

let _lastResetElement: WeakHTMLElement | undefined;

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

    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== Keys.Tab || event.ctrlKey) {
            return;
        }

        const currentElement = sub.getVal();

        if (
            !currentElement ||
            !currentElement.ownerDocument ||
            currentElement.contentEditable === "true"
        ) {
            return;
        }

        const controlTab = tabster.controlTab;
        const ctx = getTabsterContext(tabster, currentElement);

        if (!ctx || ctx.ignoreKeydown(event)) {
            return;
        }

        const isBackward = event.shiftKey;

        const next = FocusedElementState.findNextTabbable(
            tabster,
            ctx,
            undefined,
            currentElement,
            undefined,
            isBackward,
            true
        );

        const rootElement = ctx.root.getElement();

        if (!rootElement) {
            return;
        }

        const nextElement = next?.element;
        const uncontrolledCompletelyContainer =
            getUncontrolledCompletelyContainer(tabster, currentElement);

        if (nextElement) {
            const nextUncontrolled = next.uncontrolled;

            if (
                ctx.uncontrolled ||
                dom.nodeContains(nextUncontrolled, currentElement)
            ) {
                if (
                    (!next.outOfDOMOrder &&
                        nextUncontrolled === ctx.uncontrolled) ||
                    (uncontrolledCompletelyContainer &&
                        !dom.nodeContains(
                            uncontrolledCompletelyContainer,
                            nextElement
                        ))
                ) {
                    // Nothing to do, everything will be done by the browser or something
                    // that controls the uncontrolled area.
                    return;
                }

                // We are in uncontrolled area. We allow whatever controls it to move
                // focus, but we add a phantom dummy to make sure the focus is moved
                // to the correct place if the uncontrolled area allows default action.
                // We only need that in the controlled mode, because in uncontrolled
                // mode we have dummy inputs around everything that redirects focus.
                DummyInputManager.addPhantomDummyWithTarget(
                    tabster,
                    currentElement,
                    isBackward,
                    nextElement
                );

                return;
            }

            if (
                (nextUncontrolled && _isElementVisible(nextUncontrolled)) ||
                (nextElement.tagName === "IFRAME" &&
                    _isElementVisible(nextElement))
            ) {
                // For iframes and uncontrolled areas we always want to use default action to
                // move focus into.
                if (
                    dispatchEvent(
                        rootElement,
                        new TabsterMoveFocusEvent({
                            by: "root",
                            owner: rootElement,
                            next: nextElement,
                            relatedEvent: event,
                        })
                    )
                ) {
                    DummyInputManager.moveWithPhantomDummy(
                        tabster,
                        nextUncontrolled ?? nextElement,
                        false,
                        isBackward,
                        event
                    );
                }

                return;
            }

            if (controlTab || next?.outOfDOMOrder) {
                if (
                    dispatchEvent(
                        rootElement,
                        new TabsterMoveFocusEvent({
                            by: "root",
                            owner: rootElement,
                            next: nextElement,
                            relatedEvent: event,
                        })
                    )
                ) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    nativeFocus(nextElement);
                }
            } else {
                // We are in uncontrolled mode and the next element is in DOM order.
                // Just allow the default action.
            }
        } else {
            if (
                !uncontrolledCompletelyContainer &&
                dispatchEvent(
                    rootElement,
                    new TabsterMoveFocusEvent({
                        by: "root",
                        owner: rootElement,
                        next: null,
                        relatedEvent: event,
                    })
                )
            ) {
                ctx.root.moveOutWithDefaultAction(isBackward, event);
            }
        }
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

    const setOrRemoveAttribute = (
        element: HTMLElement,
        name: string,
        value: string | null
    ): void => {
        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    };

    tabster.queueInit(() => {
        const win = getWindow();
        const doc = win.document;

        // Add these event listeners as capture - we want Tabster to run before user event handlers
        addListener(doc, KEYBORG_FOCUSIN, onFocusIn as EventListener, true);
        addListener(doc, KEYBORG_FOCUSOUT, onFocusOut as EventListener, true);
        addListener(win, "keydown", onKeyDown, true);

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
            removeListener(win, "keydown", onKeyDown, true);

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

        getLastFocusedElement(): HTMLElement | undefined {
            let el = lastVal?.get();

            if (!el || (el && !documentContains(el.ownerDocument, el))) {
                lastVal = el = undefined;
            }

            return el;
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

        focusDefault(container: HTMLElement): boolean {
            const el = _findDefaultFocusable(tabster, { container });

            if (el) {
                tabster.focusedElement.focus(el);

                return true;
            }

            return false;
        },

        getFirstOrLastTabbable(
            isFirst: boolean,
            props: Pick<
                Types.FindFocusableProps,
                "container" | "ignoreAccessibility"
            >
        ): HTMLElement | undefined {
            const { container, ignoreAccessibility } = props;
            let toFocus: HTMLElement | null | undefined;

            if (container) {
                const ctx = getTabsterContext(tabster, container);

                if (ctx) {
                    toFocus = FocusedElementState.findNextTabbable(
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
        },

        focusFirst(props: Types.FindFirstProps): boolean {
            const toFocus = api.getFirstOrLastTabbable(true, props);

            if (toFocus) {
                api.focus(toFocus, false, true);

                return true;
            }

            return false;
        },

        focusLast(props: Types.FindFirstProps): boolean {
            const toFocus = api.getFirstOrLastTabbable(false, props);

            if (toFocus) {
                api.focus(toFocus, false, true);

                return true;
            }

            return false;
        },

        resetFocus(container: HTMLElement): boolean {
            if (!_isElementVisible(container)) {
                return false;
            }

            if (!_isFocusable(tabster, container, true, true, true)) {
                const prevTabIndex = container.getAttribute("tabindex");
                const prevAriaHidden = container.getAttribute("aria-hidden");

                container.tabIndex = -1;
                container.setAttribute("aria-hidden", "true");

                _lastResetElement = new WeakHTMLElement(container);

                api.focus(container, true, true);

                setOrRemoveAttribute(container, "tabindex", prevTabIndex);
                setOrRemoveAttribute(container, "aria-hidden", prevAriaHidden);
            } else {
                api.focus(container);
            }

            return true;
        },

        requestAsyncFocus(
            source: Types.AsyncFocusSource,
            callback: () => void,
            delay: number
        ): void {
            const win = tabster.getWindow();
            const currentAsyncFocus = asyncFocus;

            if (currentAsyncFocus) {
                if (
                    AsyncFocusIntentPriorityBySource[source] >
                    AsyncFocusIntentPriorityBySource[currentAsyncFocus.source]
                ) {
                    // Previously registered intent has higher priority.
                    return;
                }

                // New intent has higher priority.
                clearTimer(currentAsyncFocus.timer, win);
            }

            const timer = createTimer();
            asyncFocus = {
                source,
                callback,
                timer,
            };
            setTimer(
                timer,
                win,
                () => {
                    asyncFocus = undefined;
                    callback();
                },
                delay
            );
        },

        cancelAsyncFocus(source: Types.AsyncFocusSource): void {
            if (asyncFocus?.source === source) {
                clearTimer(asyncFocus.timer, tabster.getWindow());
                asyncFocus = undefined;
            }
        },
    };

    return api;
}

const _isTabbingTimer: Timer = createTimer();

export const FocusedElementState = {
    isTabbing: false,

    forgetMemorized(
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
    },

    findNextTabbable(
        tabster: Types.TabsterCore,
        ctx: Types.TabsterContext,
        container?: HTMLElement,
        currentElement?: HTMLElement,
        referenceElement?: HTMLElement,
        isBackward?: boolean,
        ignoreAccessibility?: boolean
    ): Types.NextTabbable | null {
        const actualContainer = container || ctx.root.getElement();

        if (!actualContainer) {
            return null;
        }

        let next: Types.NextTabbable | null = null;

        const win = tabster.getWindow();

        FocusedElementState.isTabbing = true;
        setTimer(
            _isTabbingTimer,
            win,
            () => {
                FocusedElementState.isTabbing = false;
            },
            0
        );

        const modalizer = ctx.modalizer;
        const groupper = ctx.groupper;
        const mover = ctx.mover;

        const callFindNext = (
            what: Types.Groupper | Types.Mover | Types.Modalizer
        ) => {
            next = what.findNextTabbable(
                currentElement,
                referenceElement,
                isBackward,
                ignoreAccessibility
            );

            if (currentElement && !next?.element) {
                const parentElement =
                    what !== modalizer &&
                    dom.getParentElement(what.getElement());

                if (parentElement) {
                    const parentCtx = getTabsterContext(
                        tabster,
                        currentElement,
                        { referenceElement: parentElement }
                    );

                    if (parentCtx) {
                        const currentScopeElement = what.getElement();
                        const newCurrent = isBackward
                            ? currentScopeElement
                            : (currentScopeElement &&
                                  getLastChild(currentScopeElement)) ||
                              currentScopeElement;

                        if (newCurrent) {
                            next = FocusedElementState.findNextTabbable(
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
        };

        if (groupper && mover) {
            callFindNext(ctx.groupperBeforeMover ? groupper : mover);
        } else if (groupper) {
            callFindNext(groupper);
        } else if (mover) {
            callFindNext(mover);
        } else if (modalizer) {
            callFindNext(modalizer);
        } else {
            const findProps: Types.FindNextProps = {
                container: actualContainer,
                currentElement,
                referenceElement,
                ignoreAccessibility,
                useActiveModalizer: true,
            };

            const findPropsOut: Types.FindFocusableOutputProps = {};

            const nextElement = _findFocusable(
                tabster,
                { ...findProps, isBackward },
                findPropsOut
            );

            next = {
                element: nextElement,
                outOfDOMOrder: findPropsOut.outOfDOMOrder,
                uncontrolled: findPropsOut.uncontrolled,
            };
        }

        return next;
    },
};
