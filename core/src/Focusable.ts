/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement, setTabsterOnElement } from './Instance';
import { Modalizer } from './Modalizer';
import { dispatchMutationEvent, MutationEvent, MUTATION_EVENT_NAME } from './MutationEvent';
import { RootAPI } from './Root';
import * as Types from './Types';
import { createElementTreeWalker, isElementVisibleInContainer, matchesSelector, WeakHTMLElement } from './Utils';

const _focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '*[tabindex]',
    '*[contenteditable]'
].join(', ');

const _isVisibleTimeout = 200;

let _lastId = 0;

interface CurrentGrouppers {
    focused: { [id: string]: Types.Groupper };
    current: { [id: string]: Types.Groupper };
}

export class UberGroupper implements Types.UberGroupper {
    private static _containers: { [id: string]: UberGroupper } = {};

    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _element: WeakHTMLElement;
    private _cur: CurrentGrouppers;

    private _current: Types.Groupper | undefined;
    private _prev: Types.Groupper | undefined;
    private _next: Types.Groupper | undefined;
    private _first: Types.Groupper | undefined;
    private _last: Types.Groupper | undefined;
    private _focused: Types.Groupper | undefined;
    private _unlimited: Types.Groupper | undefined;
    private _visibleGrouppers: { [id: string]: Types.ElementVisibility } = {};
    private _hasFullyVisibleGroupper = false;

    private _prevCurrent: Types.Groupper | undefined;
    private _prevPrev: Types.Groupper | undefined;
    private _prevNext: Types.Groupper | undefined;
    private _prevFirst: Types.Groupper | undefined;
    private _prevLast: Types.Groupper | undefined;
    private _prevFocused: Types.Groupper | undefined;
    private _prevUnlimited: Types.Groupper | undefined;
    private _prevVisibleGrouppers: { [id: string]: Types.ElementVisibility } = {};

    private _onChangeTimer: number | undefined;
    private _updateVisibleTimer: number | undefined;

    private _grouppers: { [id: string]: Types.Groupper } = {};

    readonly id: string;

    constructor(tabster: Types.TabsterCore, element: HTMLElement, getWindow: Types.GetWindow, current: CurrentGrouppers) {
        this._tabster = tabster;
        this._win = getWindow;
        this._cur = current;
        this._element = new WeakHTMLElement(getWindow, element);
        this.id = 'fgc' + ++_lastId;

        setTabsterOnElement(tabster, element, {
            uberGroupper: this
        });

        UberGroupper._containers[this.id] = this;
    }

    dispose(): void {
        this._grouppers = {};

        const win = this._win();

        if (this._updateVisibleTimer) {
            win.clearTimeout(this._updateVisibleTimer);
            this._updateVisibleTimer = undefined;
        }

        if (this._onChangeTimer) {
            win.clearTimeout(this._onChangeTimer);
            this._onChangeTimer = undefined;
        }

        const e = this._element.get();

        if (e) {
            setTabsterOnElement(this._tabster, e, { uberGroupper: undefined });
        }

        delete UberGroupper._containers[this.id];
    }

    getElement(): HTMLElement | undefined {
        return this._element.get();
    }

    addGroupper(groupper: Types.Groupper): void {
        this._grouppers[groupper.id] = groupper;

        this._setFirstLast();

        this._updateVisible(true);
    }

    removeGroupper(groupper: Types.Groupper): void {
        const id = groupper.id;
        delete this._grouppers[id];
        delete this._visibleGrouppers[id];
        delete this._prevVisibleGrouppers[id];
        delete this._cur.focused[id];

        if (this._current === groupper) {
            this._setCurrent(undefined);
        }

        this._setFirstLast();

        this._updateVisible(true);
    }

    setFocusedGroupper(groupper: Types.Groupper | undefined): void {
        if (groupper !== this._focused) {
            this._focused = groupper;
            this._processOnChange();
        }
    }

