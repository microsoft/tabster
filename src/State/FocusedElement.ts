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

import { Keys } from "../Keys.js";
import { RootAPI } from "../Root.js";
import type * as Types from "../Types.js";
import { AsyncFocusSources } from "../Consts.js";
import {
    TabsterFocusInEvent,
    TabsterFocusOutEvent,
    TabsterMoveFocusEvent,
} from "../Events.js";
import { DummyInputManager } from "../DummyInput.js";
import {
    documentContains,
    getLastChild,
    shouldIgnoreFocus,
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
    timeout: number;
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

            const ctx = RootAPI.getTabsterContext(tabster, element);

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
        const ctx = RootAPI.getTabsterContext(tabster, currentElement);

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
                (nextUncontrolled &&
                    tabster.focusable.isVisible(nextUncontrolled)) ||
                (nextElement.tagName === "IFRAME" &&
                    tabster.focusable.isVisible(nextElement))
            ) {
                // For iframes and uncontrolled areas we always want to use default action to
                // move focus into.
                if (
                    rootElement.dispatchEvent(
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
                    rootElement.dispatchEvent(
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
                rootElement.dispatchEvent(
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
            element.dispatchEvent(new TabsterFocusInEvent(detail));
        } else {
            const last = lastVal?.get();

            if (last) {
                const d = { ...detail };
                const lastCtx = RootAPI.getTabsterContext(tabster, last);
                const modalizerId = lastCtx?.modalizer?.userId;

                if (modalizerId) {
                    d.modalizerId = modalizerId;
                }

                last.dispatchEvent(new TabsterFocusOutEvent(d));
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
        doc.addEventListener(KEYBORG_FOCUSIN, onFocusIn as EventListener, true);
        doc.addEventListener(
            KEYBORG_FOCUSOUT,
            onFocusOut as EventListener,
            true
        );
        win.addEventListener("keydown", onKeyDown, true);

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

            doc.removeEventListener(
                KEYBORG_FOCUSIN,
                onFocusIn as EventListener,
                true
            );
            doc.removeEventListener(
                KEYBORG_FOCUSOUT,
                onFocusOut as EventListener,
                true
            );
            win.removeEventListener("keydown", onKeyDown, true);

            sub.unsubscribe(onChanged);

            if (asyncFocus) {
                win.clearTimeout(asyncFocus.timeout);
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
                !tabster.focusable.isFocusable(
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
            const el = tabster.focusable.findDefault({ container });

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
                const ctx = RootAPI.getTabsterContext(tabster, container);

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
            if (!tabster.focusable.isVisible(container)) {
                return false;
            }

            if (!tabster.focusable.isFocusable(container, true, true, true)) {
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
                win.clearTimeout(currentAsyncFocus.timeout);
            }

            asyncFocus = {
                source,
                callback,
                timeout: win.setTimeout(() => {
                    asyncFocus = undefined;
                    callback();
                }, delay),
            };
        },

        cancelAsyncFocus(source: Types.AsyncFocusSource): void {
            if (asyncFocus?.source === source) {
                tabster.getWindow().clearTimeout(asyncFocus.timeout);
                asyncFocus = undefined;
            }
        },
    };

    return api;
}

let _isTabbingTimer: number | undefined;

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

        if (_isTabbingTimer) {
            win.clearTimeout(_isTabbingTimer);
        }

        FocusedElementState.isTabbing = true;
        _isTabbingTimer = win.setTimeout(() => {
            _isTabbingTimer = undefined;
            FocusedElementState.isTabbing = false;
        }, 0);

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
                    const parentCtx = RootAPI.getTabsterContext(
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

            const nextElement = tabster.focusable[
                isBackward ? "findPrev" : "findNext"
            ](findProps, findPropsOut);

            next = {
                element: nextElement,
                outOfDOMOrder: findPropsOut.outOfDOMOrder,
                uncontrolled: findPropsOut.uncontrolled,
            };
        }

        return next;
    },
};
