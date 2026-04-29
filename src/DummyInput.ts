/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import {
    type DummyInputObserver as DummyInputObserverInterface,
    type GetWindow,
    type SysProps,
    type TabsterCore,
} from "./Types.js";
import {
    SysDummyInputsPositions,
    TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME,
} from "./Consts.js";
import { TabsterMoveFocusEvent } from "./Events.js";
import { dom } from "./DOMAPI.js";
import { hasSubFocusable, makeFocusIgnored, WeakHTMLElement } from "./Utils.js";

const _updateDummyInputsTimeout = 100;

interface HTMLElementWithDummyContainer extends HTMLElement {
    __tabsterDummyContainer?: WeakHTMLElement;
}

interface HTMLElementWithDummyInputs extends HTMLElement {
    __tabsterDummy?: DummyInputManagerCore;
}

export interface DummyInputProps {
    /** The input is created to be used only once and autoremoved when focused. */
    isPhantom?: boolean;
    /** Whether the input is before or after the content it is guarding.  */
    isFirst: boolean;
}

export type DummyInputFocusCallback = (
    dummyInput: DummyInput,
    isBackward: boolean,
    relatedTarget: HTMLElement | null
) => void;

/**
 * Dummy HTML elements that are used as focus sentinels for the DOM enclosed within them
 */
export class DummyInput {
    private _isPhantom: DummyInputProps["isPhantom"];
    private _fixedTarget?: WeakHTMLElement;
    private _disposeTimer: number | undefined;
    private _clearDisposeTimeout: (() => void) | undefined;

    input: HTMLElement | undefined;
    useDefaultAction?: boolean;
    isFirst: DummyInputProps["isFirst"];
    isOutside: boolean;
    /** Called when the input is focused */
    onFocusIn?: DummyInputFocusCallback;
    /** Called when the input is blurred */
    onFocusOut?: DummyInputFocusCallback;

    constructor(
        getWindow: GetWindow,
        isOutside: boolean,
        props: DummyInputProps,
        element?: WeakHTMLElement,
        fixedTarget?: WeakHTMLElement
    ) {
        const win = getWindow();
        const input = win.document.createElement("i");

        input.tabIndex = 0;
        input.setAttribute("role", "none");

        input.setAttribute(TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME, "");
        input.setAttribute("aria-hidden", "true");

        const style = input.style;
        style.position = "fixed";
        style.width = style.height = "1px";
        style.opacity = "0.001";
        style.zIndex = "-1";
        style.setProperty("content-visibility", "hidden");

        makeFocusIgnored(input);

        this.input = input;
        this.isFirst = props.isFirst;
        this.isOutside = isOutside;
        this._isPhantom = props.isPhantom ?? false;
        this._fixedTarget = fixedTarget;

        input.addEventListener("focusin", this._focusIn);
        input.addEventListener("focusout", this._focusOut);

        (input as HTMLElementWithDummyContainer).__tabsterDummyContainer =
            element;

        if (this._isPhantom) {
            this._disposeTimer = win.setTimeout(() => {
                delete this._disposeTimer;
                this.dispose();
            }, 0);

            this._clearDisposeTimeout = () => {
                if (this._disposeTimer) {
                    win.clearTimeout(this._disposeTimer);
                    delete this._disposeTimer;
                }

                delete this._clearDisposeTimeout;
            };
        }
    }

    dispose(): void {
        if (this._clearDisposeTimeout) {
            this._clearDisposeTimeout();
        }

        const input = this.input;

        if (!input) {
            return;
        }

        delete this._fixedTarget;
        delete this.onFocusIn;
        delete this.onFocusOut;
        delete this.input;

        input.removeEventListener("focusin", this._focusIn);
        input.removeEventListener("focusout", this._focusOut);

        delete (input as HTMLElementWithDummyContainer).__tabsterDummyContainer;

        dom.getParentNode(input)?.removeChild(input);
    }

    setTopLeft(top: number, left: number): void {
        const style = this.input?.style;

        if (style) {
            style.top = `${top}px`;
            style.left = `${left}px`;
        }
    }

    private _isBackward(
        isIn: boolean,
        current: HTMLElement,
        previous: HTMLElement | null
    ): boolean {
        return isIn && !previous
            ? !this.isFirst
            : !!(
                  previous &&
                  current.compareDocumentPosition(previous) &
                      Node.DOCUMENT_POSITION_FOLLOWING
              );
    }

