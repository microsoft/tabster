/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";
import { FocusedElementState } from "./State/FocusedElement";
import { getTabsterOnElement } from "./Instance";
import { Keys } from "./Keys";
import { RootAPI } from "./Root";
import * as Types from "./Types";
import { Visibilities, MoverDirections, MoverKeys } from "./Consts";
import {
    MoverMemorizedElementEvent,
    MoverMemorizedElementEventName,
    MoverMoveFocusEvent,
    MoverMoveFocusEventName,
    MoverStateEvent,
    TabsterMoveFocusEvent,
} from "./Events";
import {
    createElementTreeWalker,
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    getElementUId,
    getPromise,
    isElementVerticallyVisibleInContainer,
    matchesSelector,
    scrollIntoView,
    TabsterPart,
    WeakHTMLElement,
    getDummyInputContainer,
} from "./Utils";
import { dom } from "./DOMAPI";

const _inputSelector = ["input", "textarea", "*[contenteditable]"].join(", ");

class MoverDummyManager extends DummyInputManager {
    private _tabster: Types.TabsterCore;
    private _getMemorized: () => WeakHTMLElement | undefined;

    constructor(
        element: WeakHTMLElement,
        tabster: Types.TabsterCore,
        getMemorized: () => WeakHTMLElement | undefined,
        sys: Types.SysProps | undefined
    ) {
        super(tabster, element, DummyInputManagerPriorities.Mover, sys);

        this._tabster = tabster;
        this._getMemorized = getMemorized;

        this._setHandlers(this._onFocusDummyInput);
    }

    private _onFocusDummyInput = (dummyInput: DummyInput) => {
        const container = this._element.get();
        const input = dummyInput.input;

        if (container && input) {
            const ctx = RootAPI.getTabsterContext(this._tabster, container);

            let toFocus: HTMLElement | null | undefined;

            if (ctx) {
                toFocus = FocusedElementState.findNextTabbable(
                    this._tabster,
                    ctx,
                    undefined,
                    input,
                    undefined,
                    !dummyInput.isFirst,
                    true
                )?.element;
            }

            const memorized = this._getMemorized()?.get();

            if (memorized && this._tabster.focusable.isFocusable(memorized)) {
                toFocus = memorized;
            }

            if (toFocus) {
                nativeFocus(toFocus);
            }
        }
    };
}

// TypeScript enums produce depressing JavaScript code, so, we're just using
// a few old style constants here.
const _moverUpdateAdd = 1;
const _moverUpdateAttr = 2;
const _moverUpdateRemove = 3;

interface MoverUpdateQueueItem {
    element: HTMLElement;
    type:
        | typeof _moverUpdateAdd
        | typeof _moverUpdateAttr
        | typeof _moverUpdateRemove;
}

