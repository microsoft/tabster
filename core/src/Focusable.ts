/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from './IFrameEvents';
import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { ModalityLayer } from './ModalityLayer';
import { dispatchMutationEvent, MUTATION_EVENT_NAME, MutationEvent } from './MutationEvent';
import * as Types from './Types';
import { createElementTreeWalker } from './Utils';

//const _defaultFocusableAttributeName = 'data-ah-default';

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

let _lastId = 0;

let _focusedGroups: { [id: string]: Types.FocusableGroup } = {};

export class FocusableGroupContainer implements Types.FocusableGroupContainer {
    private _element: HTMLElement;

    private _current: Types.FocusableGroup | undefined;
    private _prev: Types.FocusableGroup | undefined;
    private _next: Types.FocusableGroup | undefined;
    private _first: Types.FocusableGroup | undefined;
    private _last: Types.FocusableGroup | undefined;
    private _focused: Types.FocusableGroup | undefined;
    private _unlimited: Types.FocusableGroup | undefined;

    private _prevCurrent: Types.FocusableGroup | undefined;
    private _prevPrev: Types.FocusableGroup | undefined;
    private _prevNext: Types.FocusableGroup | undefined;
    private _prevFirst: Types.FocusableGroup | undefined;
    private _prevLast: Types.FocusableGroup | undefined;
    private _prevFocused: Types.FocusableGroup | undefined;
    private _prevUnlimited: Types.FocusableGroup | undefined;

    private _onChangeTimer: number | undefined;

    private _props: Types.FocusableGroupContainerProps;
    private _groups: { [id: string]: Types.FocusableGroup } = {};

    readonly id: string;

    constructor(element: HTMLElement, props?: Partial<Types.FocusableGroupContainerProps>) {
        this._element = element;
        this._props = props || {};
        this.id = 'fgc' + ++_lastId;

        setAbilityHelpersOnElement(element, {
            focusableGroupContainer: this
        });
    }

    dispose(): void {
        this._groups = {};

        setAbilityHelpersOnElement(this._element, {
            focusableGroupContainer: undefined
        });
    }

    setProps(props: Partial<Types.FocusableGroupContainerProps> | null): void {
        if (props) {
            for (let name of Object.keys(props) as (keyof Types.FocusableGroupContainerProps)[]) {
                this._props[name] = props[name];
            }
        } else {
            this._props = {};
        }
    }

    getProps(): Types.FocusableGroupContainerProps {
        return this._props;
    }

    getElement(): HTMLElement {
        return this._element;
    }

    addGroup(group: Types.FocusableGroup): void {
        this._groups[group.id] = group;

        this._setFirstLast();
    }

    removeGroup(group: Types.FocusableGroup): void {
        delete this._groups[group.id];

        this._setFirstLast();
    }

    setFocusedGroup(group: Types.FocusableGroup | undefined): void {
        if (group !== this._focused) {
            this._focused = group;
            this._processOnChange();
        }
    }

    setUnlimitedGroup(group: Types.FocusableGroup): void {
        if (group !== this._unlimited) {
            this._unlimited = group;
            this._processOnChange();
        }
    }