    private _focusIn = (e: FocusEvent): void => {
        if (this._fixedTarget) {
            const target = this._fixedTarget.get();

            if (target) {
                nativeFocus(target);
            }

            return;
        }

        const input = this.input;

        if (this.onFocusIn && input) {
            const relatedTarget = e.relatedTarget as HTMLElement | null;

            this.onFocusIn(
                this,
                this._isBackward(true, input, relatedTarget),
                relatedTarget
            );
        }
    };

    private _focusOut = (e: FocusEvent): void => {
        if (this._fixedTarget) {
            return;
        }

        this.useDefaultAction = false;

        const input = this.input;

        if (this.onFocusOut && input) {
            const relatedTarget = e.relatedTarget as HTMLElement | null;

            this.onFocusOut(
                this,
                this._isBackward(false, input, relatedTarget),
                relatedTarget
            );
        }
    };
}

export const DummyInputManagerPriorities = {
    Root: 1,
    Modalizer: 2,
    Mover: 3,
    Groupper: 4,
} as const;

export class DummyInputManager {
    private _instance?: DummyInputManagerCore;
    private _onFocusIn?: DummyInputFocusCallback;
    private _onFocusOut?: DummyInputFocusCallback;
    protected _element: WeakHTMLElement;

    constructor(
        tabster: TabsterCore,
        element: WeakHTMLElement,
        priority: number,
        sys: SysProps | undefined,
        outsideByDefault?: boolean,
        callForDefaultAction?: boolean
    ) {
        this._element = element;

        this._instance = new DummyInputManagerCore(
            tabster,
            element,
            this,
            priority,
            sys,
            outsideByDefault,
            callForDefaultAction
        );
    }

    protected _setHandlers(
        onFocusIn?: DummyInputFocusCallback,
        onFocusOut?: DummyInputFocusCallback
    ): void {
        this._onFocusIn = onFocusIn;
        this._onFocusOut = onFocusOut;
    }

    moveOut(backwards: boolean): void {
        this._instance?.moveOut(backwards);
    }

    moveOutWithDefaultAction(
        backwards: boolean,
        relatedEvent: KeyboardEvent
    ): void {
        this._instance?.moveOutWithDefaultAction(backwards, relatedEvent);
    }

    getHandler(isIn: boolean): DummyInputFocusCallback | undefined {
        return isIn ? this._onFocusIn : this._onFocusOut;
    }

    setTabbable(tabbable: boolean) {
        this._instance?.setTabbable(this, tabbable);
    }

    dispose(): void {
        if (this._instance) {
            this._instance.dispose(this);
            delete this._instance;
        }

        delete this._onFocusIn;
        delete this._onFocusOut;
    }

