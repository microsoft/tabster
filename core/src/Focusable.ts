/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from './IFrameEvents';
import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { ModalizerAPI } from './Modalizer';
import { dispatchMutationEvent, MUTATION_EVENT_NAME, MutationEvent } from './MutationEvent';
import * as Types from './Types';
import { createElementTreeWalker, isElementVisibleInContainer } from './Utils';

const _focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '*[tabindex]',
    '*[contenteditable]'
].join(', ');

const _customEventName = 'ability-helpers:focusable-related';
const _isVisibleTimeout = 200;

let _lastId = 0;

let _focusedGrouppers: { [id: string]: Types.Groupper } = {};

export class UberGroupper implements Types.UberGroupper {
    private static _containers: { [id: string]: UberGroupper } = {};

    private _element: HTMLElement;

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

    constructor(element: HTMLElement) {
        this._element = element;
        this.id = 'fgc' + ++_lastId;

        setAbilityHelpersOnElement(element, {
            uberGroupper: this
        });

        UberGroupper._containers[this.id] = this;
    }

    dispose(): void {
        this._grouppers = {};

        if (this._updateVisibleTimer) {
            window.clearTimeout(this._updateVisibleTimer);
            this._updateVisibleTimer = undefined;
        }

        setAbilityHelpersOnElement(this._element, {
            uberGroupper: undefined
        });

        delete UberGroupper._containers[this.id];
    }

    getElement(): HTMLElement {
        return this._element;
    }

    addGroupper(groupper: Types.Groupper): void {
        this._grouppers[groupper.id] = groupper;

        this._setFirstLast();

        this._updateVisible(true);
    }

    removeGroupper(groupper: Types.Groupper): void {
        delete this._grouppers[groupper.id];
        delete this._visibleGrouppers[groupper.id];
        delete this._prevVisibleGrouppers[groupper.id];

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

    private _processOnChange(): void {
        if (this._onChangeTimer) {
            return;
        }

        this._onChangeTimer = window.setTimeout(() => {
            this._onChangeTimer = undefined;

            let changed: (Types.Groupper | undefined)[] = [];

            if (this._prevFocused !== this._focused) {
                for (let id of Object.keys(this._grouppers)) {
                    changed.push(this._grouppers[id]);
                }

                if (!this._focused && this._prevFocused && !this._prevFocused.getBasicProps().memorizeCurrent) {
                    this._current = undefined;
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

                    if (isVisible === Types.ElementVisibility.Visible) {
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
        }, 0);
    }

    private _setFirstLast(): void {
        this._first = undefined;
        this._last = undefined;

        for (let e = this._element.firstElementChild; e; e = e.nextElementSibling) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.groupper && (ah.groupper.id in this._grouppers)) {
                this._first = ah.groupper;
                break;
            }
        }

        for (let e = this._element.lastElementChild; e; e = e.previousElementSibling) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.groupper && (ah.groupper.id in this._grouppers)) {
                this._last = ah.groupper;
                break;
            }
        }

        this._processOnChange();
    }