    private _processOnChange(): void {
        if (this._onChangeTimer) {
            return;
        }

        this._onChangeTimer = window.setTimeout(() => {
            this._onChangeTimer = undefined;

            let changed: (Types.FocusableGroup | undefined)[] = [];

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

            if (this._prevFocused !== this._focused) {
                for (let id of Object.keys(this._groups)) {
                    changed.push(this._groups[id]);
                }
                this._prevFocused = this._focused;
            }

            if (this._prevUnlimited !== this._unlimited) {
                changed.push(this._prevUnlimited);
                changed.push(this._unlimited);
                this._prevUnlimited = this._unlimited;
            }

            const processed: { [id: string]: boolean } = {};

            for (let g of changed.filter(c => (c && this._groups[c.id]))) {
                if (g && !processed[g.id]) {
                    processed[g.id] = true;

                    const onChange = g.getProps().onChange;

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

            if (ah && ah.focusableGroup && (ah.focusableGroup.id in this._groups)) {
                this._first = ah.focusableGroup;
                break;
            }
        }

        for (let e = this._element.lastElementChild; e; e = e.previousElementSibling) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.focusableGroup && (ah.focusableGroup.id in this._groups)) {
                this._last = ah.focusableGroup;
                break;
            }
        }

        this._processOnChange();
    }

    setCurrentGroup(group: Types.FocusableGroup): void {
        this._current = (group.id in this._groups) ? group : undefined;
        this._prev = undefined;
        this._next = undefined;

        const curElement = this._current && this._current.getElement();

        if (curElement && (curElement.parentElement === this._element)) {
            for (let e = curElement.previousElementSibling; e; e = e.previousElementSibling) {
                const ah = getAbilityHelpersOnElement(e);

                if (ah && ah.focusableGroup) {
                    this._prev = ah.focusableGroup;
                    break;
                }
            }

            for (let e = curElement.nextElementSibling; e; e = e.nextElementSibling) {
                const ah = getAbilityHelpersOnElement(e);

                if (ah && ah.focusableGroup) {
                    this._next = ah.focusableGroup;
                    break;
                }
            }
        }

        this._processOnChange();
    }

    getCurrentGroup(): Types.FocusableGroup | null {
        if (this._current && (this._current.id in this._groups)) {
            return this._current;
        }

        this._current = undefined;

        return this._current || null;
    }

    getGroupState(group: Types.FocusableGroup): Types.FocusableGroupState {
        const isLimited = group.getProps().isLimited;
        let isVisible = false;

        return {
            isCurrent: this._current ? (this._current === group) : undefined,
            isPrevious: this._prev === group,
            isNext: this._next === group,
            isFirst: this._first === group,
            isLast: this._last === group,
            isVisible,
            hasFocus: this._focused === group,
            siblingHasFocus: !!this._focused && (this._focused !== group),
            isLimited: (
                (isLimited === Types.FocusableGroupFocusLimit.Limited) ||
                (isLimited === Types.FocusableGroupFocusLimit.LimitedTrapFocus)
            ) ? this._unlimited !== group : false
        };
    }

    isEmpty(): boolean {
        return Object.keys(this._groups).length === 0;
    }
}

export class FocusableGroup implements Types.FocusableGroup {
    private _element: HTMLElement;
    private _container: Types.FocusableGroupContainer | undefined;
    private _props: Types.FocusableGroupProps;

    readonly id: string;

    constructor(element: HTMLElement, props: Types.FocusableGroupProps) {
        this._element = element;
        this._props = props;
        this.id = 'fg' + ++_lastId;

        setAbilityHelpersOnElement(element, {
            focusableGroup: this
        });

        this.setupContainer();
    }

    dispose(): void {
        this.setupContainer(true);

        setAbilityHelpersOnElement(this._element, {
            focusableGroup: undefined
        });
    }

    getProps(): Types.FocusableGroupProps {
        return this._props;
    }