    setUnlimitedGroupper(groupper: Types.Groupper): void {
        if (groupper !== this._unlimited) {
            this._unlimited = groupper;
            this._processOnChange();
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

            let changed: (Types.Groupper | undefined)[] = [];

            if (this._prevFocused !== this._focused) {
                for (let id of Object.keys(this._grouppers)) {
                    changed.push(this._grouppers[id]);
                }

                if (!this._focused && (!this._prevFocused || !this._prevFocused.getBasicProps().memorizeCurrent)) {
                    this._setCurrent(undefined);
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

            if (this._visibleGrouppers !== this._prevVisibleGrouppers) {
                this._hasFullyVisibleGroupper = false;

                for (let id of Object.keys(this._visibleGrouppers)) {
                    const isVisible = this._visibleGrouppers[id];

                    if (isVisible !== this._prevVisibleGrouppers[id]) {
                        changed.push(this._grouppers[id]);
                    }

                    if (isVisible === Types.ElementVisibilities.Visible) {
                        this._hasFullyVisibleGroupper = true;
                    }
                }

                for (let id of Object.keys(this._prevVisibleGrouppers)) {
                    if (this._visibleGrouppers[id] !== this._prevVisibleGrouppers[id]) {
                        changed.push(this._grouppers[id]);
                    }
                }

                this._prevVisibleGrouppers = this._visibleGrouppers;
            }

            const processed: { [id: string]: boolean } = {};

            for (let g of changed.filter(c => (c && this._grouppers[c.id]))) {
                if (g && !processed[g.id]) {
                    processed[g.id] = true;

                    const onChange = g.getExtendedProps().onChange;

                    if (onChange) {
                        onChange(g.getState());
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

    private _setFirstLast(): void {
        this._first = undefined;
        this._last = undefined;

        const element = this._element.get();
        if (!element) {
            return;
        }

        for (let e = element.firstElementChild; e; e = e.nextElementSibling) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, e);

            if (tabsterOnElement && tabsterOnElement.groupper && (tabsterOnElement.groupper.id in this._grouppers)) {
                this._first = tabsterOnElement.groupper;
                break;
            }
        }

        for (let e = element.lastElementChild; e; e = e.previousElementSibling) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, e);

            if (tabsterOnElement && tabsterOnElement.groupper && (tabsterOnElement.groupper.id in this._grouppers)) {
                this._last = tabsterOnElement.groupper;
                break;
            }
        }

        this._processOnChange();
    }

    setCurrentGroupper(groupper: Types.Groupper | undefined): void {
        this._setCurrent((groupper && (groupper.id in this._grouppers)) ? groupper : undefined);
        this._prev = undefined;
        this._next = undefined;

        const curElement = this._current?.getElement();

        if (curElement && (curElement.parentElement === this._element.get())) {
            for (let e = curElement.previousElementSibling; e; e = e.previousElementSibling) {
                const tabsterOnElement = getTabsterOnElement(this._tabster, e);

                if (tabsterOnElement && tabsterOnElement.groupper) {
                    this._prev = tabsterOnElement.groupper;
                    break;
                }
            }

            for (let e = curElement.nextElementSibling; e; e = e.nextElementSibling) {
                const tabsterOnElement = getTabsterOnElement(this._tabster, e);

                if (tabsterOnElement && tabsterOnElement.groupper) {
                    this._next = tabsterOnElement.groupper;
                    break;
                }
            }
        }

        this._processOnChange();
    }

    getCurrentGroupper(): Types.Groupper | null {
        if (this._current && (this._current.id in this._grouppers)) {
            return this._current;
        }

        this._setCurrent(undefined);

        return this._current || null;
    }

    getGroupperState(groupper: Types.Groupper): Types.GroupperState {
        const props = groupper.getBasicProps();
        const isLimited = props.isLimited;
        const isVisible = this._visibleGrouppers[groupper.id] || Types.ElementVisibilities.Invisible;
        let isCurrent = this._current ? (this._current === groupper) : undefined;

        if ((isCurrent === undefined) && (props.lookupVisibility !== Types.ElementVisibilities.Invisible)) {
            if (
                (isVisible === Types.ElementVisibilities.Invisible) ||
                (this._hasFullyVisibleGroupper && (isVisible === Types.ElementVisibilities.PartiallyVisible))
            ) {
                isCurrent = false;
            }
        }

        return {
            isCurrent,
            isPrevious: this._prev === groupper,
            isNext: this._next === groupper,
            isFirst: this._first === groupper,
            isLast: this._last === groupper,
            isVisible,
            hasFocus: this._focused === groupper,
            siblingHasFocus: !!this._focused && (this._focused !== groupper),
            siblingIsVisible: this._hasFullyVisibleGroupper,
            isLimited: (
                (isLimited === Types.GroupperFocusLimits.Limited) ||
                (isLimited === Types.GroupperFocusLimits.LimitedTrapFocus)
            ) ? this._unlimited !== groupper : false
        };
    }

    isEmpty(): boolean {
        return Object.keys(this._grouppers).length === 0;
    }

    private _setCurrent(groupper: Types.Groupper | undefined): void {
        const cur = this._current;

        if (cur !== groupper) {
            if (cur && this._cur.current[cur.id]) {
                delete this._cur.current[cur.id];
            }

            if (groupper) {
                this._cur.current[groupper.id] = groupper;
            }

            this._current = groupper;
        }
    }

    private _updateVisible(updateParents: boolean): void {
        const element = this._element.get();

        if (this._updateVisibleTimer || !element) {
            return;
        }

        if (updateParents) {
            for (let e = element.parentElement; e; e = e.parentElement) {
                const tabsterOnElement = getTabsterOnElement(this._tabster, e);

                if (tabsterOnElement && tabsterOnElement.uberGroupper) {
                    (tabsterOnElement.uberGroupper as UberGroupper)._updateVisible(false);
                }
            }
        }

        this._updateVisibleTimer = this._win().setTimeout(() => {
            this._updateVisibleTimer = undefined;

            let isChanged = false;
            const visibleGrouppers: { [id: string]: Types.ElementVisibility } = {};

            for (let id of Object.keys(this._grouppers)) {
                const groupperElement = this._grouppers[id].getElement();
                const isVisible = groupperElement
                    ? isElementVisibleInContainer(this._win, groupperElement, 10)
                    : Types.ElementVisibilities.Invisible;
                const curIsVisible = this._visibleGrouppers[id] || Types.ElementVisibilities.Invisible;

                if (isVisible !== Types.ElementVisibilities.Invisible) {
                    visibleGrouppers[id] = isVisible;
                }

                if (curIsVisible !== isVisible) {
                    isChanged = true;
                }
            }

            if (isChanged) {
                this._prevVisibleGrouppers = this._visibleGrouppers;
                this._visibleGrouppers = visibleGrouppers;
                this._processOnChange();
            }
        }, 0);
    }

    static updateVisible(scrolled: Node[]): void {
        const containers: { [id: string]: UberGroupper } = {};

        for (let s of scrolled) {
            for (let id of Object.keys(UberGroupper._containers)) {
                const container = UberGroupper._containers[id];
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

export class Groupper implements Types.Groupper {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _cur: CurrentGrouppers;
    private _element: WeakHTMLElement;
    private _container: Types.UberGroupper | undefined;
    private _basic: Types.GroupperBasicProps;
    private _extended: Types.GroupperExtendedProps;

    readonly id: string;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        getWindow: Types.GetWindow,
        current: CurrentGrouppers,
        basic?: Types.GroupperBasicProps,
        extended?: Types.GroupperExtendedProps
    ) {
        this._tabster = tabster;
        this._win = getWindow;
        this._cur = current;
        this._element = new WeakHTMLElement(getWindow, element);
        this._basic = basic || {};
        this._extended = extended || {};
        this.id = 'fg' + ++_lastId;

        setTabsterOnElement(this._tabster, element, {
            groupper: this
        });

        this.setupContainer();
    }

    dispose(): void {
        if (this._container) {
            this._container.removeGroupper(this);
        }

        this.setupContainer(true);

        const element = this._element.get();

        if (element) {
            setTabsterOnElement(this._tabster, element, {
                groupper: undefined
            });
        }
    }

    getBasicProps(): Types.GroupperBasicProps {
        return this._basic;
    }

    getExtendedProps(): Types.GroupperExtendedProps {
        return this._extended;
    }

    setProps(basic?: Partial<Types.GroupperBasicProps> | null, extended?: Partial<Types.GroupperExtendedProps> | null): void {
        if (basic) {
            this._basic = { ...this._basic, ...basic };
        } else if (basic === null) {
            this._basic = {};
        }

        if (extended) {
            this._extended = { ...this._extended, ...extended };
        } else if (extended === null) {
            this._extended = {};
        }
    }

    getElement(): HTMLElement | undefined {
        return this._element.get();
    }

    moveTo(newElement: HTMLElement): void {
        if (this._element.get() !== newElement) {
            this.setupContainer(true);

            this._element = new WeakHTMLElement(this._win, newElement);

            this.setupContainer();
        }
    }

    getState(): Types.GroupperState {
        return this._container
            ? this._container.getGroupperState(this)
            : {
                isCurrent: undefined,
                isPrevious: false,
                isNext: false,
                isFirst: false,
                isLast: false,
                isVisible: Types.ElementVisibilities.Invisible,
                hasFocus: false,
                siblingIsVisible: false,
                siblingHasFocus: false,
                isLimited: false
            };
    }

    setCurrent(current: boolean): void {
        if (this._container) {
            this._container.setCurrentGroupper(current ? this : undefined);
        }
    }

    isDefault(): boolean {
        const isDefault = this._basic.isDefault || this._extended.isDefault;
        return (typeof isDefault === 'function') ? isDefault.call(this._element) : isDefault;
    }

    setFocused(focused: boolean): void {
        if (this._container) {
            this._container.setFocusedGroupper(focused ? this : undefined);
        }
    }

    setUnlimited(unlimited: boolean): void {
        if (this._container && (
                (this._basic.isLimited === Types.GroupperFocusLimits.Limited) ||
                (this._basic.isLimited === Types.GroupperFocusLimits.LimitedTrapFocus))
        ) {
            this._container.setUnlimitedGroupper(unlimited ? this : undefined);
        }
    }

    forceUpdate(): void {
        if (this._container) {
            this._container.forceUpdate();
        }
    }

    setupContainer(remove?: boolean): void {
        const element = this._element.get();
        const containerElement = element?.parentElement;
        const curContainer = this._container;
        let container: Types.UberGroupper | undefined;

        if (containerElement) {
            const containerTabsterOnElement = getTabsterOnElement(this._tabster, containerElement);

            container = containerTabsterOnElement && containerTabsterOnElement.uberGroupper;

            if (!container && !remove) {
                container = new UberGroupper(this._tabster, containerElement, this._win, this._cur);
            }
        }

        if (curContainer && (remove || (curContainer !== container))) {
            curContainer.removeGroupper(this);
        }

        this._container = container;

        if (container && !remove) {
            container.addGroupper(this);
        }
    }
}

export class FocusableAPI implements Types.FocusableAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _scrollTimer: number | undefined;
    private _scrollTargets: Node[] = [];
    private _cur: CurrentGrouppers;

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
        this._cur = {
            focused: {},
            current: {}
        };
        this._initTimer = getWindow().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        const win = this._win();

        win.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
        win.addEventListener('scroll', this._onScroll, true);

        this._tabster.focusedElement.subscribe(this._onFocus);
    }

    protected dispose(): void {
        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._scrollTimer) {
            win.clearTimeout(this._scrollTimer);
            this._scrollTimer = undefined;
        }

        win.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
        win.removeEventListener('scroll', this._onScroll, true);

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        this._scrollTargets = [];
    }

    static dispose(instance: Types.FocusableAPI): void {
        (instance as FocusableAPI).dispose();
    }

    private _getBody(): HTMLElement | undefined {
        const last = this._tabster.focusedElement.getLastFocusedElement();

        if (last && last.ownerDocument) {
            return last.ownerDocument.body;
        }

        return this._win().document.body;
    }

    static forgetFocusedGrouppers(instance: Types.FocusableAPI): void {
        (instance as FocusableAPI)._updateFocusedGrouppers(null, true);
    }

    private _onFocus = (element: HTMLElement | undefined): void => {
        if (element) {
            this._updateFocusedGrouppers(element);
        }
    }

    private _updateFocusedGrouppers(element: HTMLElement | null, forceUpdate?: boolean): void {
        const newFocusedGrouppers: CurrentGrouppers['focused'] = {};

        for (let el = element; el; el = el.parentElement) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, el);

            if (tabsterOnElement && tabsterOnElement.groupper) {
                newFocusedGrouppers[tabsterOnElement.groupper.id] = tabsterOnElement.groupper;
            }
        }

        for (let gid of Object.keys(this._cur.focused)) {
            if (!newFocusedGrouppers[gid]) {
                const g = this._cur.focused[gid];

                g.setFocused(false);
                g.setUnlimited(false);

                if (forceUpdate) {
                    g.forceUpdate();
                }
            }
        }

        for (let gid of Object.keys(newFocusedGrouppers)) {
            if (!this._cur.focused[gid]) {
                const g = newFocusedGrouppers[gid];
                const groupElement = g.getElement();

                if (groupElement) {
                    g.setFocused(true);

                    if (element !== this._getGroupFirst(groupElement, false)) {
                        g.setUnlimited(true);
                    }
                }
            }
        }

        this._cur.focused = newFocusedGrouppers;
    }

    private _onMutation = (e: MutationEvent): void => {
        if (!e.target || !e.details.groupper) {
            return;
        }

        e.details.groupper.setupContainer(e.details.removed);
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

            UberGroupper.updateVisible(this._scrollTargets);

            this._scrollTargets = [];
        }, _isVisibleTimeout);
    }

    private _getGroupFirst(groupElement: HTMLElement, ignoreGroupper: boolean): HTMLElement | null {
        return this._tabster.focusable.isFocusable(groupElement)
            ? groupElement
            : this._tabster.focusable.findFirst(groupElement, false, false, ignoreGroupper);
    }

    addGroupper(element: HTMLElement, basic?: Types.GroupperBasicProps, extended?: Types.GroupperExtendedProps): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (tabsterOnElement && tabsterOnElement.groupper) {
            throw new Error('The element already has a focus group');
        }

        const groupper = new Groupper(this._tabster, element, this._win, this._cur, basic, extended);

        dispatchMutationEvent(element, { groupper });
    }

    removeGroupper(element: HTMLElement): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        const groupper = tabsterOnElement && tabsterOnElement.groupper;

        if (groupper) {
            groupper.dispose();

            dispatchMutationEvent(element, { groupper, removed: true });
        }
    }

    moveGroupper(from: HTMLElement, to: HTMLElement): void {
        if (from !== to) {
            const tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);
            const groupper = tabsterOnElementFrom && tabsterOnElementFrom.groupper;

            if (groupper) {
                groupper.moveTo(to);

                dispatchMutationEvent(from, { groupper, removed: true });
                dispatchMutationEvent(to, { groupper });
            }
        }
    }

    setGroupperProps(
        element: HTMLElement,
        basic?: Partial<Types.GroupperBasicProps> | null,
        extended?: Partial<Types.GroupperExtendedProps> | null
    ): void {
        let groupper = this._findGroupper(element);

        if (groupper) {
            groupper.setProps(basic, extended);
        }
    }

    setCurrentGroupper(element: HTMLElement | null, forceUpdate?: boolean): void {
        let groupper = element ? this._findGroupper(element) : null;

        if (element === null) {
            for (let gid of Object.keys(this._cur.current)) {
                const g = this._cur.current[gid];

                g.setCurrent(false);

                if (forceUpdate) {
                    g.forceUpdate();
                }
            }
        } else {
            while (groupper) {
                groupper.setCurrent(true);

                if (forceUpdate) {
                    groupper.forceUpdate();
                }

                const parentEl = groupper.getElement()?.parentElement;

                groupper = parentEl ? this._findGroupper(parentEl) : null;
            }
        }
    }

    isInCurrentGroupper(element: HTMLElement): boolean | undefined {
        return this._isInCurrentGroupper(element, false);
    }

    private _isInCurrentGroupper(element: HTMLElement, unlimitedOnly: boolean): boolean | undefined {
        let groupper = this._findGroupper(element);
        let groupElement = groupper?.getElement();

        if (!groupper || !groupElement) {
            return undefined;
        }

        let isValidForLimited = false;

        if (unlimitedOnly) {
            // For a limited group only first focusable in the group is valid.
            isValidForLimited = element.contains(this._getGroupFirst(groupElement, true));
        }

        while (groupper) {
            const state = groupper.getState();

            if (state.isCurrent === false) {
                return false;
            }

            if (unlimitedOnly && state.isLimited && !isValidForLimited) {
                return false;
            }

            const parentEl: HTMLElement | null | undefined = groupElement?.parentElement;

            groupper = parentEl ? this._findGroupper(parentEl) : null;

            if (groupper) {
                groupElement = groupper.getElement();
            }
        }

        return true;
    }

    private _findGroupper(element: HTMLElement): Types.Groupper | null {
        for (let el = element as HTMLElement | null; el; el = el.parentElement) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, el);

            if (tabsterOnElement && tabsterOnElement.groupper) {
                return tabsterOnElement.groupper;
            }
        }

        return null;
    }

    findGroupper(element: HTMLElement): HTMLElement | null {
        const groupper = this._findGroupper(element);

        return groupper ? (groupper.getElement() || null) : null;
    }

    private _findNextGroupper(element: HTMLElement,
        next: (container: Types.UberGroupper, initial: HTMLElement, el?: HTMLElement | null) => HTMLElement | null,
        ignoreModalizer?: boolean
    ): HTMLElement | null {
        const cur = this.findGroupper(element);
        const containerElement = cur && cur.parentElement;

        if (cur && containerElement) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, containerElement);
            const container = tabsterOnElement && tabsterOnElement.uberGroupper;

            if (container) {
                for (let el = next(container, cur); el; el = next(container, cur, el)) {
                    const groupperTabsterOnElement = getTabsterOnElement(this._tabster, el);

                    if (
                        groupperTabsterOnElement &&
                        groupperTabsterOnElement.groupper &&
                        (ignoreModalizer || this.isAccessible(el as HTMLElement))
                    ) {
                        if (!this._tabster.focusable.isFocusable(el) && !this._tabster.focusable.findFirst(el, false, false, true)) {
                            continue;
                        }

                        return el;
                    }
                }
            }
        }

        return null;
    }

    findFirstGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null {
        return this._findNextGroupper(context, (container, initial, el) =>
            ((el === undefined)
                ? (container.getElement()?.firstElementChild || null)
                : (el ? el.nextElementSibling : null)) as HTMLElement | null,
            ignoreModalizer
        );
    }

    findLastGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null {
        return this._findNextGroupper(context, (container, initial, el) =>
            ((el === undefined)
                ? (container.getElement()?.lastElementChild || null)
                : (el ? el.previousElementSibling : null)) as HTMLElement | null,
            ignoreModalizer
        );
    }

    findNextGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null {
        return this._findNextGroupper(context, (container, initial, el) =>
            ((el === undefined)
                ? initial.nextElementSibling
                : (el ? el.nextElementSibling : null)) as HTMLElement | null,
            ignoreModalizer
        );
    }

    findPrevGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null {
        return this._findNextGroupper(context, (container, initial, el) =>
            ((el === undefined)
                ? initial.previousElementSibling
                : (el ? el.previousElementSibling as HTMLElement : null)) as HTMLElement | null,
            ignoreModalizer
        );
    }

    getProps(element: HTMLElement): Types.FocusableProps {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        return (tabsterOnElement && tabsterOnElement.focusable) || {};
    }

    setProps(element: HTMLElement, props: Partial<Types.FocusableProps> | null): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        const curProps: Types.FocusableProps = (tabsterOnElement && tabsterOnElement.focusable) || {};
        const newProps: Types.FocusableProps = {};

        if (props) {
            newProps.isDefault = props.isDefault;
            newProps.isIgnored = props.isIgnored;
            newProps.mover = props.mover;
            newProps.ignoreAriaDisabled = props.ignoreAriaDisabled;
        }

        if (
            (curProps.isDefault !== newProps.isDefault) ||
            (curProps.isIgnored !== newProps.isIgnored) ||
            (curProps.mover !== newProps.mover) ||
            (curProps.ignoreAriaDisabled !== newProps.ignoreAriaDisabled)
        ) {
            setTabsterOnElement(this._tabster, element, { focusable: newProps });
        }
    }

    isFocusable(
        el: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): boolean {
        if (matchesSelector(el, _focusableSelector) && (includeProgrammaticallyFocusable || (el.tabIndex !== -1))) {
            return (noVisibleCheck || this.isVisible(el)) && (noAccessibleCheck || this.isAccessible(el));
        }

        return false;
    }

    isVisible(el: HTMLElement): boolean {
        if (!el.ownerDocument) {
            return false;
        }

        if ((el.offsetParent === null) && (el.ownerDocument.body !== el)) {
            return false;
        }

        const win = el.ownerDocument.defaultView;

        if (!win) {
            return false;
        }

        const rect = el.ownerDocument.body.getBoundingClientRect();

        if ((rect.width === 0) && (rect.height === 0)) {
            // This might happen, for example, if our <body> is in hidden <iframe>.
            return false;
        }

        const computedStyle = win.getComputedStyle(el);

        if (computedStyle.visibility === 'hidden') {
            return false;
        }

        return true;
    }

    isAccessible(el: HTMLElement): boolean {
        for (let e: (HTMLElement | null) = el; e; e = e.parentElement) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, e);
            if (this._isHidden(e)) {
                return false;
            }

            const ignoreDisabled = tabsterOnElement?.focusable?.ignoreAriaDisabled;

            if (!ignoreDisabled && this._isDisabled(e)) {
                return false;
            }
        }

        return true;
    }

    private _attrIs(el: HTMLElement, name: string, value: string): boolean {
        let attrVal = el.getAttribute(name);
        if (attrVal && (attrVal.toLowerCase() === value)) {
            return true;
        }

        return false;

    }

    private _isDisabled(el: HTMLElement): boolean {
        return this._attrIs(el, 'aria-disabled', 'true');
    }

    private _isHidden(el: HTMLElement): boolean {
        return this._attrIs(el, 'aria-hidden', 'true');
    }

    findFirst(
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this._findElement(
            context || this._getBody(),
            null,
            includeProgrammaticallyFocusable,
            ignoreModalizer,
            ignoreGroupper,
            false
        );
    }

    findLast(
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this._findElement(
            context || this._getBody(),
            null,
            includeProgrammaticallyFocusable,
            ignoreModalizer,
            ignoreGroupper,
            true
        );
    }

    findNext(
        current: HTMLElement,
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this._findElement(
            context || this._getBody(),
            current,
            includeProgrammaticallyFocusable,
            ignoreModalizer,
            ignoreGroupper,
            false
        );
    }

    findPrev(
        current: HTMLElement,
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this._findElement(
            context || this._getBody(),
            current,
            includeProgrammaticallyFocusable,
            ignoreModalizer,
            ignoreGroupper,
            true
        );
    }

    findDefault(
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this._findElement(
            context || this._getBody(),
            null,
            includeProgrammaticallyFocusable,
            ignoreModalizer,
            ignoreGroupper,
            false,
            el => (this._tabster.focusable.isFocusable(el, includeProgrammaticallyFocusable) && !!this.getProps(el).isDefault)
        );
    }

    /**
     * Finds all focusables in a given context that satisfy an given condition
     *
     * @param context @see {@link _findElement}
     * @param customFilter A callback that checks whether an element should be added to results
     * @param ignoreProgrammaticallyFocusable @see {@link _findElement}
     * @param ignoreModalizer @see {@link _findElement}
     * @param ignoreGroupper @see {@link _findElement}
     * @param skipDefaultCondition skips the default condition that leverages @see {@link isFocusable}, be careful using this
     */
    findAll(
        context: HTMLElement,
        customFilter: (el: HTMLElement) => boolean,
        includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean,
        skipDefaultCondition?: boolean
    ): HTMLElement[] {
        const acceptCondition = (el: HTMLElement): boolean => {
            const defaultCheck = this._tabster.focusable.isFocusable(
                el,
                includeProgrammaticallyFocusable
            );
            const customCheck = customFilter(el);

            if (skipDefaultCondition) {
                return !!customCheck;
            }

            return defaultCheck && !!customCheck;
        };

        const walker = createElementTreeWalker(
            context.ownerDocument,
            context,
            node =>
                this._acceptElement(
                    node as HTMLElement,
                    acceptCondition,
                    ignoreModalizer,
                    ignoreGroupper
                )
        );

        const nodeFilter = walker?.filter;

        if (!walker || !context || !nodeFilter) {
            return [];
        }

        const foundNodes: HTMLElement[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
            foundNodes.push(node as HTMLElement);
        }

        return foundNodes;
    }

    private _findElement(
        container: HTMLElement | undefined,
        currentElement: HTMLElement | null,
        includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean,
        prev?: boolean,
        acceptCondition?: (el: HTMLElement) => boolean
    ): HTMLElement | null {
        if (!container) {
            return null;
        }

        if (!container.ownerDocument || (currentElement && (container !== currentElement) && !container.contains(currentElement))) {
            return null;
        }

        if (!acceptCondition) {
            acceptCondition = el => this._tabster.focusable.isFocusable(el, includeProgrammaticallyFocusable);
        }

        const walker = createElementTreeWalker(
            container.ownerDocument,
            container,
            (node) => this._acceptElement(node as HTMLElement, acceptCondition!!!, ignoreModalizer, ignoreGroupper)
        );

        if (!walker) {
            return null;
        }

        if (currentElement) {
            walker.currentNode = currentElement;
        } else if (prev) {
            let lastChild: HTMLElement | null = null;

            for (let i = container.lastElementChild; i; i = i.lastElementChild) {
                lastChild = i as HTMLElement;
            }

            if (!lastChild) {
                return null;
            }

            if (this._acceptElement(lastChild, acceptCondition!!!, ignoreModalizer, ignoreGroupper) === NodeFilter.FILTER_ACCEPT) {
                return lastChild;
            } else {
                walker.currentNode = lastChild;
            }
        }

        return (prev ? walker.previousNode() : walker.nextNode()) as (HTMLElement | null);
    }

    private _acceptElement(
        element: HTMLElement,
        acceptCondition: (el: HTMLElement) => boolean,
        ignoreModalizer?: boolean,
        ignoreGroupper?: boolean
    ): number {
        const ctx = RootAPI.getTabsterContext(this._tabster, element);
        if (this._isHidden(element)) {
            return NodeFilter.FILTER_REJECT;
        }

        if (ignoreModalizer || (!ctx || !ctx.modalizer) || ctx.modalizer.getBasicProps().isAlwaysAccessible) {
            if (!ignoreGroupper && (this._isInCurrentGroupper(element, true) === false)) {
                return NodeFilter.FILTER_REJECT;
            }
        }

        return acceptCondition(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
}
