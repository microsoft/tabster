/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FocusedElementState } from './State/FocusedElement';
import { getTabsterOnElement, setTabsterOnElement } from './Instance';
import { Keys } from './Keys';
// import { KeyboardNavigationState } from './KeyboardNavigation';
// import { getElementUId } from './Utils';
// import { FocusedElementState } from './State/FocusedElement';
import { RootAPI } from './Root';
import * as Types from './Types';
import {
    callOriginalFocusOnly,
    // CustomFocusFunctionWithOriginal,
    // documentContains,
    getElementUId,
    isElementVerticallyVisibleInContainer,
    isElementVisibleInContainer,
    // shouldIgnoreFocus,
    matchesSelector,
    scrollIntoView,
    TabsterPart,
    WeakHTMLElement
} from './Utils';

const _inputSelector = [
    'input',
    'textarea',
    '*[contenteditable]'
].join(', ');

const _isVisibleTimeout = 200;

export class Mover extends TabsterPart<Types.MoverBasicProps, Types.MoverExtendedProps> implements Types.Mover {
    private static _movers: Record<string, Mover> = {};

    private _current: WeakHTMLElement | undefined;
    private _unobserve: (() => void) | undefined;
    private _domChangedTimer: number | undefined;
    private _prev: WeakHTMLElement | undefined;
    private _next: WeakHTMLElement | undefined;
    private _first: WeakHTMLElement | undefined;
    private _last: WeakHTMLElement | undefined;
    private _focused: WeakHTMLElement | undefined;
    private _unlimited: WeakHTMLElement | undefined;
    private _visible: Record<string, Types.Visibility> = {};
    private _hasFullyVisible = false;

    private _prevCurrent: WeakHTMLElement | undefined;
    private _prevPrev: WeakHTMLElement | undefined;
    private _prevNext: WeakHTMLElement | undefined;
    private _prevFirst: WeakHTMLElement | undefined;
    private _prevLast: WeakHTMLElement | undefined;
    private _prevFocused: WeakHTMLElement | undefined;
    private _prevUnlimited: WeakHTMLElement | undefined;
    private _prevVisible: Record<string, Types.Visibility> = {};

    private _onChangeTimer: number | undefined;
    private _updateVisibleTimer: number | undefined;