    static moveWithPhantomDummy(
        tabster: TabsterCore,
        element: HTMLElement, // The target element to move to or out of.
        moveOutOfElement: boolean, // Whether to move out of the element or into it.
        isBackward: boolean, // Are we tabbing of shift-tabbing?
        relatedEvent: KeyboardEvent // The event that triggered the move.
    ): void {
        // Phantom dummy is a hack to use browser's default action to move
        // focus from a specific point in the application to the next/previous
        // element. Default action is needed because next focusable element
        // is not always available to focus directly (for example, next focusable
        // is inside isolated iframe) or for uncontrolled areas we want to make
        // sure that something that controls it takes care of the focusing.
        // It works in a way that during the Tab key handling, we create a dummy
        // input element, place it to the specific place in the DOM and focus it,
        // then the default action of the Tab press will move focus from our dummy
        // input. And we remove it from the DOM right after that.
        const dummy: DummyInput = new DummyInput(tabster.getWindow, true, {
            isPhantom: true,
            isFirst: true,
        });

        const input = dummy.input;

        if (input) {
            let parent: HTMLElement | null;
            let insertBefore: HTMLElement | null;

            // Let's say we have a following DOM structure:
            // <div>
            //   <button>Button1</button>
            //   <div id="uncontrolled" data-tabster={uncontrolled: {}}>
            //     <button>Button2</button>
            //     <button>Button3</button>
            //   </div>
            //   <button>Button4</button>
            // </div>
            //
            // We pass the "uncontrolled" div as the element to move to or out of.
            //
            // When we pass moveOutOfElement=true and isBackward=false,
            // the phantom dummy input will be inserted before Button4.
            //
            // When we pass moveOutOfElement=true and isBackward=true, there are
            // two cases. If the uncontrolled element is focusable (has tabindex=0),
            // the phantom dummy input will be inserted after Button1. If the
            // uncontrolled element is not focusable, the phantom dummy input will be
            // inserted before Button2.
            //
            // When we pass moveOutOfElement=false and isBackward=false, the
            // phantom dummy input will be inserted after Button1.
            //
            // When we pass moveOutOfElement=false and isBackward=true, the phantom
            // dummy input will be inserted before Button4.
            //
            // And we have a corner case for <body> and we make sure that the inserted
            // dummy is inserted properly when there are existing permanent dummies.

            if (element.tagName === "BODY") {
                // We cannot insert elements outside of BODY.
                parent = element;
                insertBefore =
                    (moveOutOfElement && isBackward) ||
                    (!moveOutOfElement && !isBackward)
                        ? (dom.getFirstElementChild(
                              element
                          ) as HTMLElement | null)
                        : null;
            } else {
                if (
                    moveOutOfElement &&
                    (!isBackward ||
                        (isBackward &&
                            !tabster.focusable.isFocusable(
                                element,
                                false,
                                true,
                                true
                            )))
                ) {
                    parent = element;
                    insertBefore = isBackward
                        ? (element.firstElementChild as HTMLElement | null)
                        : null;
                } else {
                    parent = dom.getParentElement(element);
                    insertBefore =
                        (moveOutOfElement && isBackward) ||
                        (!moveOutOfElement && !isBackward)
                            ? element
                            : (dom.getNextElementSibling(
                                  element
                              ) as HTMLElement | null);
                }

                let potentialDummy: HTMLElement | null;
                let dummyFor: HTMLElement | null;

                do {
                    // This is a safety pillow for the cases when someone, combines
                    // groupper with uncontrolled on the same node. Which is technically
                    // not correct, but moving into the container element via its dummy
                    // input would produce a correct behaviour in uncontrolled mode.
                    potentialDummy = (
                        (moveOutOfElement && isBackward) ||
                        (!moveOutOfElement && !isBackward)
                            ? dom.getPreviousElementSibling(insertBefore)
                            : insertBefore
                    ) as HTMLElement | null;

                    dummyFor = getDummyInputContainer(potentialDummy);

                    if (dummyFor === element) {
                        insertBefore =
                            (moveOutOfElement && isBackward) ||
                            (!moveOutOfElement && !isBackward)
                                ? potentialDummy
                                : (dom.getNextElementSibling(
                                      potentialDummy
                                  ) as HTMLElement | null);
                    } else {
                        dummyFor = null;
                    }
                } while (dummyFor);
            }

            if (
                parent?.dispatchEvent(
                    new TabsterMoveFocusEvent({
                        by: "root",
                        owner: parent,
                        next: null,
                        relatedEvent,
                    })
                )
            ) {
                dom.insertBefore(parent, input, insertBefore);
                nativeFocus(input);
            }
        }
    }

    static addPhantomDummyWithTarget(
        tabster: TabsterCore,
        sourceElement: HTMLElement,
        isBackward: boolean,
        targetElement: HTMLElement
    ): void {
        const dummy: DummyInput = new DummyInput(
            tabster.getWindow,
            true,
            {
                isPhantom: true,
                isFirst: true,
            },
            undefined,
            new WeakHTMLElement(targetElement)
        );

        const input = dummy.input;

        if (input) {
            let dummyParent: HTMLElement | null;
            let insertBefore: HTMLElement | null;

            if (hasSubFocusable(sourceElement) && !isBackward) {
                dummyParent = sourceElement;
                insertBefore = dom.getFirstElementChild(
                    sourceElement
                ) as HTMLElement | null;
            } else {
                dummyParent = dom.getParentElement(sourceElement);
                insertBefore = isBackward
                    ? sourceElement
                    : (dom.getNextElementSibling(
                          sourceElement
                      ) as HTMLElement | null);
            }

            if (dummyParent) {
                dom.insertBefore(dummyParent, input, insertBefore);
            }
        }
    }
}

interface DummyInputWrapper {
    manager: DummyInputManager;
    priority: number;
    tabbable: boolean;
}