    setProps(props: Types.FocusableGroupProps): void {
        for (let name of Object.keys(props) as (keyof Types.FocusableGroupProps)[]) {
            if (props[name] === undefined) {
                delete this._props[name];
            } else {
                (this._props[name] as (Types.FocusableGroupProps[keyof Types.FocusableGroupProps])) = props[name];
            }
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

    getState(): Types.FocusableGroupState {
        return this._container
            ? this._container.getGroupState(this)
            : {
                isCurrent: undefined,
                isPrevious: false,
                isNext: false,
                isFirst: false,
                isLast: false,
                isVisible: false,
                hasFocus: false,
                siblingHasFocus: false,
                isLimited: false
            };
    }

    makeCurrent(): void {
        if (this._container) {
            this._container.setCurrentGroup(this);
        }
    }

    isDefault(): boolean {
        const isDefault = this._props.isDefault;
        return (typeof isDefault === 'function') ? isDefault.call(this._element) : isDefault;
    }

    setFocused(focused: boolean): void {
        if (this._container) {
            this._container.setFocusedGroup(focused ? this : undefined);
        }
    }

    setUnlimited(unlimited: boolean): void {
        if (this._container && (
                (this._props.isLimited === Types.FocusableGroupFocusLimit.Limited) ||
                (this._props.isLimited === Types.FocusableGroupFocusLimit.LimitedTrapFocus))
        ) {
            this._container.setUnlimitedGroup(unlimited ? this : undefined);
        }
    }

    setupContainer(remove?: boolean): void {
        const containerElement = this._element.parentElement;
        const curContainer = this._container;
        let container: Types.FocusableGroupContainer | undefined;

        if (containerElement) {
            const cAh = getAbilityHelpersOnElement(containerElement);

            container = cAh && cAh.focusableGroupContainer;

            if (!container && !remove) {
                container = new FocusableGroupContainer(containerElement, {});
            }
        }

        if (curContainer !== container) {
            if (curContainer) {
                curContainer.removeGroup(this);
            }

            this._container = container;

            if (!remove && container) {
                container.addGroup(this);
            }
        }
    }
}

export class Focusable implements Types.Focusable {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _initTimer: number | undefined;

    constructor(mainWindow: Window, ah: Types.AbilityHelpers) {
        this._ah = ah;
        this._mainWindow = mainWindow;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._mainWindow.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent, true); // Capture!

        this._ah.focusedElement.subscribe(this._onFocus);
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._mainWindow.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent, true); // Capture!

        this._ah.focusedElement.unsubscribe(this._onFocus);
    }

    private _onFocus = (element: HTMLElement | undefined): void => {
        if (element) {
            const newFocusedGroups: typeof _focusedGroups = {};

            for (let el = element as HTMLElement | null; el; el = el.parentElement) {
                const ah = getAbilityHelpersOnElement(el);

                if (ah && ah.focusableGroup) {
                    newFocusedGroups[ah.focusableGroup.id] = ah.focusableGroup;
                }
            }

            for (let gid of Object.keys(_focusedGroups)) {
                if (!newFocusedGroups[gid]) {
                    const g = _focusedGroups[gid];
                    g.setFocused(false);
                    g.setUnlimited(false);
                }
            }

            for (let gid of Object.keys(newFocusedGroups)) {
                if (!_focusedGroups[gid]) {
                    const g = newFocusedGroups[gid];

                    g.setFocused(true);

                    if (g.getElement() !== element) {
                        g.setUnlimited(true);
                    }
                }
            }

            _focusedGroups = newFocusedGroups;
        }
    }

    private _onIFrameEvent = (e: EventFromIFrame): void => {
        if (!e.targetDetails) {
            return;
        }

        switch (e.targetDetails.descriptor.name) {
            case MUTATION_EVENT_NAME:
                this._onMutation(e.originalEvent as MutationEvent);
                break;
        }
    }

    private _onMutation = (e: MutationEvent): void => {
        if (!e.target || !e.details.group) {
            return;
        }

        // TODO.
    }

    addGroup(element: HTMLElement, props: Types.FocusableGroupProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.focusableGroup) {
            throw new Error('The element already has a focus group');
        }

        const group = new FocusableGroup(element, props || {});

        dispatchMutationEvent(element, { group });
    }

    removeGroup(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);
        const group = ah && ah.focusableGroup;