    private _focusables: Record<string, WeakHTMLElement> = {};

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        getWindow: Types.GetWindow,
        basic?: Types.MoverBasicProps,
        extended?: Types.MoverExtendedProps
    ) {
        super(tabster, element, getWindow, basic, extended);

        Mover._movers[this.id] = this;

        setTabsterOnElement(tabster, element, { mover: this });

        if (this._basic.trackState || this._basic.visibilityAware) {
            this._observeState();
            this._domChangedTimer = getWindow().setTimeout(this._domChanged, 0);
        }

        tabster.focusedElement.subscribe(this._onFocus);
    }

    dispose(): void {
        this._tabster.focusedElement.unsubscribe(this._onFocus);

        this._focusables = {};

        if (this._unobserve) {
            this._unobserve();
            this._unobserve = undefined;
        }

        const win = this._win();

        if (this._updateVisibleTimer) {
            win.clearTimeout(this._updateVisibleTimer);
            this._updateVisibleTimer = undefined;
        }

        if (this._domChangedTimer) {
            win.clearTimeout(this._domChangedTimer);
            this._domChangedTimer = undefined;
        }

        if (this._onChangeTimer) {
            win.clearTimeout(this._onChangeTimer);
            this._onChangeTimer = undefined;
        }

        const e = this._element.get();

        if (e) {
            setTabsterOnElement(this._tabster, e, { mover: undefined });
        }

        delete Mover._movers[this.id];
    }

    private _onFocus = (el: HTMLElement | undefined): void => {
        if (el && this.getElement()?.contains(el)) {
            const id = getElementUId(this._win, el);

            if ((id in this._focusables) && (el !== this._focused?.get())) {
                this._focused = new WeakHTMLElement(this._win, el);
                this._processOnChange();
            }
        } else if (this._focused) {
            this._focused = undefined;
            this._processOnChange();
        }
    }

    setCurrent(element: HTMLElement | undefined): boolean {
        if (element) {
            this._current = new WeakHTMLElement(this._win, element);
        } else {
            this._current = undefined;
        }

        return false;
    }

    getCurrent(): HTMLElement | null {
        return this._current?.get() || null;
    }

    findNextTabbable(current: HTMLElement, prev?: boolean): Types.NextTabbable | null {
        const container = this.getElement();

        if (!container || !container.contains(current)) {
            return null;
        }

        const tabster = this._tabster;
        const focusable = tabster.focusable;
        let next: HTMLElement | null = null;

        if (this._basic.tabbable) {
            next = prev
                ? focusable.findPrev(current, container)
                : focusable.findNext(current, container);
        }

        if (!next) {
            const parentElement = container.parentElement;

            if (parentElement) {
                const parentCtx = RootAPI.getTabsterContext(tabster, parentElement);

                if (parentCtx) {
                    const from = (prev ? container : focusable.findLast(container)) || container;
                    return FocusedElementState.findNext(tabster, parentCtx, from, prev);
                }
            }
        }

        return next ? { element: next } : null;
    }

    acceptElement(element: HTMLElement, state: Types.FocusableAcceptElementState): number | undefined {
        if (this._basic.memorizeCurrent) {
            const container = this.getElement();
            const current = this._current?.get();

            if (container && current && this._tabster.focusable.isFocusable(current)) {
                if (state.from && !container.contains(state.from)) {
                    state.found = current;
                    return NodeFilter.FILTER_REJECT;
                }
            }
        }

        return undefined;
    }

    private _observeState(): void {
        const element = this.getElement();

        if (this._unobserve || !element || (typeof MutationObserver === 'undefined')) {
            return;
        }

        let observer = new MutationObserver(mutations => {
            const win = this._win();

            if (this._domChangedTimer) {
                win.clearTimeout(this._domChangedTimer);
            }

            this._domChangedTimer = win.setTimeout(this._domChanged, 0);
        });

        observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ['tabindex'] });

        this._unobserve = () => {
            observer.disconnect();
        };
    }

    private _domChanged = (): void => {
        this._domChangedTimer = undefined;

        const element = this.getElement();

        if (element) {
            const elements: HTMLElement[] = this._tabster.focusable.findAll(element);
            const newFocusables: Record<string, WeakHTMLElement> = {};
            const prevFocusables = this._focusables;

            if (elements.length === 0) {
                this._first = undefined;
                this._last = undefined;
            }

            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                const id = getElementUId(this._win, element);
                let weakEl: WeakHTMLElement | undefined = prevFocusables[id];

                if (!weakEl) {
                    weakEl = new WeakHTMLElement(this._win, el);
                }

                if (i === 0) {
                    this._first = weakEl;
                }

                if (i === elements.length - 1) {
                    this._last = weakEl;
                }

                newFocusables[id] = weakEl;
            }

            for (let id of Object.keys(prevFocusables)) {
                if (!(id in newFocusables)) {
                    delete this._focusables[id];
                    delete this._visible[id];
                    delete this._prevVisible[id];

                    if (this._current?.get() === prevFocusables[id].get()) {
                        this.setCurrent(undefined);
                    }
                }
            }

            this._focusables = newFocusables;

            this._updateVisible(true);
        }
    }

    forceUpdate(): void {
        this._processOnChange(true);
    }

    private _processOnChange(force?: boolean): void {
        if (this._onChangeTimer && !force) {
            return;
        }

        const reallyProcessOnChange = () => {
            this._onChangeTimer = undefined;

            let changed: (WeakHTMLElement | undefined)[] = [];

            if (this._prevFocused !== this._focused) {
                for (let id of Object.keys(this._focusables)) {
                    changed.push(this._focusables[id]);
                }

                if (!this._focused && (!this._prevFocused || !this._basic.memorizeCurrent)) {
                    this.setCurrent(undefined);
                    this._prev = undefined;
                    this._next = undefined;
                }

                this._prevFocused = this._focused;
            }

            if (this._prevCurrent !== this._current) {
                changed.push(this._prevCurrent);
                changed.push(this._current);
                this._prevCurrent = this._current;
            }

            if (this._prevPrev !== this._prev) {
                changed.push(this._prevPrev);
                changed.push(this._prev);
                this._prevPrev = this._prev;
            }

            if (this._prevNext !== this._next) {
                changed.push(this._prevNext);
                changed.push(this._next);
                this._prevNext = this._next;
            }

            if (this._prevFirst !== this._first) {
                changed.push(this._prevFirst);
                changed.push(this._first);
                this._prevFirst = this._first;
            }

            if (this._prevLast !== this._last) {
                changed.push(this._prevLast);
                changed.push(this._last);
                this._prevLast = this._last;
            }

            if (this._prevUnlimited !== this._unlimited) {
                changed.push(this._prevUnlimited);
                changed.push(this._unlimited);
                this._prevUnlimited = this._unlimited;
            }

            if (this._visible !== this._prevVisible) {
                this._hasFullyVisible = false;

                for (let id of Object.keys(this._visible)) {
                    const isVisible = this._visible[id];

                    if (isVisible !== this._prevVisible[id]) {
                        changed.push(this._focusables[id]);
                    }

                    if (isVisible === Types.Visibilities.Visible) {
                        this._hasFullyVisible = true;
                    }
                }

                for (let id of Object.keys(this._prevVisible)) {
                    if (this._visible[id] !== this._prevVisible[id]) {
                        changed.push(this._focusables[id]);
                    }
                }

                this._prevVisible = this._visible;
            }

            const processed: Record<string, boolean> = {};

            for (let weak of changed) {
                const el = weak?.get();
                const id = el && getElementUId(this._win, el);

                if (id && !processed[id]) {
                    processed[id] = true;

                    if (this._focusables[id]) {
                        const onChange = this._extended.onChange;

                        if (el && onChange) {
                            const state = this.getState(el);

                            if (state) {
                                onChange(el, state);
                            }
                        }
                    }
                }
            }
        };

        if (this._onChangeTimer) {
            this._win().clearTimeout(this._onChangeTimer);
        }

        if (force) {
            reallyProcessOnChange();
        } else {
            this._onChangeTimer = this._win().setTimeout(reallyProcessOnChange, 0);
        }
    }

    getState(element: HTMLElement): Types.MoverElementState | undefined {
        const id = getElementUId(this._win, element);
        const isVisible = this._visible[id] || Types.Visibilities.Invisible;
        let isCurrent = this._current ? (this._current.get() === element) : undefined;

        if ((isCurrent === undefined) && (this._basic.lookupVisibility !== Types.Visibilities.Invisible)) {
            if (
                (isVisible === Types.Visibilities.Invisible) ||
                (this._hasFullyVisible && (isVisible === Types.Visibilities.PartiallyVisible))
            ) {
                isCurrent = false;
            }
        }

        return {
            isCurrent,
            isPrevious: this._prev?.get() === element,
            isNext: this._next?.get() === element,
            isFirst: this._first?.get() === element,
            isLast: this._last?.get() === element,
            isVisible,
            hasFocus: this._focused?.get() === element,
            siblingHasFocus: !!this._focused && (this._focused.get() !== element),
            siblingIsVisible: this._hasFullyVisible
        };
    }

    private _updateVisible(updateParents: boolean): void {
        const element = this._element.get();

        if (this._updateVisibleTimer || !element) {
            return;
        }

        if (updateParents) {
            for (let e = element.parentElement; e; e = e.parentElement) {
                const mover = getTabsterOnElement(this._tabster, e)?.mover;

                if (mover) {
                    (mover as unknown as Mover)._updateVisible(false);
                }
            }
        }

        this._updateVisibleTimer = this._win().setTimeout(() => {
            this._updateVisibleTimer = undefined;

            let isChanged = false;
            const visibleMovers: { [id: string]: Types.Visibility } = {};

            for (let id of Object.keys(this._focusables)) {
                const moverElement = this._focusables[id].get();
                const isVisible = moverElement
                    ? isElementVisibleInContainer(this._win, moverElement, 10)
                    : Types.Visibilities.Invisible;
                const curIsVisible = this._visible[id] || Types.Visibilities.Invisible;

                if (isVisible !== Types.Visibilities.Invisible) {
                    visibleMovers[id] = isVisible;
                }

                if (curIsVisible !== isVisible) {
                    isChanged = true;
                }
            }

            if (isChanged) {
                this._prevVisible = this._visible;
                this._visible = visibleMovers;
                this._processOnChange();
            }
        }, 0);
    }

    static updateVisible(scrolled: Node[]): void {
        const containers: { [id: string]: Mover } = {};

        for (let s of scrolled) {
            for (let id of Object.keys(Mover._movers)) {
                const container = Mover._movers[id];
                const containerElement = container.getElement();

                if (containerElement && s.contains(containerElement)) {
                    containers[container.id] = container;
                }
            }
        }

        for (let id of Object.keys(containers)) {
            containers[id]._updateVisible(false);
        }
    }
}