function setDummyInputDebugValue(
    dummy: DummyInput,
    wrappers: DummyInputWrapper[]
): void {
    const what: Record<number, string> = {
        1: "Root",
        2: "Modalizer",
        3: "Mover",
        4: "Groupper",
    };

    dummy.input?.setAttribute(
        TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME,
        [
            `isFirst=${dummy.isFirst}`,
            `isOutside=${dummy.isOutside}`,
            ...wrappers.map(
                (w) => `(${what[w.priority]}, tabbable=${w.tabbable})`
            ),
        ].join(", ")
    );
}

export class DummyInputObserver implements DummyInputObserverInterface {
    private _win?: GetWindow;
    private _updateQueue: Set<
        (
            scrollTopLeftCache: Map<
                HTMLElement,
                { scrollTop: number; scrollLeft: number } | null
            >
        ) => () => void
    > = new Set();
    private _updateTimer?: number;
    private _lastUpdateQueueTime = 0;
    private _changedParents: WeakSet<Node> = new WeakSet();
    private _updateDummyInputsTimer?: number;
    private _dummyElements: WeakHTMLElement<HTMLElement>[] = [];
    private _dummyCallbacks: WeakMap<HTMLElement, () => void> = new WeakMap();
    domChanged?(parent: HTMLElement): void;

    constructor(win: GetWindow) {
        this._win = win;
    }

    add(dummy: HTMLElement, callback: () => void): void {
        if (!this._dummyCallbacks.has(dummy) && this._win) {
            this._dummyElements.push(new WeakHTMLElement(dummy));
            this._dummyCallbacks.set(dummy, callback);
            this.domChanged = this._domChanged;
        }
    }

    remove(dummy: HTMLElement): void {
        this._dummyElements = this._dummyElements.filter((ref) => {
            const element = ref.get();
            return element && element !== dummy;
        });

        this._dummyCallbacks.delete(dummy);

        if (this._dummyElements.length === 0) {
            delete this.domChanged;
        }
    }

    dispose(): void {
        const win = this._win?.();

        if (this._updateTimer) {
            win?.clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }

        if (this._updateDummyInputsTimer) {
            win?.clearTimeout(this._updateDummyInputsTimer);
            delete this._updateDummyInputsTimer;
        }

        this._changedParents = new WeakSet();
        this._dummyCallbacks = new WeakMap();
        this._dummyElements = [];
        this._updateQueue.clear();

        delete this.domChanged;
        delete this._win;
    }

    private _domChanged = (parent: HTMLElement): void => {
        if (this._changedParents.has(parent)) {
            return;
        }

        this._changedParents.add(parent);

        if (this._updateDummyInputsTimer) {
            return;
        }

        this._updateDummyInputsTimer = this._win?.().setTimeout(() => {
            delete this._updateDummyInputsTimer;

            for (const ref of this._dummyElements) {
                const dummyElement = ref.get();

                if (dummyElement) {
                    const callback = this._dummyCallbacks.get(dummyElement);

                    if (callback) {
                        const dummyParent = dom.getParentNode(dummyElement);

                        if (
                            !dummyParent ||
                            this._changedParents.has(dummyParent)
                        ) {
                            callback();
                        }
                    }
                }
            }

            this._changedParents = new WeakSet();
        }, _updateDummyInputsTimeout);
    };

    updatePositions(
        compute: (
            scrollTopLeftCache: Map<
                HTMLElement,
                { scrollTop: number; scrollLeft: number } | null
            >
        ) => () => void
    ): void {
        if (!this._win) {
            // As this is a public method, we make sure that it has no effect when
            // called after dispose().
            return;
        }

        this._updateQueue.add(compute);

        this._lastUpdateQueueTime = Date.now();

        this._scheduledUpdatePositions();
    }