        if (group) {
            group.dispose();

            dispatchMutationEvent(element, { group, removed: true });
        }
    }

    moveGroup(from: HTMLElement, to: HTMLElement): void {
        if (from !== to) {
            const ahFrom = getAbilityHelpersOnElement(from);
            const group = ahFrom && ahFrom.focusableGroup;

            if (group) {
                group.moveTo(to);

                dispatchMutationEvent(from, { group, removed: true });
                dispatchMutationEvent(to, { group });
            }
        }
    }

    setGroupProps(element: HTMLElement, props: Types.FocusableGroupProps): void {
        let group = this._findGroup(element);

        if (group) {
            group.setProps(props);
        }
    }

    setCurrentGroup(element: HTMLElement): void {
        let group = this._findGroup(element);

        while (group) {
            group.makeCurrent();

            const parentEl = group.getElement().parentElement;

            group = parentEl ? this._findGroup(parentEl) : null;
        }
    }

    isInCurrentGroup(element: HTMLElement): boolean {
        return this._isInCurrentGroup(element, false);
    }

    private _isInCurrentGroup(element: HTMLElement, checkLimited: boolean): boolean {
        let group = this._findGroup(element);
        let elementIsGroup = false;

        if (checkLimited && group) {
            elementIsGroup = group.getElement() === element;
        }

        while (group) {
            const state = group.getState();

            if (state.isCurrent === false) {
                return false;
            }

            if (checkLimited && state.isLimited && !elementIsGroup) {
                return false;
            }

            const parentEl = group.getElement().parentElement;

            group = parentEl ? this._findGroup(parentEl) : null;
        }

        return true;
    }

    private _findGroup(element: HTMLElement): Types.FocusableGroup | null {
        for (let el = element as HTMLElement | null; el; el = el.parentElement) {
            const ah = getAbilityHelpersOnElement(el);

            if (ah && ah.focusableGroup) {
                return ah.focusableGroup;
            }
        }

        return null;
    }

    findGroup(element: HTMLElement): HTMLElement | null {
        const group = this._findGroup(element);

        return group ? group.getElement() : null;
    }

    private _findNextGroup(element: HTMLElement,
            next: (container: Types.FocusableGroupContainer, initial: HTMLElement, el?: HTMLElement | null) => HTMLElement | null,
            ignoreLayer?: boolean): HTMLElement | null {

        const cur = this.findGroup(element);
        const containerElement = cur && cur.parentElement;

        if (cur && containerElement) {
            const ah = getAbilityHelpersOnElement(containerElement);
            const container = ah && ah.focusableGroupContainer;

            if (container) {
                for (let el = next(container, cur); el; el = next(container, cur, el)) {
                    const gAh = getAbilityHelpersOnElement(el);

                    if (gAh && gAh.focusableGroup && (ignoreLayer || this.isAccessible(el as HTMLElement))) {
                        return el as HTMLElement;
                    }
                }
            }
        }

        return null;
    }

    findFirstGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null {
        return this._findNextGroup(context, (container, initial, el) =>
            ((el === undefined)
                ? container.getElement().firstElementChild
                : (el ? el.nextElementSibling : null)) as HTMLElement | null,
            ignoreLayer
        );
    }

    findLastGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null {
        return this._findNextGroup(context, (container, initial, el) =>
            ((el === undefined)
                ? container.getElement().lastElementChild
                : (el ? el.previousElementSibling : null)) as HTMLElement | null,
            ignoreLayer
        );
    }

    findNextGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null {
        return this._findNextGroup(context, (container, initial, el) =>
            ((el === undefined)
                ? initial.nextElementSibling
                : (el ? el.nextElementSibling : null)) as HTMLElement | null,
            ignoreLayer
        );
    }

    findPrevGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null {
        return this._findNextGroup(context, (container, initial, el) =>
            ((el === undefined)
                ? initial.previousElementSibling
                : (el ? el.previousElementSibling as HTMLElement : null)) as HTMLElement | null,
            ignoreLayer
        );
    }

    getGroupContainerProps(element: HTMLElement): Types.FocusableGroupContainerProps | null {
        const ah = getAbilityHelpersOnElement(element);

        return (ah && ah.focusableGroupContainer) ? ah.focusableGroupContainer.getProps() : null;
    }

    setGroupContainerProps(element: HTMLElement, props: Partial<Types.FocusableGroupContainerProps> | null): void {
        const ah = getAbilityHelpersOnElement(element);
        let container = ah && ah.focusableGroupContainer;

        if (container) {
            if ((props === null) && container.isEmpty()) {
                container.dispose();
            } else {
                container.setProps(props);
            }
        } else if (props) {
            container = new FocusableGroupContainer(element, props);
        }
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

    isFocusable(el: HTMLElement, includeProgrammaticallyFocusable?: boolean, noAccessibleCheck?: boolean): boolean {
        if (el.matches && el.matches(_focusableSelector) && (includeProgrammaticallyFocusable || (el.tabIndex !== -1))) {
            return this.isVisible(el) && (noAccessibleCheck ? true : this.isAccessible(el));
        }

        return false;
    }

    isVisible(el: HTMLElement): boolean {
        if (el.offsetParent === null) {
            return false;
        }

        const win = el.ownerDocument && el.ownerDocument.defaultView;

        if (!win) {
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

            if (ah && ah.modalityLayer && !ah.modalityLayer.isActive()) {
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

    findFirst(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null {
        return this._findElement(context || this._mainWindow.document.body, null, includeProgrammaticallyFocusable, ignoreLayer, false);
    }

    findLast(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null {
        return this._findElement(context || this._mainWindow.document.body, null, includeProgrammaticallyFocusable, ignoreLayer, true);
    }

    findNext(current: HTMLElement, context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
            ignoreLayer?: boolean): HTMLElement | null {
        return this._findElement(context || this._mainWindow.document.body, current, includeProgrammaticallyFocusable, ignoreLayer, false);
    }

    findPrev(current: HTMLElement, context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
            ignoreLayer?: boolean): HTMLElement | null {
        return this._findElement(context || this._mainWindow.document.body, current, includeProgrammaticallyFocusable, ignoreLayer, true);
    }

    findDefault(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null {
        return this._findElement(
            context || this._mainWindow.document.body,
            null,
            includeProgrammaticallyFocusable,
            ignoreLayer,
            false,
            el => (this._ah.focusable.isFocusable(el, includeProgrammaticallyFocusable) && this.getProps(el).isDefault)
        );
    }

    private _findElement(
        container: HTMLElement,
        currentElement: HTMLElement | null,
        includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean,
        prev?: boolean,
        acceptCondition?: (el: HTMLElement) => boolean
    ): HTMLElement | null {
        if (!container.ownerDocument || (currentElement && (container !== currentElement) && !container.contains(currentElement))) {
            return null;
        }

        if (!acceptCondition) {
            acceptCondition = el => this._ah.focusable.isFocusable(el, includeProgrammaticallyFocusable);
        }

        const walker = createElementTreeWalker(
            container.ownerDocument,
            container,
            (node) => this._acceptElement(node as HTMLElement, acceptCondition!!!, ignoreLayer)
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

            if (this._acceptElement(lastChild, acceptCondition!!!, ignoreLayer) === NodeFilter.FILTER_ACCEPT) {
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
        ignoreLayer?: boolean
    ): number {
        const layerInfo = ModalityLayer.getLayerFor(element);
        const currentLayerId = layerInfo && layerInfo.root.getCurrentLayerId();

        if (ignoreLayer || !layerInfo ||
                (currentLayerId === undefined) ||
                (currentLayerId === layerInfo.layer.userId) ||
                layerInfo.layer.isAlwaysAccessible()) {

            if (!this._isInCurrentGroup(element, true)) {
                return NodeFilter.FILTER_REJECT;
            }

            return acceptCondition(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }

        return layerInfo ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
    }
}

export function setupFocusableInIFrame(mainWindow: Window, iframeDocument: HTMLDocument): void {
    setupIFrameToMainWindowEventsDispatcher(mainWindow, iframeDocument, _customEventName, [
        { type: EventFromIFrameDescriptorType.Document, name: MUTATION_EVENT_NAME, capture: true }
    ]);
}
