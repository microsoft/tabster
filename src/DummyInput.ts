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
import { _isFocusable } from "./Focusable.js";
import { dom } from "./DOMAPI.js";
import {
    addListener,
    clearTimer,
    createTimer,
    dispatchEvent,
    hasSubFocusable,
    isTimerActive,
    makeFocusIgnored,
    removeListener,
    setTimer,
    WeakHTMLElement,
} from "./Utils.js";

const _updateDummyInputsTimeout = 100;

interface HTMLElementWithDummyContainer extends HTMLElement {
    __tabsterDummyContainer?: WeakHTMLElement;
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
 * Dummy HTML elements that are used as focus sentinels for the DOM enclosed within them.
 * `DummyInput` is the public shape used by `DummyInputManagerCore`; the writable fields
 * are mutated in place by the manager and by the focus event handlers.
 */
export interface DummyInput {
    input: HTMLElement | undefined;
    useDefaultAction?: boolean;
    isFirst: DummyInputProps["isFirst"];
    isOutside: boolean;
    onFocusIn?: DummyInputFocusCallback;
    onFocusOut?: DummyInputFocusCallback;
    setTopLeft(top: number, left: number): void;
    dispose(): void;
}

/**
 * Creates a focus-sentinel element, wires its focus listeners, and returns
 * a {@link DummyInput} handle. Phantom inputs auto-dispose on the next tick.
 */
export function createDummyInput(
    getWindow: GetWindow,
    isOutside: boolean,
    props: DummyInputProps,
    element?: WeakHTMLElement,
    fixedTarget?: WeakHTMLElement
): DummyInput {
    const win = getWindow();
    const input: HTMLElement | undefined = win.document.createElement("i");

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

    (input as HTMLElementWithDummyContainer).__tabsterDummyContainer = element;

    const isPhantom = props.isPhantom ?? false;
    const disposeTimer = createTimer();

    const isBackward = (
        isIn: boolean,
        current: HTMLElement,
        previous: HTMLElement | null
    ): boolean => {
        return isIn && !previous
            ? !api.isFirst
            : !!(
                  previous &&
                  current.compareDocumentPosition(previous) &
                      Node.DOCUMENT_POSITION_FOLLOWING
              );
    };

    const focusIn = (e: FocusEvent): void => {
        if (fixedTarget) {
            const target = fixedTarget.get();

            if (target) {
                nativeFocus(target);
            }

            return;
        }

        const currentInput = api.input;

        if (api.onFocusIn && currentInput) {
            const relatedTarget = e.relatedTarget as HTMLElement | null;

            api.onFocusIn(
                api,
                isBackward(true, currentInput, relatedTarget),
                relatedTarget
            );
        }
    };

    const focusOut = (e: FocusEvent): void => {
        if (fixedTarget) {
            return;
        }

        api.useDefaultAction = false;

        const currentInput = api.input;

        if (api.onFocusOut && currentInput) {
            const relatedTarget = e.relatedTarget as HTMLElement | null;

            api.onFocusOut(
                api,
                isBackward(false, currentInput, relatedTarget),
                relatedTarget
            );
        }
    };

    addListener(input, "focusin", focusIn);
    addListener(input, "focusout", focusOut);

    const api: DummyInput = {
        input,
        isFirst: props.isFirst,
        isOutside,

        setTopLeft(top: number, left: number): void {
            const s = api.input?.style;
            if (s) {
                s.top = `${top}px`;
                s.left = `${left}px`;
            }
        },

        dispose(): void {
            clearTimer(disposeTimer, win);

            const currentInput = api.input;

            if (!currentInput) {
                return;
            }

            fixedTarget = undefined;
            api.onFocusIn = undefined;
            api.onFocusOut = undefined;
            api.input = undefined;

            removeListener(currentInput, "focusin", focusIn);
            removeListener(currentInput, "focusout", focusOut);

            delete (currentInput as HTMLElementWithDummyContainer)
                .__tabsterDummyContainer;

            dom.getParentNode(currentInput)?.removeChild(currentInput);
        },
    };

    if (isPhantom) {
        setTimer(disposeTimer, win, api.dispose, 0);
    }

    return api;
}

export const DummyInputManagerPriorities = {
    Root: 1,
    Modalizer: 2,
    Mover: 3,
    Groupper: 4,
} as const;

/**
 * Public handle returned by {@link createDummyInputManager}. Subclasses
 * (Root/Modalizer/Mover/Groupper) compose a DummyInputManager and delegate
 * focus handlers via {@link DummyInputManager.setHandlers}.
 */
export interface DummyInputManager {
    readonly element: WeakHTMLElement;
    setHandlers(
        onFocusIn?: DummyInputFocusCallback,
        onFocusOut?: DummyInputFocusCallback
    ): void;
    moveOut(backwards: boolean): void;
    moveOutWithDefaultAction(
        backwards: boolean,
        relatedEvent: KeyboardEvent
    ): void;
    getHandler(isIn: boolean): DummyInputFocusCallback | undefined;
    setTabbable(tabbable: boolean): void;
    dispose(): void;
}

/**
 * Creates a dummy-input manager for `element`. If the element already has
 * a manager, this registers an additional wrapper on the existing core so
 * priorities/handlers can be coordinated across overlapping subsystems.
 */
export function createDummyInputManager(
    tabster: TabsterCore,
    element: WeakHTMLElement,
    priority: number,
    sys: SysProps | undefined,
    outsideByDefault?: boolean,
    callForDefaultAction?: boolean
): DummyInputManager {
    let onFocusIn: DummyInputFocusCallback | undefined;
    let onFocusOut: DummyInputFocusCallback | undefined;
    let instance: DummyInputManagerCore | undefined;

    const manager: DummyInputManager = {
        element,

        setHandlers(
            inHandler?: DummyInputFocusCallback,
            outHandler?: DummyInputFocusCallback
        ): void {
            onFocusIn = inHandler;
            onFocusOut = outHandler;
        },

        moveOut(backwards: boolean): void {
            instance?.moveOut(backwards);
        },

        moveOutWithDefaultAction(
            backwards: boolean,
            relatedEvent: KeyboardEvent
        ): void {
            instance?.moveOutWithDefaultAction(backwards, relatedEvent);
        },

        getHandler(isIn: boolean): DummyInputFocusCallback | undefined {
            return isIn ? onFocusIn : onFocusOut;
        },

        setTabbable(tabbable: boolean) {
            instance?.setTabbable(manager, tabbable);
        },

        dispose(): void {
            if (instance) {
                instance.dispose(manager);
                instance = undefined;
            }

            onFocusIn = undefined;
            onFocusOut = undefined;
        },
    };

    instance = createDummyInputManagerCore(
        tabster,
        element,
        manager,
        priority,
        sys,
        outsideByDefault,
        callForDefaultAction
    );

    return manager;
}

export const DummyInputManager = {
    moveWithPhantomDummy(
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
        const dummy: DummyInput = createDummyInput(tabster.getWindow, true, {
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
                            !_isFocusable(tabster, element, false, true, true)))
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
                parent &&
                dispatchEvent(
                    parent,
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
    },

    addPhantomDummyWithTarget(
        tabster: TabsterCore,
        sourceElement: HTMLElement,
        isBackward: boolean,
        targetElement: HTMLElement
    ): void {
        const dummy: DummyInput = createDummyInput(
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
    },
};

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

type ScrollTopLeftCache = Map<
    HTMLElement,
    { scrollTop: number; scrollLeft: number } | null
>;

export function createDummyInputObserver(
    getWindow: GetWindow
): DummyInputObserverInterface {
    let win: GetWindow | undefined = getWindow;
    const updateQueue = new Set<(c: ScrollTopLeftCache) => () => void>();
    const updateTimer = createTimer();
    let lastUpdateQueueTime = 0;
    let changedParents: WeakSet<Node> = new WeakSet();
    const updateDummyInputsTimer = createTimer();
    let dummyElements: WeakHTMLElement<HTMLElement>[] = [];
    let dummyCallbacks: WeakMap<HTMLElement, () => void> = new WeakMap();

    const domChanged = (parent: HTMLElement): void => {
        if (changedParents.has(parent)) {
            return;
        }

        changedParents.add(parent);

        const w = win?.();
        if (!w || isTimerActive(updateDummyInputsTimer)) {
            return;
        }

        setTimer(
            updateDummyInputsTimer,
            w,
            () => {
                for (const ref of dummyElements) {
                    const dummyElement = ref.get();

                    if (dummyElement) {
                        const callback = dummyCallbacks.get(dummyElement);

                        if (callback) {
                            const dummyParent = dom.getParentNode(dummyElement);

                            if (
                                !dummyParent ||
                                changedParents.has(dummyParent)
                            ) {
                                callback();
                            }
                        }
                    }
                }

                changedParents = new WeakSet();
            },
            _updateDummyInputsTimeout
        );
    };

    const scheduledUpdatePositions = (): void => {
        const w = win?.();
        if (!w || isTimerActive(updateTimer)) {
            return;
        }

        setTimer(
            updateTimer,
            w,
            () => {
                // updatePositions() might be called quite a lot during the scrolling.
                // So, instead of clearing the timeout and scheduling a new one, we
                // check if enough time has passed since the last updatePositions() call
                // and only schedule a new one if not.
                // At maximum, we will update dummy inputs positions
                // _updateDummyInputsTimeout * 2 after the last updatePositions() call.
                if (
                    lastUpdateQueueTime + _updateDummyInputsTimeout <=
                    Date.now()
                ) {
                    // A cache for current bulk of updates to reduce getComputedStyle() calls.
                    const scrollTopLeftCache: ScrollTopLeftCache = new Map();

                    const setTopLeftCallbacks: (() => void)[] = [];

                    for (const compute of updateQueue) {
                        setTopLeftCallbacks.push(compute(scrollTopLeftCache));
                    }

                    updateQueue.clear();

                    // We're splitting the computation of offsets and setting them to avoid extra
                    // reflows.
                    for (const setTopLeft of setTopLeftCallbacks) {
                        setTopLeft();
                    }

                    // Explicitly clear to not hold references till the next garbage collection.
                    scrollTopLeftCache.clear();
                } else {
                    scheduledUpdatePositions();
                }
            },
            _updateDummyInputsTimeout
        );
    };

    const api: DummyInputObserverInterface = {
        add(dummy: HTMLElement, callback: () => void): void {
            if (!dummyCallbacks.has(dummy) && win) {
                dummyElements.push(new WeakHTMLElement(dummy));
                dummyCallbacks.set(dummy, callback);
                api.domChanged = domChanged;
            }
        },

        remove(dummy: HTMLElement): void {
            dummyElements = dummyElements.filter((ref) => {
                const element = ref.get();
                return element && element !== dummy;
            });

            dummyCallbacks.delete(dummy);

            if (dummyElements.length === 0) {
                api.domChanged = undefined;
            }
        },

        dispose(): void {
            const w = win?.();

            if (w) {
                clearTimer(updateTimer, w);
                clearTimer(updateDummyInputsTimer, w);
            }

            changedParents = new WeakSet();
            dummyCallbacks = new WeakMap();
            dummyElements = [];
            updateQueue.clear();

            api.domChanged = undefined;
            win = undefined;
        },

        updatePositions(
            compute: (cache: ScrollTopLeftCache) => () => void
        ): void {
            if (!win) {
                // As this is a public method, we make sure that it has no effect when
                // called after dispose().
                return;
            }

            updateQueue.add(compute);
            lastUpdateQueueTime = Date.now();

            scheduledUpdatePositions();
        },
    };

    return api;
}

/**
 * Per-element coordinator for the focus-sentinel pair. If multiple subsystems
 * (Root/Modalizer/Mover/Groupper) want sentinels on the same element, they
 * share one core via the wrapper list — `createDummyInputManagerCore` returns
 * the existing core if one is already attached.
 */
interface DummyInputManagerCore {
    moveOut(backwards: boolean): void;
    moveOutWithDefaultAction(
        backwards: boolean,
        relatedEvent: KeyboardEvent
    ): void;
    setTabbable(manager: DummyInputManager, tabbable: boolean): void;
    dispose(manager: DummyInputManager, force?: boolean): void;
}

interface ElementWithCore extends HTMLElement {
    __tabsterDummy?: {
        wrappers: DummyInputWrapper[];
        firstDummy: DummyInput | undefined;
        lastDummy: DummyInput | undefined;
        core: DummyInputManagerCore;
    };
}

function createDummyInputManagerCore(
    tabster: TabsterCore,
    element: WeakHTMLElement,
    manager: DummyInputManager,
    priority: number,
    sys: SysProps | undefined,
    outsideByDefault?: boolean,
    callForDefaultAction?: boolean
): DummyInputManagerCore {
    const el = element.get() as ElementWithCore | undefined;

    if (!el) {
        throw new Error("No element");
    }

    const existing = el.__tabsterDummy;

    if (existing) {
        existing.wrappers.push({ manager, priority, tabbable: true });

        if (__DEV__) {
            existing.firstDummy &&
                setDummyInputDebugValue(existing.firstDummy, existing.wrappers);
            existing.lastDummy &&
                setDummyInputDebugValue(existing.lastDummy, existing.wrappers);
        }

        return existing.core;
    }

    const getWindow = tabster.getWindow;
    const addTimer = createTimer();
    let transformElements: Set<HTMLElement> = new Set();
    const wrappers: DummyInputWrapper[] = [
        { manager, priority, tabbable: true },
    ];

    // Some elements allow only specific types of direct descendants and we need to
    // put our dummy inputs inside or outside of the element accordingly.
    const forcedDummyPosition = sys?.dummyInputsPosition;
    const tagName = el.tagName;
    const isOutside = !forcedDummyPosition
        ? (outsideByDefault ||
              tagName === "UL" ||
              tagName === "OL" ||
              tagName === "TABLE") &&
          !(tagName === "LI" || tagName === "TD" || tagName === "TH")
        : forcedDummyPosition === SysDummyInputsPositions.Outside;

    const onFocus = (
        isIn: boolean,
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void => {
        const wrapper = getCurrent();

        if (wrapper && (!dummyInput.useDefaultAction || callForDefaultAction)) {
            wrapper.manager.getHandler(isIn)?.(
                dummyInput,
                isBackward,
                relatedTarget
            );
        }
    };

    const onFocusIn = (
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void => {
        onFocus(true, dummyInput, isBackward, relatedTarget);
    };

    const onFocusOut = (
        dummyInput: DummyInput,
        isBackward: boolean,
        relatedTarget: HTMLElement | null
    ): void => {
        onFocus(false, dummyInput, isBackward, relatedTarget);
    };

    const getCurrent = (): DummyInputWrapper | undefined => {
        wrappers.sort((a, b) => {
            if (a.tabbable !== b.tabbable) {
                return a.tabbable ? -1 : 1;
            }

            return a.priority - b.priority;
        });

        return wrappers[0];
    };

    const ensurePosition = (): void => {
        const currentElement = element.get();
        const firstDummyInput = firstDummy?.input;
        const lastDummyInput = lastDummy?.input;

        if (!currentElement || !firstDummyInput || !lastDummyInput) {
            return;
        }

        if (isOutside) {
            const elementParent = dom.getParentNode(currentElement);

            if (elementParent) {
                const nextSibling = dom.getNextSibling(currentElement);

                if (nextSibling !== lastDummyInput) {
                    dom.insertBefore(
                        elementParent,
                        lastDummyInput,
                        nextSibling
                    );
                }

                if (
                    dom.getPreviousElementSibling(currentElement) !==
                    firstDummyInput
                ) {
                    dom.insertBefore(
                        elementParent,
                        firstDummyInput,
                        currentElement
                    );
                }
            }
        } else {
            if (dom.getLastElementChild(currentElement) !== lastDummyInput) {
                dom.appendChild(currentElement, lastDummyInput);
            }

            const firstElementChild = dom.getFirstElementChild(currentElement);

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
    };

    const computeTransformOffsets = (
        scrollTopLeftCache: Map<
            HTMLElement,
            { scrollTop: number; scrollLeft: number } | null
        >
    ): (() => void) => {
        const from = firstDummy?.input || lastDummy?.input;
        const newTransformElements: Set<HTMLElement> = new Set();
        let scrollTop = 0;
        let scrollLeft = 0;

        const win = getWindow();

        for (
            let e: HTMLElement | undefined | null = from;
            e && e.nodeType === Node.ELEMENT_NODE;
            e = dom.getParentElement(e)
        ) {
            let scrollTopLeft = scrollTopLeftCache.get(e);

            // getComputedStyle() and element.scrollLeft/Top() cause style recalculation,
            // so we cache the result across all elements in the current bulk.
            if (scrollTopLeft === undefined) {
                const transform = win.getComputedStyle(e).transform;

                if (transform && transform !== "none") {
                    scrollTopLeft = {
                        scrollTop: e.scrollTop,
                        scrollLeft: e.scrollLeft,
                    };
                }

                scrollTopLeftCache.set(e, scrollTopLeft || null);
            }

            if (scrollTopLeft) {
                newTransformElements.add(e);

                if (!transformElements.has(e)) {
                    addListener(e, "scroll", addTransformOffsets);
                }

                scrollTop += scrollTopLeft.scrollTop;
                scrollLeft += scrollTopLeft.scrollLeft;
            }
        }

        for (const e of transformElements) {
            if (!newTransformElements.has(e)) {
                removeListener(e, "scroll", addTransformOffsets);
            }
        }

        transformElements = newTransformElements;

        return () => {
            firstDummy?.setTopLeft(scrollTop, scrollLeft);
            lastDummy?.setTopLeft(scrollTop, scrollLeft);
        };
    };

    const addTransformOffsets = (): void => {
        tabster._dummyObserver.updatePositions(computeTransformOffsets);
    };

    /**
     * Adds dummy inputs as the first and last child of the given element
     * Called each time the children under the element is mutated
     */
    const addDummyInputs = () => {
        if (isTimerActive(addTimer)) {
            return;
        }

        setTimer(
            addTimer,
            getWindow(),
            () => {
                ensurePosition();

                if (__DEV__) {
                    firstDummy && setDummyInputDebugValue(firstDummy, wrappers);
                    lastDummy && setDummyInputDebugValue(lastDummy, wrappers);
                }

                addTransformOffsets();
            },
            0
        );
    };

    const firstDummy: DummyInput = createDummyInput(
        getWindow,
        isOutside,
        { isFirst: true },
        element
    );

    const lastDummy: DummyInput = createDummyInput(
        getWindow,
        isOutside,
        { isFirst: false },
        element
    );

    // We will be checking dummy input parents to see if their child list have changed.
    // So, it is enough to have just one of the inputs observed, because
    // both dummy inputs always have the same parent.
    const dummyElement = firstDummy.input;
    dummyElement && tabster._dummyObserver.add(dummyElement, addDummyInputs);

    firstDummy.onFocusIn = onFocusIn;
    firstDummy.onFocusOut = onFocusOut;
    lastDummy.onFocusIn = onFocusIn;
    lastDummy.onFocusOut = onFocusOut;

    const core: DummyInputManagerCore = {
        moveOut(backwards: boolean): void {
            // For the sake of performance optimization, the dummy input
            // position in the DOM updates asynchronously from the DOM change.
            // Calling ensurePosition() to make sure the position is correct.
            ensurePosition();

            const firstInput = firstDummy.input;
            const lastInput = lastDummy.input;
            const currentElement = element.get();

            if (firstInput && lastInput && currentElement) {
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
        },

        /**
         * Prepares to move focus out of the given element by focusing
         * one of the dummy inputs and setting the `useDefaultAction` flag.
         */
        moveOutWithDefaultAction(
            backwards: boolean,
            relatedEvent: KeyboardEvent
        ): void {
            ensurePosition();

            const firstInput = firstDummy.input;
            const lastInput = lastDummy.input;
            const currentElement = element.get();

            if (firstInput && lastInput && currentElement) {
                let toFocus: HTMLElement | undefined;

                if (backwards) {
                    if (
                        !firstDummy.isOutside &&
                        _isFocusable(tabster, currentElement, true, true, true)
                    ) {
                        toFocus = currentElement;
                    } else {
                        firstDummy.useDefaultAction = true;
                        firstInput.tabIndex = 0;
                        toFocus = firstInput;
                    }
                } else {
                    lastDummy.useDefaultAction = true;
                    lastInput.tabIndex = 0;
                    toFocus = lastInput;
                }

                if (
                    toFocus &&
                    dispatchEvent(
                        currentElement,
                        new TabsterMoveFocusEvent({
                            by: "root",
                            owner: currentElement,
                            next: null,
                            relatedEvent,
                        })
                    )
                ) {
                    nativeFocus(toFocus);
                }
            }
        },

        setTabbable(m: DummyInputManager, tabbable: boolean) {
            for (const w of wrappers) {
                if (w.manager === m) {
                    w.tabbable = tabbable;
                    break;
                }
            }

            const wrapper = getCurrent();

            if (wrapper) {
                const tabIndex = wrapper.tabbable ? 0 : -1;

                let input = firstDummy.input;
                if (input) {
                    input.tabIndex = tabIndex;
                }

                input = lastDummy.input;
                if (input) {
                    input.tabIndex = tabIndex;
                }
            }

            if (__DEV__) {
                firstDummy && setDummyInputDebugValue(firstDummy, wrappers);
                lastDummy && setDummyInputDebugValue(lastDummy, wrappers);
            }
        },

        dispose(m: DummyInputManager, force?: boolean): void {
            const remaining = wrappers.filter((w) => w.manager !== m && !force);
            wrappers.length = 0;
            wrappers.push(...remaining);

            if (__DEV__) {
                firstDummy && setDummyInputDebugValue(firstDummy, wrappers);
                lastDummy && setDummyInputDebugValue(lastDummy, wrappers);
            }

            if (wrappers.length === 0) {
                const elementWithCore = element.get() as
                    | ElementWithCore
                    | undefined;
                if (elementWithCore) {
                    delete elementWithCore.__tabsterDummy;
                }

                for (const e of transformElements) {
                    removeListener(e, "scroll", addTransformOffsets);
                }
                transformElements.clear();

                clearTimer(addTimer, getWindow());

                const input = firstDummy.input;
                input && tabster._dummyObserver.remove(input);

                firstDummy.dispose();
                lastDummy.dispose();
            }
        },
    };

    el.__tabsterDummy = { wrappers, firstDummy, lastDummy, core };

    addDummyInputs();

    return core;
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