export class Mover
    extends TabsterPart<Types.MoverProps>
    implements Types.Mover
{
    private _unobserve: (() => void) | undefined;
    private _intersectionObserver: IntersectionObserver | undefined;
    private _setCurrentTimer: number | undefined;
    private _current: WeakHTMLElement | undefined;
    private _prevCurrent: WeakHTMLElement | undefined;
    private _visible: Record<string, Types.Visibility> = {};
    private _fullyVisible: string | undefined;
    private _win: Types.GetWindow;
    private _onDispose: (mover: Mover) => void;
    private _allElements: WeakMap<HTMLElement, Mover> | undefined;
    private _updateQueue: MoverUpdateQueueItem[] | undefined;
    private _updateTimer: number | undefined;

    visibilityTolerance: number;
    dummyManager: MoverDummyManager | undefined;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (mover: Mover) => void,
        props: Types.MoverProps,
        sys: Types.SysProps | undefined
    ) {
        super(tabster, element, props);

        this._win = tabster.getWindow;
        this.visibilityTolerance = props.visibilityTolerance ?? 0.8;

        if (this._props.trackState || this._props.visibilityAware) {
            this._intersectionObserver = new IntersectionObserver(
                this._onIntersection,
                { threshold: [0, 0.25, 0.5, 0.75, 1] }
            );
            this._observeState();
        }

        this._onDispose = onDispose;
        const getMemorized = () =>
            props.memorizeCurrent ? this._current : undefined;

        if (!tabster.controlTab) {
            this.dummyManager = new MoverDummyManager(
                this._element,
                tabster,
                getMemorized,
                sys
            );
        }
    }

    dispose(): void {
        this._onDispose(this);

        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            delete this._intersectionObserver;
        }

        delete this._current;
        delete this._fullyVisible;
        delete this._allElements;
        delete this._updateQueue;

        if (this._unobserve) {
            this._unobserve();
            delete this._unobserve;
        }

        const win = this._win();

        if (this._setCurrentTimer) {
            win.clearTimeout(this._setCurrentTimer);
            delete this._setCurrentTimer;
        }

        if (this._updateTimer) {
            win.clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }

        this.dummyManager?.dispose();
        delete this.dummyManager;
    }

    setCurrent(element: HTMLElement | undefined): void {
        if (element) {
            this._current = new WeakHTMLElement(this._win, element);
        } else {
            this._current = undefined;
        }

        if (
            (this._props.trackState || this._props.visibilityAware) &&
            !this._setCurrentTimer
        ) {
            this._setCurrentTimer = this._win().setTimeout(() => {
                delete this._setCurrentTimer;

                const changed: (WeakHTMLElement | undefined)[] = [];

                if (this._current !== this._prevCurrent) {
                    changed.push(this._current);
                    changed.push(this._prevCurrent);
                    this._prevCurrent = this._current;
                }

                for (const weak of changed) {
                    const el = weak?.get();

                    if (el && this._allElements?.get(el) === this) {
                        const props = this._props;

                        if (
                            el &&
                            (props.visibilityAware !== undefined ||
                                props.trackState)
                        ) {
                            const state = this.getState(el);

                            if (state) {
                                el.dispatchEvent(new MoverStateEvent(state));
                            }
                        }
                    }
                }
            });
        }
    }

    getCurrent(): HTMLElement | null {
        return this._current?.get() || null;
    }

    findNextTabbable(
        currentElement?: HTMLElement,
        referenceElement?: HTMLElement,
        isBackward?: boolean,
        ignoreAccessibility?: boolean
    ): Types.NextTabbable | null {
        const container = this.getElement();
        const currentIsDummy =
            container && getDummyInputContainer(currentElement) === container;

        if (!container) {
            return null;
        }

        let next: HTMLElement | null | undefined = null;
        let outOfDOMOrder = false;
        let uncontrolled: HTMLElement | null | undefined;

        if (
            this._props.tabbable ||
            currentIsDummy ||
            (currentElement && !dom.nodeContains(container, currentElement))
        ) {
            const findProps: Types.FindNextProps = {
                currentElement,
                referenceElement,
                container,
                ignoreAccessibility,
                useActiveModalizer: true,
            };

            const findPropsOut: Types.FindFocusableOutputProps = {};

            next = this._tabster.focusable[
                isBackward ? "findPrev" : "findNext"
            ](findProps, findPropsOut);

            outOfDOMOrder = !!findPropsOut.outOfDOMOrder;
            uncontrolled = findPropsOut.uncontrolled;
        }

        return {
            element: next,
            uncontrolled,
            outOfDOMOrder,
        };
    }

    acceptElement(
        element: HTMLElement,
        state: Types.FocusableAcceptElementState
    ): number | undefined {
        if (!FocusedElementState.isTabbing) {
            return state.currentCtx?.excludedFromMover
                ? NodeFilter.FILTER_REJECT
                : undefined;
        }

        const {
            memorizeCurrent,
            visibilityAware,
            hasDefault = true,
        } = this._props;
        const moverElement = this.getElement();

        if (
            moverElement &&
            (memorizeCurrent || visibilityAware || hasDefault) &&
            (!dom.nodeContains(moverElement, state.from) ||
                getDummyInputContainer(state.from) === moverElement)
        ) {
            let found: HTMLElement | undefined | null;

            if (memorizeCurrent) {
                const current = this._current?.get();

                if (current && state.acceptCondition(current)) {
                    found = current;
                }
            }

            if (!found && hasDefault) {
                found = this._tabster.focusable.findDefault({
                    container: moverElement,
                    useActiveModalizer: true,
                });
            }

            if (!found && visibilityAware) {
                found = this._tabster.focusable.findElement({
                    container: moverElement,
                    useActiveModalizer: true,
                    isBackward: state.isBackward,
                    acceptCondition: (el) => {
                        const id = getElementUId(this._win, el);
                        const visibility = this._visible[id];

                        return (
                            moverElement !== el &&
                            !!this._allElements?.get(el) &&
                            state.acceptCondition(el) &&
                            (visibility === Visibilities.Visible ||
                                (visibility === Visibilities.PartiallyVisible &&
                                    (visibilityAware ===
                                        Visibilities.PartiallyVisible ||
                                        !this._fullyVisible)))
                        );
                    },
                });
            }

            if (found) {
                state.found = true;
                state.foundElement = found;
                state.rejectElementsFrom = moverElement;
                state.skippedFocusable = true;
                return NodeFilter.FILTER_ACCEPT;
            }
        }

        return undefined;
    }

    private _onIntersection = (entries: IntersectionObserverEntry[]): void => {
        for (const entry of entries) {
            const el = entry.target as HTMLElement;
            const id = getElementUId(this._win, el);

            let newVisibility: Types.Visibility;
            let fullyVisible = this._fullyVisible;

            if (entry.intersectionRatio >= 0.25) {
                newVisibility =
                    entry.intersectionRatio >= 0.75
                        ? Visibilities.Visible
                        : Visibilities.PartiallyVisible;

                if (newVisibility === Visibilities.Visible) {
                    fullyVisible = id;
                }
            } else {
                newVisibility = Visibilities.Invisible;
            }

            if (this._visible[id] !== newVisibility) {
                if (newVisibility === undefined) {
                    delete this._visible[id];

                    if (fullyVisible === id) {
                        delete this._fullyVisible;
                    }
                } else {
                    this._visible[id] = newVisibility;
                    this._fullyVisible = fullyVisible;
                }

                const state = this.getState(el);

                if (state) {
                    el.dispatchEvent(new MoverStateEvent(state));
                }
            }
        }
    };

    private _observeState(): void {
        const element = this.getElement();

        if (
            this._unobserve ||
            !element ||
            typeof MutationObserver === "undefined"
        ) {
            return;
        }

        const win = this._win();
        const allElements = (this._allElements = new WeakMap());
        const tabsterFocusable = this._tabster.focusable;
        let updateQueue: MoverUpdateQueueItem[] = (this._updateQueue = []);

        const observer = dom.createMutationObserver(
            (mutations: MutationRecord[]) => {
                for (const mutation of mutations) {
                    const target = mutation.target;
                    const removed = mutation.removedNodes;
                    const added = mutation.addedNodes;

                    if (mutation.type === "attributes") {
                        if (mutation.attributeName === "tabindex") {
                            updateQueue.push({
                                element: target as HTMLElement,
                                type: _moverUpdateAttr,
                            });
                        }
                    } else {
                        for (let i = 0; i < removed.length; i++) {
                            updateQueue.push({
                                element: removed[
                                    i
                                ] as HTMLElement as HTMLElement,
                                type: _moverUpdateRemove,
                            });
                        }

                        for (let i = 0; i < added.length; i++) {
                            updateQueue.push({
                                element: added[i] as HTMLElement,
                                type: _moverUpdateAdd,
                            });
                        }
                    }
                }

                requestUpdate();
            }
        );

        const setElement = (element: HTMLElement, remove?: boolean): void => {
            const current = allElements.get(element);

            if (current && remove) {
                this._intersectionObserver?.unobserve(element);
                allElements.delete(element);
            }

            if (!current && !remove) {
                allElements.set(element, this);
                this._intersectionObserver?.observe(element);
            }
        };

        const updateElement = (element: HTMLElement): void => {
            const isFocusable = tabsterFocusable.isFocusable(element);
            const current = allElements.get(element);

            if (current) {
                if (!isFocusable) {
                    setElement(element, true);
                }
            } else {
                if (isFocusable) {
                    setElement(element);
                }
            }
        };

        const addNewElements = (element: HTMLElement): void => {
            const { mover } = getMoverGroupper(element);

            if (mover && mover !== this) {
                if (
                    mover.getElement() === element &&
                    tabsterFocusable.isFocusable(element)
                ) {
                    setElement(element);
                } else {
                    return;
                }
            }

            const walker = createElementTreeWalker(
                win.document,
                element,
                (node: Node): number => {
                    const { mover, groupper } = getMoverGroupper(
                        node as HTMLElement
                    );

                    if (mover && mover !== this) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const groupperFirstFocusable = groupper?.getFirst(true);

                    if (
                        groupper &&
                        groupper.getElement() !== node &&
                        groupperFirstFocusable &&
                        groupperFirstFocusable !== node
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (tabsterFocusable.isFocusable(node as HTMLElement)) {
                        setElement(node as HTMLElement);
                    }

                    return NodeFilter.FILTER_SKIP;
                }
            );

            if (walker) {
                walker.currentNode = element;

                while (walker.nextNode()) {
                    /* Iterating for the sake of calling processNode() callback. */
                }
            }
        };

        const removeWalk = (element: HTMLElement): void => {
            const current = allElements.get(element);

            if (current) {
                setElement(element, true);
            }

            for (
                let el = dom.getFirstElementChild(element);
                el;
                el = dom.getNextElementSibling(el)
            ) {
                removeWalk(el as HTMLElement);
            }
        };

        const requestUpdate = () => {
            if (!this._updateTimer && updateQueue.length) {
                this._updateTimer = win.setTimeout(() => {
                    delete this._updateTimer;

                    for (const { element, type } of updateQueue) {
                        switch (type) {
                            case _moverUpdateAttr:
                                updateElement(element);
                                break;
                            case _moverUpdateAdd:
                                addNewElements(element);
                                break;
                            case _moverUpdateRemove:
                                removeWalk(element);
                                break;
                        }
                    }

                    updateQueue = this._updateQueue = [];
                }, 0);
            }
        };

        const getMoverGroupper = (
            element: HTMLElement
        ): { mover?: Mover; groupper?: Types.Groupper } => {
            const ret: {
                mover?: Mover;
                groupper?: Types.Groupper;
            } = {};

            for (
                let el: HTMLElement | null = element;
                el;
                el = dom.getParentElement(el)
            ) {
                const toe = getTabsterOnElement(this._tabster, el);

                if (toe) {
                    if (toe.groupper && !ret.groupper) {
                        ret.groupper = toe.groupper;
                    }

                    if (toe.mover) {
                        ret.mover = toe.mover as Mover;
                        break;
                    }
                }
            }

            return ret;
        };

        updateQueue.push({ element, type: _moverUpdateAdd });
        requestUpdate();

        observer.observe(element, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["tabindex"],
        });

        this._unobserve = () => {
            observer.disconnect();
        };
    }

    getState(element: HTMLElement): Types.MoverElementState | undefined {
        const id = getElementUId(this._win, element);

        if (id in this._visible) {
            const visibility = this._visible[id] || Visibilities.Invisible;
            const isCurrent = this._current
                ? this._current.get() === element
                : undefined;

            return {
                isCurrent,
                visibility,
            };
        }

        return undefined;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateMoverProps(props: Types.MoverProps): void {
    // TODO: Implement validation.
}

/**
 * Calculates distance between two rectangles.
 *
 * @param ax1 first rectangle left
 * @param ay1 first rectangle top
 * @param ax2 first rectangle right
 * @param ay2 first rectangle bottom
 * @param bx1 second rectangle left
 * @param by1 second rectangle top
 * @param bx2 second rectangle right
 * @param by2 second rectangle bottom
 * @returns number, shortest distance between the rectangles.
 */
function getDistance(
    ax1: number,
    ay1: number,
    ax2: number,
    ay2: number,
    bx1: number,
    by1: number,
    bx2: number,
    by2: number
): number {
    const xDistance = ax2 < bx1 ? bx1 - ax2 : bx2 < ax1 ? ax1 - bx2 : 0;
    const yDistance = ay2 < by1 ? by1 - ay2 : by2 < ay1 ? ay1 - by2 : 0;

    return xDistance === 0
        ? yDistance
        : yDistance === 0
        ? xDistance
        : Math.sqrt(xDistance * xDistance + yDistance * yDistance);
}

export class MoverAPI implements Types.MoverAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _movers: Record<string, Mover>;
    private _ignoredInputTimer: number | undefined;
    private _ignoredInputResolve: ((value: boolean) => void) | undefined;

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
        this._movers = {};

        tabster.queueInit(this._init);
    }

    private _init = (): void => {
        const win = this._win();

        win.addEventListener("keydown", this._onKeyDown, true);
        win.addEventListener(MoverMoveFocusEventName, this._onMoveFocus);
        win.addEventListener(
            MoverMemorizedElementEventName,
            this._onMemorizedElement
        );

        this._tabster.focusedElement.subscribe(this._onFocus);
    };

    dispose(): void {
        const win = this._win();

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        this._ignoredInputResolve?.(false);

        if (this._ignoredInputTimer) {
            win.clearTimeout(this._ignoredInputTimer);
            delete this._ignoredInputTimer;
        }

        win.removeEventListener("keydown", this._onKeyDown, true);
        win.removeEventListener(MoverMoveFocusEventName, this._onMoveFocus);
        win.removeEventListener(
            MoverMemorizedElementEventName,
            this._onMemorizedElement
        );

        Object.keys(this._movers).forEach((moverId) => {
            if (this._movers[moverId]) {
                this._movers[moverId].dispose();
                delete this._movers[moverId];
            }
        });
    }

    createMover(
        element: HTMLElement,
        props: Types.MoverProps,
        sys: Types.SysProps | undefined
    ): Types.Mover {
        if (__DEV__) {
            validateMoverProps(props);
        }

        const newMover = new Mover(
            this._tabster,
            element,
            this._onMoverDispose,
            props,
            sys
        );
        this._movers[newMover.id] = newMover;
        return newMover;
    }

    private _onMoverDispose = (mover: Mover) => {
        delete this._movers[mover.id];
    };

    private _onFocus = (element: HTMLElement | undefined): void => {
        // When something in the app gets focused, we are making sure that
        // the relevant context Mover is aware of it.
        // Looking for the relevant context Mover from the currently
        // focused element parent, not from the element itself, because the
        // Mover element itself cannot be its own current (but might be
        // current for its parent Mover).
        let currentFocusableElement = element;
        let deepestFocusableElement = element;

        for (
            let el: HTMLElement | null | undefined =
                dom.getParentElement(element);
            el;
            el = dom.getParentElement(el)
        ) {
            // We go through all Movers up from the focused element and
            // set their current element to the deepest focusable of that
            // Mover.
            const mover = getTabsterOnElement(this._tabster, el)?.mover;

            if (mover) {
                mover.setCurrent(deepestFocusableElement);
                currentFocusableElement = undefined;
            }

            if (
                !currentFocusableElement &&
                this._tabster.focusable.isFocusable(el)
            ) {
                currentFocusableElement = deepestFocusableElement = el;
            }
        }
    };

    moveFocus(
        fromElement: HTMLElement,
        key: Types.MoverKey
    ): HTMLElement | null {
        return this._moveFocus(fromElement, key);
    }

    private _moveFocus(
        fromElement: HTMLElement,
        key: Types.MoverKey,
        relatedEvent?: KeyboardEvent
    ): HTMLElement | null {
        const tabster = this._tabster;
        const ctx = RootAPI.getTabsterContext(tabster, fromElement, {
            checkRtl: true,
        });

        if (
            !ctx ||
            !ctx.mover ||
            ctx.excludedFromMover ||
            (relatedEvent && ctx.ignoreKeydown(relatedEvent))
        ) {
            return null;
        }

        const mover = ctx.mover;
        const container = mover.getElement();

        if (ctx.groupperBeforeMover) {
            const groupper = ctx.groupper;

            if (groupper && !groupper.isActive(true)) {
                // For the cases when we have Mover/Active Groupper/Inactive Groupper, we need to check
                // the grouppers between the current element and the current mover.
                for (
                    let el: HTMLElement | null | undefined =
                        dom.getParentElement(groupper.getElement());
                    el && el !== container;
                    el = dom.getParentElement(el)
                ) {
                    if (
                        getTabsterOnElement(tabster, el)?.groupper?.isActive(
                            true
                        )
                    ) {
                        return null;
                    }
                }
            } else {
                return null;
            }
        }

        if (!container) {
            return null;
        }

        const focusable = tabster.focusable;
        const moverProps = mover.getProps();
        const direction = moverProps.direction || MoverDirections.Both;
        const isBoth = direction === MoverDirections.Both;
        const isVertical = isBoth || direction === MoverDirections.Vertical;
        const isHorizontal = isBoth || direction === MoverDirections.Horizontal;
        const isGridLinear = direction === MoverDirections.GridLinear;
        const isGrid = isGridLinear || direction === MoverDirections.Grid;
        const isCyclic = moverProps.cyclic;

        let next: HTMLElement | null | undefined;
        let scrollIntoViewArg: boolean | undefined;

        let focusedElementRect: DOMRect;
        let focusedElementX1 = 0;
        let focusedElementX2 = 0;

        if (isGrid) {
            focusedElementRect = fromElement.getBoundingClientRect();
            focusedElementX1 = Math.ceil(focusedElementRect.left);
            focusedElementX2 = Math.floor(focusedElementRect.right);
        }

        if (ctx.rtl) {
            if (key === MoverKeys.ArrowRight) {
                key = MoverKeys.ArrowLeft;
            } else if (key === MoverKeys.ArrowLeft) {
                key = MoverKeys.ArrowRight;
            }
        }

        if (
            (key === MoverKeys.ArrowDown && isVertical) ||
            (key === MoverKeys.ArrowRight && (isHorizontal || isGrid))
        ) {
            next = focusable.findNext({
                currentElement: fromElement,
                container,
                useActiveModalizer: true,
            });

            if (next && isGrid) {
                const nextElementX1 = Math.ceil(
                    next.getBoundingClientRect().left
                );

                if (!isGridLinear && focusedElementX2 > nextElementX1) {
                    next = undefined;
                }
            } else if (!next && isCyclic) {
                next = focusable.findFirst({
                    container,
                    useActiveModalizer: true,
                });
            }
        } else if (
            (key === MoverKeys.ArrowUp && isVertical) ||
            (key === MoverKeys.ArrowLeft && (isHorizontal || isGrid))
        ) {
            next = focusable.findPrev({
                currentElement: fromElement,
                container,
                useActiveModalizer: true,
            });

            if (next && isGrid) {
                const nextElementX2 = Math.floor(
                    next.getBoundingClientRect().right
                );

                if (!isGridLinear && nextElementX2 > focusedElementX1) {
                    next = undefined;
                }
            } else if (!next && isCyclic) {
                next = focusable.findLast({
                    container,
                    useActiveModalizer: true,
                });
            }
        } else if (key === MoverKeys.Home) {
            if (isGrid) {
                focusable.findElement({
                    container,
                    currentElement: fromElement,
                    useActiveModalizer: true,
                    isBackward: true,
                    acceptCondition: (el) => {
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }

                        const nextElementX1 = Math.ceil(
                            el.getBoundingClientRect().left ?? 0
                        );

                        if (
                            el !== fromElement &&
                            focusedElementX1 <= nextElementX1
                        ) {
                            return true;
                        }

                        next = el;
                        return false;
                    },
                });
            } else {
                next = focusable.findFirst({
                    container,
                    useActiveModalizer: true,
                });
            }
        } else if (key === MoverKeys.End) {
            if (isGrid) {
                focusable.findElement({
                    container,
                    currentElement: fromElement,
                    useActiveModalizer: true,
                    acceptCondition: (el) => {
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }

                        const nextElementX1 = Math.ceil(
                            el.getBoundingClientRect().left ?? 0
                        );

                        if (
                            el !== fromElement &&
                            focusedElementX1 >= nextElementX1
                        ) {
                            return true;
                        }

                        next = el;
                        return false;
                    },
                });
            } else {
                next = focusable.findLast({
                    container,
                    useActiveModalizer: true,
                });
            }
        } else if (key === MoverKeys.PageUp) {
            focusable.findElement({
                currentElement: fromElement,
                container,
                useActiveModalizer: true,
                isBackward: true,
                acceptCondition: (el) => {
                    if (!focusable.isFocusable(el)) {
                        return false;
                    }

                    if (
                        isElementVerticallyVisibleInContainer(
                            this._win,
                            el,
                            mover.visibilityTolerance
                        )
                    ) {
                        next = el;
                        return false;
                    }

                    return true;
                },
            });

            // will be on the first column move forward and preserve previous column
            if (isGrid && next) {
                const firstColumnX1 = Math.ceil(
                    next.getBoundingClientRect().left
                );
                focusable.findElement({
                    currentElement: next,
                    container,
                    useActiveModalizer: true,
                    acceptCondition: (el) => {
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }

                        const nextElementX1 = Math.ceil(
                            el.getBoundingClientRect().left
                        );
                        if (
                            focusedElementX1 < nextElementX1 ||
                            firstColumnX1 >= nextElementX1
                        ) {
                            return true;
                        }
                        next = el;
                        return false;
                    },
                });
            }

            scrollIntoViewArg = false;
        } else if (key === MoverKeys.PageDown) {
            focusable.findElement({
                currentElement: fromElement,
                container,
                useActiveModalizer: true,
                acceptCondition: (el) => {
                    if (!focusable.isFocusable(el)) {
                        return false;
                    }

                    if (
                        isElementVerticallyVisibleInContainer(
                            this._win,
                            el,
                            mover.visibilityTolerance
                        )
                    ) {
                        next = el;
                        return false;
                    }

                    return true;
                },
            });

            // will be on the last column move backwards and preserve previous column
            if (isGrid && next) {
                const lastColumnX1 = Math.ceil(
                    next.getBoundingClientRect().left
                );
                focusable.findElement({
                    currentElement: next,
                    container,
                    useActiveModalizer: true,
                    isBackward: true,
                    acceptCondition: (el) => {
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }

                        const nextElementX1 = Math.ceil(
                            el.getBoundingClientRect().left
                        );
                        if (
                            focusedElementX1 > nextElementX1 ||
                            lastColumnX1 <= nextElementX1
                        ) {
                            return true;
                        }
                        next = el;
                        return false;
                    },
                });
            }

            scrollIntoViewArg = true;
        } else if (isGrid) {
            const isBackward = key === MoverKeys.ArrowUp;
            const ax1 = focusedElementX1;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const ay1 = Math.ceil(focusedElementRect!.top);
            const ax2 = focusedElementX2;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const ay2 = Math.floor(focusedElementRect!.bottom);
            let targetElement: HTMLElement | undefined;
            let lastDistance: number | undefined;
            let lastIntersection = 0;

            focusable.findAll({
                container,
                currentElement: fromElement,
                isBackward,
                onElement: (el) => {
                    // Find element which has maximal intersection with the focused element horizontally,
                    // or the closest one.
                    const rect = el.getBoundingClientRect();

                    const bx1 = Math.ceil(rect.left);
                    const by1 = Math.ceil(rect.top);
                    const bx2 = Math.floor(rect.right);
                    const by2 = Math.floor(rect.bottom);

                    if (
                        (isBackward && ay1 < by2) ||
                        (!isBackward && ay2 > by1)
                    ) {
                        // Only consider elements which are below/above curretly focused.
                        return true;
                    }

                    const xIntersectionWidth =
                        Math.ceil(Math.min(ax2, bx2)) -
                        Math.floor(Math.max(ax1, bx1));
                    const minWidth = Math.ceil(Math.min(ax2 - ax1, bx2 - bx1));

                    if (
                        xIntersectionWidth > 0 &&
                        minWidth >= xIntersectionWidth
                    ) {
                        // Element intersects with the focused element on X axis.
                        const intersection = xIntersectionWidth / minWidth;

                        if (intersection > lastIntersection) {
                            targetElement = el;
                            lastIntersection = intersection;
                        }
                    } else if (lastIntersection === 0) {
                        // If we didn't have intersection, try just the closest one.
                        const distance = getDistance(
                            ax1,
                            ay1,
                            ax2,
                            ay2,
                            bx1,
                            by1,
                            bx2,
                            by2
                        );

                        if (
                            lastDistance === undefined ||
                            distance < lastDistance
                        ) {
                            lastDistance = distance;
                            targetElement = el;
                        }
                    } else if (lastIntersection > 0) {
                        // Element doesn't intersect, but we had intersection already, stop search.
                        return false;
                    }

                    return true;
                },
            });

            next = targetElement;
        }

        if (
            next &&
            (!relatedEvent ||
                (relatedEvent &&
                    container.dispatchEvent(
                        new TabsterMoveFocusEvent({
                            by: "mover",
                            owner: container,
                            next,
                            relatedEvent,
                        })
                    )))
        ) {
            if (scrollIntoViewArg !== undefined) {
                scrollIntoView(this._win, next, scrollIntoViewArg);
            }

            if (relatedEvent) {
                relatedEvent.preventDefault();
                relatedEvent.stopImmediatePropagation();
            }

            nativeFocus(next);

            return next;
        }

        return null;
    }

    private _onKeyDown = async (event: KeyboardEvent): Promise<void> => {
        if (this._ignoredInputTimer) {
            this._win().clearTimeout(this._ignoredInputTimer);
            delete this._ignoredInputTimer;
        }

        this._ignoredInputResolve?.(false);

        // Give a chance to other listeners to handle the event (for example,
        // to scroll instead of moving focus).
        if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
            return;
        }

        const key = event.key;
        let moverKey: Types.MoverKey | undefined;

        if (key === Keys.ArrowDown) {
            moverKey = MoverKeys.ArrowDown;
        } else if (key === Keys.ArrowRight) {
            moverKey = MoverKeys.ArrowRight;
        } else if (key === Keys.ArrowUp) {
            moverKey = MoverKeys.ArrowUp;
        } else if (key === Keys.ArrowLeft) {
            moverKey = MoverKeys.ArrowLeft;
        } else if (key === Keys.PageDown) {
            moverKey = MoverKeys.PageDown;
        } else if (key === Keys.PageUp) {
            moverKey = MoverKeys.PageUp;
        } else if (key === Keys.Home) {
            moverKey = MoverKeys.Home;
        } else if (key === Keys.End) {
            moverKey = MoverKeys.End;
        }

        if (!moverKey) {
            return;
        }

        const focused = this._tabster.focusedElement.getFocusedElement();

        if (!focused || (await this._isIgnoredInput(focused, key))) {
            return;
        }

        this._moveFocus(focused, moverKey, event);
    };

    private _onMoveFocus = (e: MoverMoveFocusEvent): void => {
        const element = e.composedPath()[0] as HTMLElement | null | undefined;
        const key = e.detail?.key;

        if (element && key !== undefined && !e.defaultPrevented) {
            this._moveFocus(element, key);
            e.stopImmediatePropagation();
        }
    };

    private _onMemorizedElement = (e: MoverMemorizedElementEvent): void => {
        const target = e.composedPath()[0] as HTMLElement | null | undefined;
        let memorizedElement = e.detail?.memorizedElement;

        if (target) {
            const ctx = RootAPI.getTabsterContext(this._tabster, target);
            const mover = ctx?.mover;

            if (mover) {
                if (
                    memorizedElement &&
                    !dom.nodeContains(mover.getElement(), memorizedElement)
                ) {
                    memorizedElement = undefined;
                }

                mover.setCurrent(memorizedElement);

                e.stopImmediatePropagation();
            }
        }
    };

    private async _isIgnoredInput(
        element: HTMLElement,
        key: string
    ): Promise<boolean> {
        if (
            element.getAttribute("aria-expanded") === "true" &&
            element.hasAttribute("aria-activedescendant")
        ) {
            // It is likely a combobox with expanded options and arrow keys are
            // controlled by it.
            return true;
        }

        if (matchesSelector(element, _inputSelector)) {
            let selectionStart = 0;
            let selectionEnd = 0;
            let textLength = 0;
            let asyncRet: Promise<boolean> | undefined;

            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
                const type = (element as HTMLInputElement).type;
                const value = (element as HTMLInputElement).value;

                textLength = (value || "").length;

                if (type === "email" || type === "number") {
                    // For these types Chromium doesn't provide selectionStart and selectionEnd.
                    // Hence the ugly workaround to find if the caret position is changed with
                    // the keypress.
                    // TODO: Have a look at range, week, time, time, date, datetime-local.
                    if (textLength) {
                        const selection = dom.getSelection(element);

                        if (selection) {
                            const initialLength = selection.toString().length;
                            const isBackward =
                                key === Keys.ArrowLeft || key === Keys.ArrowUp;

                            selection.modify(
                                "extend",
                                isBackward ? "backward" : "forward",
                                "character"
                            );

                            if (initialLength !== selection.toString().length) {
                                // The caret is moved, so, we're not on the edge of the value.
                                // Restore original selection.
                                selection.modify(
                                    "extend",
                                    isBackward ? "forward" : "backward",
                                    "character"
                                );

                                return true;
                            } else {
                                textLength = 0;
                            }
                        }
                    }
                } else {
                    const selStart = (element as HTMLInputElement)
                        .selectionStart;

                    if (selStart === null) {
                        // Do not ignore not text editable inputs like checkboxes and radios (but ignore hidden).
                        return type === "hidden";
                    }

                    selectionStart = selStart || 0;
                    selectionEnd =
                        (element as HTMLInputElement).selectionEnd || 0;
                }
            } else if (element.contentEditable === "true") {
                asyncRet = new (getPromise(this._win))((resolve) => {
                    this._ignoredInputResolve = (value: boolean) => {
                        delete this._ignoredInputResolve;
                        resolve(value);
                    };

                    const win = this._win();

                    if (this._ignoredInputTimer) {
                        win.clearTimeout(this._ignoredInputTimer);
                    }

                    const {
                        anchorNode: prevAnchorNode,
                        focusNode: prevFocusNode,
                        anchorOffset: prevAnchorOffset,
                        focusOffset: prevFocusOffset,
                    } = dom.getSelection(element) || {};

                    // Get selection gives incorrect value if we call it syncronously onKeyDown.
                    this._ignoredInputTimer = win.setTimeout(() => {
                        delete this._ignoredInputTimer;

                        const {
                            anchorNode,
                            focusNode,
                            anchorOffset,
                            focusOffset,
                        } = dom.getSelection(element) || {};

                        if (
                            anchorNode !== prevAnchorNode ||
                            focusNode !== prevFocusNode ||
                            anchorOffset !== prevAnchorOffset ||
                            focusOffset !== prevFocusOffset
                        ) {
                            this._ignoredInputResolve?.(false);
                            return;
                        }

                        selectionStart = anchorOffset || 0;
                        selectionEnd = focusOffset || 0;
                        textLength = element.textContent?.length || 0;

                        if (anchorNode && focusNode) {
                            if (
                                dom.nodeContains(element, anchorNode) &&
                                dom.nodeContains(element, focusNode)
                            ) {
                                if (anchorNode !== element) {
                                    let anchorFound = false;

                                    const addOffsets = (
                                        node: ChildNode
                                    ): boolean => {
                                        if (node === anchorNode) {
                                            anchorFound = true;
                                        } else if (node === focusNode) {
                                            return true;
                                        }

                                        const nodeText = node.textContent;

                                        if (
                                            nodeText &&
                                            !dom.getFirstChild(node)
                                        ) {
                                            const len = nodeText.length;

                                            if (anchorFound) {
                                                if (focusNode !== anchorNode) {
                                                    selectionEnd += len;
                                                }
                                            } else {
                                                selectionStart += len;
                                                selectionEnd += len;
                                            }
                                        }

                                        let stop = false;

                                        for (
                                            let e = dom.getFirstChild(node);
                                            e && !stop;
                                            e = e.nextSibling
                                        ) {
                                            stop = addOffsets(e);
                                        }

                                        return stop;
                                    };

                                    addOffsets(element);
                                }
                            }
                        }

                        this._ignoredInputResolve?.(true);
                    }, 0);
                });
            }

            if (asyncRet && !(await asyncRet)) {
                return true;
            }

            if (selectionStart !== selectionEnd) {
                return true;
            }

            if (
                selectionStart > 0 &&
                (key === Keys.ArrowLeft ||
                    key === Keys.ArrowUp ||
                    key === Keys.Home)
            ) {
                return true;
            }

            if (
                selectionStart < textLength &&
                (key === Keys.ArrowRight ||
                    key === Keys.ArrowDown ||
                    key === Keys.End)
            ) {
                return true;
            }
        }

        return false;
    }
}