    private _scheduledUpdatePositions(): void {
        if (this._updateTimer) {
            return;
        }

        this._updateTimer = this._win?.().setTimeout(() => {
            delete this._updateTimer;

            // updatePositions() might be called quite a lot during the scrolling.
            // So, instead of clearing the timeout and scheduling a new one, we
            // check if enough time has passed since the last updatePositions() call
            // and only schedule a new one if not.
            // At maximum, we will update dummy inputs positions
            // _updateDummyInputsTimeout * 2 after the last updatePositions() call.
            if (
                this._lastUpdateQueueTime + _updateDummyInputsTimeout <=
                Date.now()
            ) {
                // A cache for current bulk of updates to reduce getComputedStyle() calls.
                const scrollTopLeftCache = new Map<
                    HTMLElement,
                    { scrollTop: number; scrollLeft: number } | null
                >();

                const setTopLeftCallbacks: (() => void)[] = [];

                for (const compute of this._updateQueue) {
                    setTopLeftCallbacks.push(compute(scrollTopLeftCache));
                }

                this._updateQueue.clear();

                // We're splitting the computation of offsets and setting them to avoid extra
                // reflows.
                for (const setTopLeft of setTopLeftCallbacks) {
                    setTopLeft();
                }

                // Explicitly clear to not hold references till the next garbage collection.
                scrollTopLeftCache.clear();
            } else {
                this._scheduledUpdatePositions();
            }
        }, _updateDummyInputsTimeout);
    }
}

/**
 * Parent class that encapsulates the behaviour of dummy inputs (focus sentinels)
 */
class DummyInputManagerCore {
    private _tabster: TabsterCore;
    private _addTimer: number | undefined;
    private _getWindow: GetWindow;
    private _wrappers: DummyInputWrapper[] = [];
    private _element: WeakHTMLElement | undefined;
    private _isOutside = false;
    private _firstDummy: DummyInput | undefined;
    private _lastDummy: DummyInput | undefined;
    private _transformElements: Set<HTMLElement> = new Set();
    private _callForDefaultAction: boolean | undefined;

    constructor(
        tabster: TabsterCore,
        element: WeakHTMLElement,
        manager: DummyInputManager,
        priority: number,
        sys: SysProps | undefined,
        outsideByDefault?: boolean,
        callForDefaultAction?: boolean
    ) {
        const el = element.get() as HTMLElementWithDummyInputs;

        if (!el) {
            throw new Error("No element");
        }

        this._tabster = tabster;
        this._getWindow = tabster.getWindow;
        this._callForDefaultAction = callForDefaultAction;

        const instance = el.__tabsterDummy;

        (instance || this)._wrappers.push({
            manager,
            priority,
            tabbable: true,
        });

        if (instance) {
            if (__DEV__) {
                this._firstDummy &&
                    setDummyInputDebugValue(
                        this._firstDummy,
                        instance._wrappers
                    );
                this._lastDummy &&
                    setDummyInputDebugValue(
                        this._lastDummy,
                        instance._wrappers
                    );
            }

            return instance;
        }

        el.__tabsterDummy = this;

        // Some elements allow only specific types of direct descendants and we need to
        // put our dummy inputs inside or outside of the element accordingly.
        const forcedDummyPosition = sys?.dummyInputsPosition;
        const tagName = el.tagName;
        this._isOutside = !forcedDummyPosition
            ? (outsideByDefault ||
                  tagName === "UL" ||
                  tagName === "OL" ||
                  tagName === "TABLE") &&
              !(tagName === "LI" || tagName === "TD" || tagName === "TH")
            : forcedDummyPosition === SysDummyInputsPositions.Outside;

        this._firstDummy = new DummyInput(
            this._getWindow,
            this._isOutside,
            {
                isFirst: true,
            },
            element
        );

        this._lastDummy = new DummyInput(
            this._getWindow,
            this._isOutside,
            {
                isFirst: false,
            },
            element
        );

        // We will be checking dummy input parents to see if their child list have changed.
        // So, it is enough to have just one of the inputs observed, because
        // both dummy inputs always have the same parent.
        const dummyElement = this._firstDummy.input;
        dummyElement &&
            tabster._dummyObserver.add(dummyElement, this._addDummyInputs);

        this._firstDummy.onFocusIn = this._onFocusIn;
        this._firstDummy.onFocusOut = this._onFocusOut;
        this._lastDummy.onFocusIn = this._onFocusIn;
        this._lastDummy.onFocusOut = this._onFocusOut;

        this._element = element;
        this._addDummyInputs();
    }