    setCurrentGroupper(groupper: Types.Groupper): void {
        this._current = (groupper.id in this._grouppers) ? groupper : undefined;
        this._prev = undefined;
        this._next = undefined;

        const curElement = this._current && this._current.getElement();

        if (curElement && (curElement.parentElement === this._element)) {
            for (let e = curElement.previousElementSibling; e; e = e.previousElementSibling) {
                const ah = getAbilityHelpersOnElement(e);

                if (ah && ah.groupper) {
                    this._prev = ah.groupper;
                    break;
                }
            }

            for (let e = curElement.nextElementSibling; e; e = e.nextElementSibling) {
                const ah = getAbilityHelpersOnElement(e);

                if (ah && ah.groupper) {
                    this._next = ah.groupper;
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

        this._current = undefined;

        return this._current || null;
    }

    getGroupperState(groupper: Types.Groupper): Types.GroupperState {
        const props = groupper.getBasicProps();
        const isLimited = props.isLimited;
        const isVisible = this._visibleGrouppers[groupper.id] || Types.ElementVisibility.Invisible;
        let isCurrent = this._current ? (this._current === groupper) : undefined;

        if ((isCurrent === undefined) && (props.lookupVisibility !== Types.ElementVisibility.Invisible)) {
            if (
                (isVisible === Types.ElementVisibility.Invisible) ||
                (this._hasFullyVisibleGroupper && (isVisible === Types.ElementVisibility.PartiallyVisible))
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
                (isLimited === Types.GroupperFocusLimit.Limited) ||
                (isLimited === Types.GroupperFocusLimit.LimitedTrapFocus)
            ) ? this._unlimited !== groupper : false
        };
    }

    isEmpty(): boolean {
        return Object.keys(this._grouppers).length === 0;
    }

    private _updateVisible(updateParents: boolean): void {
        if (this._updateVisibleTimer) {
            return;
        }

        if (updateParents) {
            for (let e = this._element.parentElement; e; e = e.parentElement) {
                const ah = getAbilityHelpersOnElement(e);

                if (ah && ah.uberGroupper) {
                    (ah.uberGroupper as UberGroupper)._updateVisible(false);
                }
            }
        }

        this._updateVisibleTimer = window.setTimeout(() => {
            this._updateVisibleTimer = undefined;

            let isChanged = false;
            const visibleGrouppers: { [id: string]: Types.ElementVisibility } = {};

            for (let id of Object.keys(this._grouppers)) {
                const isVisible = isElementVisibleInContainer(this._grouppers[id].getElement());
                const curIsVisible = this._visibleGrouppers[id] || Types.ElementVisibility.Invisible;

                if (isVisible !== Types.ElementVisibility.Invisible) {
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

                if (s.contains(container.getElement())) {
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
    private _element: HTMLElement;
    private _container: Types.UberGroupper | undefined;
    private _basic: Types.GroupperBasicProps;
    private _extended: Types.GroupperExtendedProps;

    readonly id: string;

    constructor(element: HTMLElement, basic?: Types.GroupperBasicProps, extended?: Types.GroupperExtendedProps) {
        this._element = element;
        this._basic = basic || {};
        this._extended = extended || {};
        this.id = 'fg' + ++_lastId;

        setAbilityHelpersOnElement(element, {
            groupper: this
        });

        this.setupContainer();
    }

    dispose(): void {
        if (this._container) {
            this._container.removeGroupper(this);
        }

        this.setupContainer(true);

        setAbilityHelpersOnElement(this._element, {
            groupper: undefined
        });
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

    getElement(): HTMLElement {
        return this._element;
    }

    moveTo(newElement: HTMLElement): void {
        if (this._element !== newElement) {
            this.setupContainer(true);

            this._element = newElement;

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
                isVisible: Types.ElementVisibility.Invisible,
                hasFocus: false,
                siblingIsVisible: false,
                siblingHasFocus: false,
                isLimited: false
            };
    }

    makeCurrent(): void {
        if (this._container) {
            this._container.setCurrentGroupper(this);
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
                (this._basic.isLimited === Types.GroupperFocusLimit.Limited) ||
                (this._basic.isLimited === Types.GroupperFocusLimit.LimitedTrapFocus))
        ) {
            this._container.setUnlimitedGroupper(unlimited ? this : undefined);
        }
    }

    setupContainer(remove?: boolean): void {
        const containerElement = this._element.parentElement;
        const curContainer = this._container;
        let container: Types.UberGroupper | undefined;

        if (containerElement) {
            const cAh = getAbilityHelpersOnElement(containerElement);

            container = cAh && cAh.uberGroupper;

            if (!container && !remove) {
                container = new UberGroupper(containerElement);
            }
        }

        if (curContainer !== container) {
            if (curContainer) {
                curContainer.removeGroupper(this);
            }

            this._container = container;

            if (!remove && container) {
                container.addGroupper(this);
            }
        }
    }
}

export class FocusableAPI implements Types.FocusableAPI {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window | undefined;
    private _initTimer: number | undefined;
    private _scrollTimer: number | undefined;
    private _scrollTargets: Node[] = [];

    constructor(ah: Types.AbilityHelpers, mainWindow?: Window) {
        this._ah = ah;

        if (mainWindow) {
            this._mainWindow = mainWindow;
            this._initTimer = this._mainWindow.setTimeout(this._init, 0);
        }
    }

    private _init = (): void => {
        if (!this._mainWindow) {
            return;
        }

        this._initTimer = undefined;

        this._mainWindow.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent, true); // Capture!
        this._mainWindow.addEventListener('scroll', this._onScroll, true);

        this._ah.focusedElement.subscribe(this._onFocus);
    }

    protected dispose(): void {
        if (!this._mainWindow) {
            return;
        }

        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._scrollTimer) {
            this._mainWindow.clearTimeout(this._scrollTimer);
            this._scrollTimer = undefined;
        }

        this._mainWindow.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent, true); // Capture!

        this._ah.focusedElement.unsubscribe(this._onFocus);
    }

    private _getBody(): HTMLElement | undefined {
        const last = this._ah.focusedElement.getLastFocusedElement();

        if (last && last.ownerDocument) {
            return last.ownerDocument.body;
        }

        if (this._mainWindow) {
            return this._mainWindow.document.body;
        }

        return undefined;
    }

    private _onFocus = (element: HTMLElement | undefined): void => {
        if (element) {
            const newFocusedGrouppers: typeof _focusedGrouppers = {};

            for (let el = element as HTMLElement | null; el; el = el.parentElement) {
                const ah = getAbilityHelpersOnElement(el);

                if (ah && ah.groupper) {
                    newFocusedGrouppers[ah.groupper.id] = ah.groupper;
                }
            }

            for (let gid of Object.keys(_focusedGrouppers)) {
                if (!newFocusedGrouppers[gid]) {
                    const g = _focusedGrouppers[gid];
                    g.setFocused(false);
                    g.setUnlimited(false);
                }
            }

            for (let gid of Object.keys(newFocusedGrouppers)) {
                if (!_focusedGrouppers[gid]) {
                    const g = newFocusedGrouppers[gid];
                    const groupElement = g.getElement();

                    g.setFocused(true);

                    if (element !== this._getGroupFirst(groupElement, false)) {
                        g.setUnlimited(true);
                    }
                }
            }

            _focusedGrouppers = newFocusedGrouppers;
        }
    }

    private _onIFrameEvent = (e: EventFromIFrame): void => {
        if (!e.targetDetails) {
            return;
        }

        switch (e.targetDetails.descriptor.name) {
            case 'scroll':
                this._onScroll(e.originalEvent as UIEvent);
                break;

            case MUTATION_EVENT_NAME:
                this._onMutation(e.originalEvent as MutationEvent);
                break;
        }
    }

    private _onMutation = (e: MutationEvent): void => {
        if (!e.target || !e.details.groupper) {
            return;
        }

        e.details.groupper.setupContainer(e.details.removed);
    }

    private _onScroll = (e: UIEvent) => {
        if (!this._mainWindow) {
            return;
        }

        let isKnownTarget = false;

        for (let t of this._scrollTargets) {
            if (t === e.target) {
                isKnownTarget = true;
                break;
            }
        }

        if (!isKnownTarget && (e.target instanceof Node)) {
            this._scrollTargets.push(e.target);
        }

        if (this._scrollTimer) {
            this._mainWindow.clearTimeout(this._scrollTimer);
        }

        this._scrollTimer = this._mainWindow.setTimeout(() => {
            this._scrollTimer = undefined;

            UberGroupper.updateVisible(this._scrollTargets);

            this._scrollTargets = [];
        }, _isVisibleTimeout);
    }

    private _getGroupFirst(groupElement: HTMLElement, ignoreGroupper: boolean): HTMLElement | null {
        return this._ah.focusable.isFocusable(groupElement)
            ? groupElement
            : this._ah.focusable.findFirst(groupElement, false, false, ignoreGroupper);
    }

    addGroupper(element: HTMLElement, basic?: Types.GroupperBasicProps, extended?: Types.GroupperExtendedProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.groupper) {
            throw new Error('The element already has a focus group');
        }

        const groupper = new Groupper(element, basic, extended);

        dispatchMutationEvent(element, { groupper });
    }

    removeGroupper(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);
        const groupper = ah && ah.groupper;

        if (groupper) {
            groupper.dispose();

            dispatchMutationEvent(element, { groupper, removed: true });
        }
    }

    moveGroupper(from: HTMLElement, to: HTMLElement): void {
        if (from !== to) {
            const ahFrom = getAbilityHelpersOnElement(from);
            const groupper = ahFrom && ahFrom.groupper;

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

    setCurrentGroupper(element: HTMLElement): void {
        let groupper = this._findGroupper(element);

        while (groupper) {
            groupper.makeCurrent();

            const parentEl = groupper.getElement().parentElement;

            groupper = parentEl ? this._findGroupper(parentEl) : null;
        }
    }

    isInCurrentGroupper(element: HTMLElement): boolean | undefined {
        return this._isInCurrentGroupper(element, false);
    }

    private _isInCurrentGroupper(element: HTMLElement, unlimitedOnly: boolean): boolean | undefined {
        let groupper = this._findGroupper(element);

        if (!groupper) {
            return undefined;
        }

        let groupElement = groupper.getElement();
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

            const parentEl = groupElement.parentElement;

            groupper = parentEl ? this._findGroupper(parentEl) : null;

            if (groupper) {
                groupElement = groupper.getElement();
            }
        }

        return true;
    }

    private _findGroupper(element: HTMLElement): Types.Groupper | null {
        for (let el = element as HTMLElement | null; el; el = el.parentElement) {
            const ah = getAbilityHelpersOnElement(el);

            if (ah && ah.groupper) {
                return ah.groupper;
            }
        }

        return null;
    }

    findGroupper(element: HTMLElement): HTMLElement | null {
        const groupper = this._findGroupper(element);

        return groupper ? groupper.getElement() : null;
    }

    private _findNextGroupper(element: HTMLElement,
        next: (container: Types.UberGroupper, initial: HTMLElement, el?: HTMLElement | null) => HTMLElement | null,
        ignoreModalizer?: boolean
    ): HTMLElement | null {
        const cur = this.findGroupper(element);
        const containerElement = cur && cur.parentElement;

        if (cur && containerElement) {
            const ah = getAbilityHelpersOnElement(containerElement);
            const container = ah && ah.uberGroupper;

            if (container) {
                for (let el = next(container, cur); el; el = next(container, cur, el)) {
                    const gAh = getAbilityHelpersOnElement(el);

                    if (gAh && gAh.groupper && (ignoreModalizer || this.isAccessible(el as HTMLElement))) {
                        if (!this._ah.focusable.isFocusable(el) && !this._ah.focusable.findFirst(el, false, false, true)) {
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
                ? container.getElement().firstElementChild
                : (el ? el.nextElementSibling : null)) as HTMLElement | null,
            ignoreModalizer
        );
    }

    findLastGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null {
        return this._findNextGroupper(context, (container, initial, el) =>
            ((el === undefined)
                ? container.getElement().lastElementChild
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
        const ah = getAbilityHelpersOnElement(element);
        const props = ah && ah.focusable;

        return {
            isDefault: !!(props && props.isDefault),
            isIgnored: !!(props && props.isIgnored)
        };
    }

    setProps(element: HTMLElement, props: Partial<Types.FocusableProps> | null): void {
        const ah = getAbilityHelpersOnElement(element);
        let curProps = ah && ah.focusable;
        let newProps: Types.FocusableProps | undefined;

        if (props) {
            newProps = {
                isDefault: ('isDefault' in props) ? (!!props.isDefault) : (curProps ? curProps.isDefault : false),
                isIgnored: ('isIgnored' in props) ? (!!props.isIgnored) : (curProps ? curProps.isIgnored : false)
            };
        }

        setAbilityHelpersOnElement(element, { focusable: newProps });
    }

    isFocusable(
        el: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): boolean {
        if (el.matches && el.matches(_focusableSelector) && (includeProgrammaticallyFocusable || (el.tabIndex !== -1))) {
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
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.modalizer && !ah.modalizer.isActive()) {
                return true;
            }

            let attrVal = e.getAttribute('aria-hidden');

            if (attrVal && (attrVal.toLowerCase() === 'true')) {
                return false;
            }

            attrVal = e.getAttribute('aria-disabled');

            if (attrVal && (attrVal.toLowerCase() === 'true')) {
                return false;
            }
        }

        return true;
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
            el => (this._ah.focusable.isFocusable(el, includeProgrammaticallyFocusable) && this.getProps(el).isDefault)
        );
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
            acceptCondition = el => this._ah.focusable.isFocusable(el, includeProgrammaticallyFocusable);
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
        const modalizerInfo = ModalizerAPI.findModalizer(element);
        const currentModalizerId = modalizerInfo && modalizerInfo.root.getCurrentModalizerId();

        if (ignoreModalizer || !modalizerInfo ||
            (currentModalizerId === undefined) ||
            (currentModalizerId === modalizerInfo.modalizer.userId) ||
            modalizerInfo.modalizer.getBasicProps().isAlwaysAccessible
        ) {
            if (!ignoreGroupper && (this._isInCurrentGroupper(element, true) === false)) {
                return NodeFilter.FILTER_REJECT;
            }

            return acceptCondition(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }

        return modalizerInfo ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
    }
}

export function setupFocusableInIFrame(iframeDocument: HTMLDocument, mainWindow?: Window): void {
    if (!mainWindow) {
        return;
    }

    setupIFrameToMainWindowEventsDispatcher(mainWindow, iframeDocument, _customEventName, [
        { type: EventFromIFrameDescriptorType.Document, name: MUTATION_EVENT_NAME, capture: true },
        { type: EventFromIFrameDescriptorType.Window, name: 'scroll', capture: true }
    ]);
}