export class MoverAPI implements Types.MoverAPI {
    private _tabster: Types.TabsterCore;
    private _initTimer: number | undefined;
    private _win: Types.GetWindow;
    private _scrollTimer: number | undefined;
    private _scrollTargets: Node[] = [];

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
        this._initTimer = getWindow().setTimeout(this._init, 0);

        tabster.focusedElement.subscribe(this._onFocus);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        const win = this._win();

        win.addEventListener('scroll', this._onScroll, true);
        win.addEventListener('keydown', this._onKeyDown, true);
    }

    protected dispose(): void {
        const win = this._win();

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._scrollTimer) {
            win.clearTimeout(this._scrollTimer);
            this._scrollTimer = undefined;
        }

        win.removeEventListener('scroll', this._onScroll, true);

        this._scrollTargets = [];

        win.removeEventListener('keydown', this._onKeyDown, true);
    }

    static dispose(instance: Types.MoverAPI): void {
        (instance as MoverAPI).dispose();
    }

    add(element: HTMLElement, basic?: Types.MoverBasicProps, extended?: Types.MoverExtendedProps): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (tabsterOnElement && tabsterOnElement.mover) {
            throw new Error('The element already has Mover');
        }

        // tslint:disable-next-line:no-unused-expression
        new Mover(this._tabster, element, this._win, basic, extended);
    }

    remove(element: HTMLElement): void {
        const mover = getTabsterOnElement(this._tabster, element)?.mover;

        if (mover) {
            mover.dispose();
        }
    }

    setProps(
        element: HTMLElement,
        basic?: Partial<Types.MoverBasicProps> | null,
        extended?: Partial<Types.MoverExtendedProps> | null
    ): void {
        const mover = RootAPI.getTabsterContext(this._tabster, element)?.mover;

        if (mover) {
            mover.setProps(basic, extended);
        }
    }

    private _onFocus = (e: HTMLElement | undefined): void => {
        for (let el: HTMLElement | null | undefined = e; el; el = el.parentElement) {
            const mover = getTabsterOnElement(this._tabster, el)?.mover;

            if (mover) {
                mover.setCurrent(e);
                break;
            }
        }
    }

    private _onScroll = (e: UIEvent) => {
        let isKnownTarget = false;

        for (let t of this._scrollTargets) {
            if (t === e.target) {
                isKnownTarget = true;
                break;
            }
        }

        // Cannot simply use (e.target instanceof Node) as it might
        // originate from another window.
        if (!isKnownTarget && (e.target as Node).contains) {
            this._scrollTargets.push(e.target as Node);
        }

        const win = this._win();

        if (this._scrollTimer) {
            win.clearTimeout(this._scrollTimer);
        }

        this._scrollTimer = win.setTimeout(() => {
            this._scrollTimer = undefined;

            Mover.updateVisible(this._scrollTargets);

            this._scrollTargets = [];
        }, _isVisibleTimeout);
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        const keyCode = e.keyCode;

        switch (keyCode) {
            case Keys.Down:
            case Keys.Right:
            case Keys.Up:
            case Keys.Left:
            case Keys.PageDown:
            case Keys.PageUp:
            case Keys.Home:
            case Keys.End:
                break;
            default:
                return;
        }

        if (e.shiftKey) {
            return;
        }

        const tabster = this._tabster;
        const focused = tabster.focusedElement.getFocusedElement();

        if (!focused || this._isIgnoredInput(focused, keyCode)) {
            return;
        }

        const ctx = RootAPI.getTabsterContext(tabster, focused, { checkRtl: true, getAllGrouppersAndMovers: true });

        if (!ctx || !ctx.mover) {
            return;
        }

        if (ctx.isGroupperFirst) {
            const allGrouppersAndMovers = ctx.allGrouppersAndMovers!!!;
            let grouppersCount = 0;

            for (let gom of allGrouppersAndMovers) {
                if (!gom.isGroupper) {
                    break;
                }

                grouppersCount++;

                if (gom.groupper.isActive()) {
                    grouppersCount++;
                }
            }

            if (grouppersCount !== 1) {
                return;
            }
        }

        const mover = ctx.mover;
        const container = mover.getElement();

        if (!container) {
            return;
        }

        const focusable = tabster.focusable;
        const moverProps = mover.getBasicProps();
        const direction = moverProps.direction || Types.MoverDirections.Both;
        const isBoth = direction === Types.MoverDirections.Both;
        const isVertical = isBoth || (direction === Types.MoverDirections.Vertical);
        const isHorizontal = isBoth || (direction === Types.MoverDirections.Horizontal);
        const isGrid = direction === Types.MoverDirections.Grid;
        const isCyclic = moverProps.cyclic;
        const shouldFlipRtl = isHorizontal && !!ctx.isRtl;
        let next: HTMLElement | null | undefined;

        let nextArrow = (isVertical && keyCode === Keys.Down) || (isHorizontal && keyCode === Keys.Right);
        let prevArrow = (isVertical && keyCode === Keys.Up) || (isHorizontal && keyCode === Keys.Left);

        if (nextArrow) {
            next = shouldFlipRtl ? focusable.findPrev(focused, container) : focusable.findNext(focused, container);

            if (!next && isCyclic) {
                next = shouldFlipRtl ? focusable.findLast(container) : focusable.findPrev(container);
            }
        } else if (prevArrow) {
            next = shouldFlipRtl ? focusable.findNext(focused, container) : focusable.findPrev(focused, container);

            if (!next && isCyclic) {
                next = shouldFlipRtl ? focusable.findFirst(container) : focusable.findLast(container);
            }
        } else if (keyCode === Keys.Home) {
            next = focusable.findFirst(container);
        } else if (keyCode === Keys.End) {
            next = focusable.findLast(container);
        } else if (keyCode === Keys.PageUp) {
            let prevElement = focusable.findPrev(focused, container);
            let pageUpElement: HTMLElement | null = null;

            while (prevElement) {
                pageUpElement = prevElement;

                prevElement = isElementVerticallyVisibleInContainer(this._win, prevElement)
                    ? focusable.findPrev(prevElement, container)
                    : null;
            }

            next = pageUpElement;

            if (next) {
                scrollIntoView(this._win, next, false);
            }
        } else if (keyCode === Keys.PageDown) {
            let nextElement = focusable.findNext(focused, container);
            let pageDownElement: HTMLElement | null = null;

            while (nextElement) {
                pageDownElement = nextElement;

                nextElement = isElementVerticallyVisibleInContainer(this._win, nextElement)
                    ? focusable.findNext(nextElement, container)
                    : null;
            }

            next = pageDownElement;

            if (next) {
                scrollIntoView(this._win, next, true);
            }
        } else if (isGrid) {
            const fromRect = focused.getBoundingClientRect();
            let lastElement: HTMLElement | undefined;
            let prevTop: number | undefined;

            const nextMethod = ((keyCode === Keys.Down) || (keyCode === Keys.Right)) ? 'findNext' : 'findPrev';

            for (let el = focusable[nextMethod](focused, container); el; el = focusable[nextMethod](el, container)) {
                const rect = el.getBoundingClientRect();

                if (keyCode === Keys.Up) {
                    if (rect.top < fromRect.top) {
                        if (prevTop === undefined) {
                            prevTop = rect.top;
                        } else if (rect.top < prevTop) {
                            break;
                        }

                        if (rect.left < fromRect.left) {
                            if (!next) {
                                next = el;
                            }

                            break;
                        }

                        next = el;
                    }
                } else if (keyCode === Keys.Down) {
                    if (rect.top > fromRect.top) {
                        if (prevTop === undefined) {
                            prevTop = rect.top;
                        } else if (rect.top > prevTop) {
                            break;
                        }

                        if (rect.left > fromRect.left) {
                            if (!next) {
                                next = el;
                            }

                            break;
                        }

                        next = el;
                    }

                } else if ((keyCode === Keys.Left) || (keyCode === Keys.Right)) {
                    next = el;
                    break;
                }

                lastElement = el;
            }

            if (!next) {
                next = lastElement;
            }
        }

        if (next) {
            e.preventDefault();
            e.stopImmediatePropagation();

            callOriginalFocusOnly(next);
        }
    }

    private _isIgnoredInput(element: HTMLElement, keyCode: number): boolean {
        if (matchesSelector(element, _inputSelector)) {
            if ((element.tagName === 'INPUT') || (element.tagName === 'TEXTAREA')) {
                const selectionStart = (element as HTMLInputElement).selectionStart || 0;
                const selectionEnd = (element as HTMLInputElement).selectionEnd || 0;

                if (selectionStart !== selectionEnd) {
                    return true;
                }

                if (
                    (selectionStart > 0) &&
                    (
                        (keyCode === Keys.Left) ||
                        (keyCode === Keys.Up) ||
                        (keyCode === Keys.Home)
                    )
                ) {
                    return true;
                }

                if (
                    (selectionStart < ((element as HTMLInputElement).value || '').length) &&
                    (
                        (keyCode === Keys.Right) ||
                        (keyCode === Keys.Down) ||
                        (keyCode === Keys.End)
                    )
                ) {
                    return true;
                }
            } else {
                // TODO: Handle contenteditable.
            }
        }

        return false;
    }

}