    dispose(manager: DummyInputManager, force?: boolean): void {
        const wrappers = (this._wrappers = this._wrappers.filter(
            (w) => w.manager !== manager && !force
        ));

        if (__DEV__) {
            this._firstDummy &&
                setDummyInputDebugValue(this._firstDummy, wrappers);
            this._lastDummy &&
                setDummyInputDebugValue(this._lastDummy, wrappers);
        }

        if (wrappers.length === 0) {
            delete (this._element?.get() as HTMLElementWithDummyInputs)
                .__tabsterDummy;

            for (const el of this._transformElements) {
                el.removeEventListener("scroll", this._addTransformOffsets);
            }
            this._transformElements.clear();

            const win = this._getWindow();

            if (this._addTimer) {
                win.clearTimeout(this._addTimer);
                delete this._addTimer;
            }

            const dummyElement = this._firstDummy?.input;
            dummyElement && this._tabster._dummyObserver.remove(dummyElement);

            this._firstDummy?.dispose();
            this._lastDummy?.dispose();
        }
    }

    private _onFocus(
        isIn: boolean,
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void {
        const wrapper = this._getCurrent();

        if (
            wrapper &&
            (!dummyInput.useDefaultAction || this._callForDefaultAction)
        ) {
            wrapper.manager.getHandler(isIn)?.(
                dummyInput,
                isBackward,
                relatedTarget
            );
        }
    }

    private _onFocusIn = (
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void => {
        this._onFocus(true, dummyInput, isBackward, relatedTarget);
    };

    private _onFocusOut = (
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void => {
        this._onFocus(false, dummyInput, isBackward, relatedTarget);
    };

    moveOut = (backwards: boolean): void => {
        const first = this._firstDummy;
        const last = this._lastDummy;

        if (first && last) {
            // For the sake of performance optimization, the dummy input
            // position in the DOM updates asynchronously from the DOM change.
            // Calling _ensurePosition() to make sure the position is correct.
            this._ensurePosition();

            const firstInput = first.input;
            const lastInput = last.input;
            const element = this._element?.get();

            if (firstInput && lastInput && element) {
                let toFocus: HTMLElement | undefined;

                if (backwards) {
                    firstInput.tabIndex = 0;
                    toFocus = firstInput;
                } else {
                    lastInput.tabIndex = 0;
                    toFocus = lastInput;
                }

                if (toFocus) {
                    nativeFocus(toFocus);
                }
            }
        }
    };

    /**
     * Prepares to move focus out of the given element by focusing
     * one of the dummy inputs and setting the `useDefaultAction` flag
     * @param backwards focus moving to an element behind the given element
     */
    moveOutWithDefaultAction = (
        backwards: boolean,
        relatedEvent: KeyboardEvent
    ): void => {
        const first = this._firstDummy;
        const last = this._lastDummy;

        if (first && last) {
            // For the sake of performance optimization, the dummy input
            // position in the DOM updates asynchronously from the DOM change.
            // Calling _ensurePosition() to make sure the position is correct.
            this._ensurePosition();

            const firstInput = first.input;
            const lastInput = last.input;
            const element = this._element?.get();

            if (firstInput && lastInput && element) {
                let toFocus: HTMLElement | undefined;

                if (backwards) {
                    if (
                        !first.isOutside &&
                        this._tabster.focusable.isFocusable(
                            element,
                            true,
                            true,
                            true
                        )
                    ) {
                        toFocus = element;
                    } else {
                        first.useDefaultAction = true;
                        firstInput.tabIndex = 0;
                        toFocus = firstInput;
                    }
                } else {
                    last.useDefaultAction = true;
                    lastInput.tabIndex = 0;
                    toFocus = lastInput;
                }

                if (
                    toFocus &&
                    element.dispatchEvent(
                        new TabsterMoveFocusEvent({
                            by: "root",
                            owner: element,
                            next: null,
                            relatedEvent,
                        })
                    )
                ) {
                    nativeFocus(toFocus);
                }
            }
        }
    };

    setTabbable = (manager: DummyInputManager, tabbable: boolean) => {
        for (const w of this._wrappers) {
            if (w.manager === manager) {
                w.tabbable = tabbable;
                break;
            }
        }

        const wrapper = this._getCurrent();

        if (wrapper) {
            const tabIndex = wrapper.tabbable ? 0 : -1;

            let input = this._firstDummy?.input;

            if (input) {
                input.tabIndex = tabIndex;
            }

            input = this._lastDummy?.input;

            if (input) {
                input.tabIndex = tabIndex;
            }
        }

        if (__DEV__) {
            this._firstDummy &&
                setDummyInputDebugValue(this._firstDummy, this._wrappers);
            this._lastDummy &&
                setDummyInputDebugValue(this._lastDummy, this._wrappers);
        }
    };

    private _getCurrent(): DummyInputWrapper | undefined {
        this._wrappers.sort((a, b) => {
            if (a.tabbable !== b.tabbable) {
                return a.tabbable ? -1 : 1;
            }

            return a.priority - b.priority;
        });

        return this._wrappers[0];
    }

    /**
     * Adds dummy inputs as the first and last child of the given element
     * Called each time the children under the element is mutated
     */
    private _addDummyInputs = () => {
        if (this._addTimer) {
            return;
        }

        this._addTimer = this._getWindow().setTimeout(() => {
            delete this._addTimer;

            this._ensurePosition();

            if (__DEV__) {
                this._firstDummy &&
                    setDummyInputDebugValue(this._firstDummy, this._wrappers);
                this._lastDummy &&
                    setDummyInputDebugValue(this._lastDummy, this._wrappers);
            }

            this._addTransformOffsets();
        }, 0);
    };

    private _ensurePosition(): void {
        const element = this._element?.get();
        const firstDummyInput = this._firstDummy?.input;
        const lastDummyInput = this._lastDummy?.input;

        if (!element || !firstDummyInput || !lastDummyInput) {
            return;
        }

        if (this._isOutside) {
            const elementParent = dom.getParentNode(element);

            if (elementParent) {
                const nextSibling = dom.getNextSibling(element);

                if (nextSibling !== lastDummyInput) {
                    dom.insertBefore(
                        elementParent,
                        lastDummyInput,
                        nextSibling
                    );
                }

                if (
                    dom.getPreviousElementSibling(element) !== firstDummyInput
                ) {
                    dom.insertBefore(elementParent, firstDummyInput, element);
                }
            }
        } else {
            if (dom.getLastElementChild(element) !== lastDummyInput) {
                dom.appendChild(element, lastDummyInput);
            }

            const firstElementChild = dom.getFirstElementChild(element);

            if (
                firstElementChild &&
                firstElementChild !== firstDummyInput &&
                firstElementChild.parentNode
            ) {
                dom.insertBefore(
                    firstElementChild.parentNode,
                    firstDummyInput,
                    firstElementChild
                );
            }
        }
    }

    private _addTransformOffsets = (): void => {
        this._tabster._dummyObserver.updatePositions(
            this._computeTransformOffsets
        );
    };

    private _computeTransformOffsets = (
        scrollTopLeftCache: Map<
            HTMLElement,
            { scrollTop: number; scrollLeft: number } | null
        >
    ): (() => void) => {
        const from = this._firstDummy?.input || this._lastDummy?.input;
        const transformElements = this._transformElements;
        const newTransformElements: typeof transformElements = new Set();
        let scrollTop = 0;
        let scrollLeft = 0;

        const win = this._getWindow();

        for (
            let element: HTMLElement | undefined | null = from;
            element && element.nodeType === Node.ELEMENT_NODE;
            element = dom.getParentElement(element)
        ) {
            let scrollTopLeft = scrollTopLeftCache.get(element);

            // getComputedStyle() and element.scrollLeft/Top() cause style recalculation,
            // so we cache the result across all elements in the current bulk.
            if (scrollTopLeft === undefined) {
                const transform = win.getComputedStyle(element).transform;

                if (transform && transform !== "none") {
                    scrollTopLeft = {
                        scrollTop: element.scrollTop,
                        scrollLeft: element.scrollLeft,
                    };
                }

                scrollTopLeftCache.set(element, scrollTopLeft || null);
            }

            if (scrollTopLeft) {
                newTransformElements.add(element);

                if (!transformElements.has(element)) {
                    element.addEventListener(
                        "scroll",
                        this._addTransformOffsets
                    );
                }

                scrollTop += scrollTopLeft.scrollTop;
                scrollLeft += scrollTopLeft.scrollLeft;
            }
        }

        for (const el of transformElements) {
            if (!newTransformElements.has(el)) {
                el.removeEventListener("scroll", this._addTransformOffsets);
            }
        }

        this._transformElements = newTransformElements;

        return () => {
            this._firstDummy?.setTopLeft(scrollTop, scrollLeft);
            this._lastDummy?.setTopLeft(scrollTop, scrollLeft);
        };
    };
}

export function getDummyInputContainer(
    element: HTMLElement | null | undefined
): HTMLElement | null {
    return (
        (
            element as HTMLElementWithDummyContainer | null | undefined
        )?.__tabsterDummyContainer?.get() || null
    );
}
