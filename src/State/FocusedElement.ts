/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    KEYBORG_FOCUSIN,
    KEYBORG_FOCUSOUT,
    KeyborgFocusInEvent,
    KeyborgFocusOutEvent,
    nativeFocus,
} from "keyborg";

import { Keys } from "../Keys";
import { RootAPI } from "../Root";
import * as Types from "../Types";
import { AsyncFocusSources } from "../Consts";
import {
    TabsterFocusInEvent,
    TabsterFocusOutEvent,
    TabsterMoveFocusEvent,
} from "../Events";
import {
    documentContains,
    DummyInputManager,
    getLastChild,
    shouldIgnoreFocus,
    WeakHTMLElement,
} from "../Utils";
import { getTabsterOnElement } from "../Instance";
import { dom } from "../DOMAPI";
import { Subscribable } from "./Subscribable";

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

export class FocusedElementState
    extends Subscribable<HTMLElement | undefined, Types.FocusedElementDetail>
    implements Types.FocusedElementState
{
    private static _lastResetElement: WeakHTMLElement | undefined;
    private static _isTabbingTimer: number | undefined;
    static isTabbing = false;

    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _nextVal:
        | {
              element: WeakHTMLElement | undefined;
              detail: Types.FocusedElementDetail;
          }
        | undefined;
    private _lastVal: WeakHTMLElement | undefined;
    private _asyncFocus?: AsyncFocus;

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        super();

        this._tabster = tabster;
        this._win = getWindow;
        tabster.queueInit(this._init);
    }

    private _init = (): void => {
        const win = this._win();
        const doc = win.document;

        // Add these event listeners as capture - we want Tabster to run before user event handlers
        doc.addEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true);
        doc.addEventListener(KEYBORG_FOCUSOUT, this._onFocusOut, true);
        win.addEventListener("keydown", this._onKeyDown, true);

        const activeElement = dom.getActiveElement(doc);

        if (activeElement && activeElement !== doc.body) {
            this._setFocusedElement(activeElement as HTMLElement);
        }

        this.subscribe(this._onChanged);
    };

    dispose(): void {
        super.dispose();

        const win = this._win();
        const doc = win.document;

        doc.removeEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true);
        doc.removeEventListener(KEYBORG_FOCUSOUT, this._onFocusOut, true);
        win.removeEventListener("keydown", this._onKeyDown, true);

        this.unsubscribe(this._onChanged);

        const asyncFocus = this._asyncFocus;
        if (asyncFocus) {
            win.clearTimeout(asyncFocus.timeout);
            delete this._asyncFocus;
        }

        delete FocusedElementState._lastResetElement;

        delete this._nextVal;
        delete this._lastVal;
    }

    static forgetMemorized(
        instance: Types.FocusedElementState,
        parent: HTMLElement
    ): void {
        let wel = FocusedElementState._lastResetElement;
        let el = wel && wel.get();
        if (el && dom.nodeContains(parent, el)) {
            delete FocusedElementState._lastResetElement;
        }

        el = (instance as FocusedElementState)._nextVal?.element?.get();
        if (el && dom.nodeContains(parent, el)) {
            delete (instance as FocusedElementState)._nextVal;
        }

        wel = (instance as FocusedElementState)._lastVal;
        el = wel && wel.get();
        if (el && dom.nodeContains(parent, el)) {
            delete (instance as FocusedElementState)._lastVal;
        }
    }

    getFocusedElement(): HTMLElement | undefined {
        return this.getVal();
    }

    getLastFocusedElement(): HTMLElement | undefined {
        let el = this._lastVal?.get();

        if (!el || (el && !documentContains(el.ownerDocument, el))) {
            this._lastVal = el = undefined;
        }

        return el;
    }

    focus(
        element: HTMLElement,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean,
        preventScroll?: boolean
    ): boolean {
        if (
            !this._tabster.focusable.isFocusable(
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
    }

    focusDefault(container: HTMLElement): boolean {
        const el = this._tabster.focusable.findDefault({ container });

        if (el) {
            this._tabster.focusedElement.focus(el);

            return true;
        }

        return false;
    }

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
            const ctx = RootAPI.getTabsterContext(this._tabster, container);

            if (ctx) {
                toFocus = FocusedElementState.findNextTabbable(
                    this._tabster,
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

    private _focusFirstOrLast(
        isFirst: boolean,
        props: Types.FindFirstProps
    ): boolean {
        const toFocus = this.getFirstOrLastTabbable(isFirst, props);

        if (toFocus) {
            this.focus(toFocus, false, true);

            return true;
        }

        return false;
    }

    focusFirst(props: Types.FindFirstProps): boolean {
        return this._focusFirstOrLast(true, props);
    }

    focusLast(props: Types.FindFirstProps): boolean {
        return this._focusFirstOrLast(false, props);
    }

    resetFocus(container: HTMLElement): boolean {
        if (!this._tabster.focusable.isVisible(container)) {
            return false;
        }

        if (!this._tabster.focusable.isFocusable(container, true, true, true)) {
            const prevTabIndex = container.getAttribute("tabindex");
            const prevAriaHidden = container.getAttribute("aria-hidden");

            container.tabIndex = -1;
            container.setAttribute("aria-hidden", "true");

            FocusedElementState._lastResetElement = new WeakHTMLElement(
                this._win,
                container
            );

            this.focus(container, true, true);

            this._setOrRemoveAttribute(container, "tabindex", prevTabIndex);
            this._setOrRemoveAttribute(
                container,
                "aria-hidden",
                prevAriaHidden
            );
        } else {
            this.focus(container);
        }

        return true;
    }

    requestAsyncFocus(
        source: Types.AsyncFocusSource,
        callback: () => void,
        delay: number
    ): void {
        const win = this._tabster.getWindow();
        const currentAsyncFocus = this._asyncFocus;

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

        this._asyncFocus = {
            source,
            callback,
            timeout: win.setTimeout(() => {
                this._asyncFocus = undefined;
                callback();
            }, delay),
        };
    }

    cancelAsyncFocus(source: Types.AsyncFocusSource): void {
        const asyncFocus = this._asyncFocus;

        if (asyncFocus?.source === source) {
            this._tabster.getWindow().clearTimeout(asyncFocus.timeout);
            this._asyncFocus = undefined;
        }
    }

    private _setOrRemoveAttribute(
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

    private _setFocusedElement(
        element?: HTMLElement,
        relatedTarget?: HTMLElement,
        isFocusedProgrammatically?: boolean
    ): void {
        if (this._tabster._noop) {
            return;
        }

        const detail: Types.FocusedElementDetail = { relatedTarget };

        if (element) {
            const lastResetElement =
                FocusedElementState._lastResetElement?.get();
            FocusedElementState._lastResetElement = undefined;

            if (lastResetElement === element || shouldIgnoreFocus(element)) {
                return;
            }

            detail.isFocusedProgrammatically = isFocusedProgrammatically;

            const ctx = RootAPI.getTabsterContext(this._tabster, element);

            const modalizerId = ctx?.modalizer?.userId;

            if (modalizerId) {
                detail.modalizerId = modalizerId;
            }
        }

        const nextVal = (this._nextVal = {
            element: element
                ? new WeakHTMLElement(this._win, element)
                : undefined,
            detail,
        });

        if (element && element !== this._val) {
            this._validateFocusedElement(element);
        }

        // _validateFocusedElement() might cause the refocus which will trigger
        // another call to this function. Making sure that the value is correct.
        if (this._nextVal === nextVal) {
            this.setVal(element, detail);
        }

        this._nextVal = undefined;
    }

    protected setVal(
        val: HTMLElement | undefined,
        detail: Types.FocusedElementDetail
    ): void {
        super.setVal(val, detail);

        if (val) {
            this._lastVal = new WeakHTMLElement(this._win, val);
        }
    }

    private _onFocusIn = (e: KeyborgFocusInEvent): void => {
        const target = e.composedPath()[0] as HTMLElement;

        if (target) {
            this._setFocusedElement(
                target,
                e.detail.relatedTarget as HTMLElement | undefined,
                e.detail.isFocusedProgrammatically
            );
        }
    };

    private _onFocusOut = (e: KeyborgFocusOutEvent): void => {
        this._setFocusedElement(
            undefined,
            e.detail?.originalEvent.relatedTarget as HTMLElement | undefined
        );
    };

    static findNextTabbable(
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

        const isTabbingTimer = FocusedElementState._isTabbingTimer;
        const win = tabster.getWindow();

        if (isTabbingTimer) {
            win.clearTimeout(isTabbingTimer);
        }

        FocusedElementState.isTabbing = true;
        FocusedElementState._isTabbingTimer = win.setTimeout(() => {
            delete FocusedElementState._isTabbingTimer;
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
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _validateFocusedElement = (element: HTMLElement): void => {
        // TODO: Make sure this is not needed anymore and write tests.
    };

    private _onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== Keys.Tab || event.ctrlKey) {
            return;
        }

        const currentElement = this.getVal();

        if (
            !currentElement ||
            !currentElement.ownerDocument ||
            currentElement.contentEditable === "true"
        ) {
            return;
        }

        const tabster = this._tabster;
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

    _onChanged = (
        element: HTMLElement | undefined,
        detail: Types.FocusedElementDetail
    ): void => {
        if (element) {
            element.dispatchEvent(new TabsterFocusInEvent(detail));
        } else {
            const last = this._lastVal?.get();

            if (last) {
                const d = { ...detail };
                const lastCtx = RootAPI.getTabsterContext(this._tabster, last);
                const modalizerId = lastCtx?.modalizer?.userId;

                if (modalizerId) {
                    d.modalizerId = modalizerId;
                }

                last.dispatchEvent(new TabsterFocusOutEvent(d));
            }
        }
    };
}
