/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from './IFrameEvents';
import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { dispatchMutationEvent, MUTATION_EVENT_NAME, MutationEvent } from './MutationEvent';
import * as Types from './Types';
import { createElementTreeWalker } from './Utils';

const _customEventName = 'ability-helpers:modalizer-related';
const _noRootId = 'no-root';

let _lastInternalId = 0;
let _rootById: { [id: string]: Types.ModalizerRoot } = {};

export interface ModalizerFor {
    root: Types.ModalizerRoot;
    modalizer: Types.Modalizer;
}

export class Modalizer implements Types.Modalizer {
    readonly internalId: string;
    userId: string;

    private _ah: Types.AbilityHelpers;
    private _element: HTMLElement;
    private _basic: Types.ModalizerBasicProps;
    private _extended: Types.ModalizerExtendedProps;
    private _isActive: boolean | undefined;
    private _isAccessible = true;
    private _setAccessibleTimer: number | undefined;
    private _isFocused = false;

    constructor(
        element: HTMLElement,
        ah: Types.AbilityHelpers,
        basic: Types.ModalizerBasicProps,
        extended?: Types.ModalizerExtendedProps
    ) {
        this._ah = ah;

        this.internalId = 'ml' + ++_lastInternalId;
        this.userId = basic.id;

        this._element = element;
        this._basic = basic;
        this._extended = extended || {};
        this._setAccessibilityProps();

        if (__DEV__) {
            this._setInformativeStyle();
        }
    }

    setProps(basic?: Partial<Types.ModalizerBasicProps> | null, extended?: Partial<Types.ModalizerExtendedProps> | null): void {
        if (basic) {
            if (basic.id) {
                this.userId = basic.id;
            }

            this._basic = { ...this._basic, ...basic };
        } else if (basic === null) {
            this._basic = { id: this.userId };
        }

        if (extended) {
            this._extended = { ...this._extended, ...extended };
        } else if (extended === null) {
            this._extended = {};
        }

        this._setAccessibilityProps();
    }

    dispose(): void {
        this._remove();
    }

    move(newElement: HTMLElement): void {
        this._remove();

        this._element = newElement;

        this._setAccessibilityProps();

        this._isAccessible = !this._isAccessible;
        this._isActive = !this._isActive;

        this.setAccessible(!this._isAccessible);
        this.setActive(!this._isActive);
    }

    setAccessible(accessible: boolean): void {
        if (accessible === this._isAccessible) {
            return;
        }

        this._isAccessible = accessible;

        if (this._setAccessibleTimer) {
            window.clearTimeout(this._setAccessibleTimer);

            this._setAccessibleTimer = undefined;
        }

        if (accessible) {
            this._element.removeAttribute('aria-hidden');
        } else {
            this._setAccessibleTimer = window.setTimeout(() => {
                this._setAccessibleTimer = undefined;

                this._element.setAttribute('aria-hidden', 'true');
            }, 0);
        }

        if (__DEV__) {
            this._setInformativeStyle();
        }
    }

    setActive(active: boolean): void {
        if (active === this._isActive) {
            return;
        }

        this._isActive = active;

        if (__DEV__) {
            this._setInformativeStyle();
        }
    }

    isActive(): boolean {
        return !!this._isActive;
    }

    getElement(): HTMLElement {
        return this._element;
    }

    setFocused(focused: boolean): void {
        if (this._isFocused === focused) {
            return;
        }

        this._isFocused = focused;

        if (focused) {
            if (this._extended.onFocusIn) {
                this._extended.onFocusIn();
            }
        } else {
            if (this._extended.onFocusOut) {
                this._extended.onFocusOut(false);
            }
        }

        if (__DEV__) {
            this._setInformativeStyle();
        }
    }

    onBeforeFocusOut(): boolean {
        if (this._extended.onFocusOut) {
            return this._extended.onFocusOut(true);
        }

        return false;
    }

    getBasicProps(): Types.ModalizerBasicProps {
        return this._basic;
    }

    getExtendedProps(): Types.ModalizerExtendedProps {
        return this._extended;
    }

    private _remove(): void {
        if (__DEV__) {
            this._element.style.removeProperty('--ah-modalizer');
        }
    }

    private _setAccessibilityProps(): void {
        if (__DEV__ && !this._element.getAttribute('aria-label')) {
            throw new Error('Modalizer must have aria-label');
        }

        if (!this._element.hasAttribute('tabindex')) {
            this._element.tabIndex = -1;
        }

        if (this._element.tabIndex < 0) {
            this._ah.outline.ignoreElement(this._element);
        }
    }

    private _setInformativeStyle(): void {
        if (__DEV__) {
            this._element.style.setProperty(
                '--ah-modalizer',
                this.internalId + ',' + this.userId +
                    ',' +
                        (this._isActive ? 'active' : 'inactive') +
                            ',' +
                                (this._isAccessible ? 'accessible' : 'inaccessible') +
                                    ',' +
                                        (this._isFocused ? 'focused' : 'not-focused')
            );
        }
    }
}

export class ModalizerRoot implements Types.ModalizerRoot {
    readonly id: string;

    private _element: HTMLElement;
    private _curModalizerId: string | undefined;
    private _knownModalizers: { [id: string]: Types.Modalizer } = {};
    private _updateModalizersTimer: number | undefined;

    constructor(element: HTMLElement) {
        this.id = 'root' + ++_lastInternalId;
        this._element = element;
        this._add();
    }

    dispose(): void {
        if (this._updateModalizersTimer) {
            window.clearTimeout(this._updateModalizersTimer);
            this._updateModalizersTimer = undefined;
        }

        this._remove();
    }

    move(newElement: HTMLElement): void {
        this._remove();
        this._element = newElement;
        this._add();
        this.updateModalizers();
    }

    getElement(): HTMLElement {
        return this._element;
    }

    getCurrentModalizerId(): string | undefined {
        return this._curModalizerId;
    }

    setCurrentModalizerId(id: string | undefined, noModalizersUpdate?: boolean): void {
        this._curModalizerId = id;

        if (__DEV__) {
            this._setInformativeStyle();
        }

        if (!noModalizersUpdate) {
            this.updateModalizers();
        }
    }

    getModalizers(): Types.Modalizer[] {
        const modalizers: Types.Modalizer[] = [];

        for (let id of Object.keys(this._knownModalizers)) {
            modalizers.push(this._knownModalizers[id]);
        }

        return modalizers;
    }

    updateModalizers(): void {
        if (this._updateModalizersTimer) {
            return;
        }

        this._updateModalizersTimer = window.setTimeout(() => {
            this._updateModalizersTimer = undefined;
            this._reallyUpdateModalizers();
        }, 0);
    }

    private _add(): void {
        if (__DEV__) {
            this._setInformativeStyle();
        }
    }

    private _remove(): void {
        if (__DEV__) {
            this._element.style.removeProperty('--ah-modalizer-root');
        }
    }

    private _reallyUpdateModalizers(): void {
        if (!this._element.ownerDocument) {
            return;
        }

        const modalizersToUpdate: Types.Modalizer[] = [];

        const walker = createElementTreeWalker(this._element.ownerDocument, this._element, (element: HTMLElement) => {
            const ah = getAbilityHelpersOnElement(element);

            if (ah && ah.modalizer) {
                modalizersToUpdate.push(ah.modalizer);

                return NodeFilter.FILTER_ACCEPT;
            }

            return NodeFilter.FILTER_SKIP;
        });

        if (walker) {
            while (walker.nextNode()) { /* Iterating for the sake of calling acceptNode callback. */ }
        }

        let isOthersAccessible = (this._curModalizerId === undefined);
        let currentIsPresent = false;

        const prevKnownModalizers = this._knownModalizers;
        const newKnownModalizers: { [id: string]: Types.Modalizer } = {};
        const addedModalizers: { [id: string]: Types.Modalizer } = {};
        const removedModalizers: { [id: string]: Types.Modalizer } = {};

        for (let i = 0; i < modalizersToUpdate.length; i++) {
            const modalizer = modalizersToUpdate[i];
            const modalizerId = modalizer.userId;
            const isCurrent = modalizerId === this._curModalizerId;

            if (!isOthersAccessible && isCurrent) {
                isOthersAccessible = !!modalizer.getBasicProps().isOthersAccessible;
            }

            if (isCurrent) {
                currentIsPresent = true;
            }

            newKnownModalizers[modalizerId] = modalizer;

            if (!(modalizerId in prevKnownModalizers)) {
                addedModalizers[modalizerId] = modalizer;
            }
        }

        for (let id of Object.keys(prevKnownModalizers)) {
            if (!(id in newKnownModalizers)) {
                removedModalizers[id] = prevKnownModalizers[id];
            }
        }

        if (!currentIsPresent) {
            this.setCurrentModalizerId(undefined, true);
        }

        this._knownModalizers = newKnownModalizers;

        for (let i = 0; i < modalizersToUpdate.length; i++) {
            const modalizer = modalizersToUpdate[i];
            const modalizerId = modalizer.userId;

            const active = (this._curModalizerId === undefined) || (modalizerId === this._curModalizerId);

            modalizer.setActive(active);
            modalizer.setAccessible(modalizer.getBasicProps().isAlwaysAccessible || isOthersAccessible || active);
        }
    }

    private _setInformativeStyle(): void {
        if (__DEV__) {
            this._element.style.setProperty(
                '--ah-modalizer-root',
                this.id + ',' + (this._curModalizerId || 'undefined')
            );
        }
    }
}

export class ModalizerAPI implements Types.ModalizerAPI {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window | undefined;
    private _initTimer: number | undefined;
    private _curFocusInModalizer: Types.Modalizer | undefined;
    private _focusOutTimer: number | undefined;

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

        this._ah.focusedElement.subscribe(this._onElementFocused);

        this._mainWindow.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent);

        observeMutationEvents(this._mainWindow.document);
    }

    protected dispose(): void {
        if (!this._mainWindow) {
            return;
        }

        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._focusOutTimer) {
            this._mainWindow.clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        this._ah.focusedElement.unsubscribe(this._onElementFocused);

        this._mainWindow.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent);

        // TODO: Stop the observer.
    }

    addRoot(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.root) {
            return;
        }

        const root = new ModalizerRoot(element);

        setAbilityHelpersOnElement(element, { root });

        const n: HTMLElement[] = [];
        for (let i: any = element; i; i = i.parentElement) {
            n.push(i);
        }

        dispatchMutationEvent(element, { root: root });
    }

    removeRoot(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);
        const root = ah && ah.root;

        if (!root) {
            return;
        }

        dispatchMutationEvent(element, { root, removed: true });

        setAbilityHelpersOnElement(element, { root: undefined });

        root.dispose();
    }

    moveRoot(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);
        const root = ahFrom && ahFrom.root;

        if (root) {
            root.move(to);

            setAbilityHelpersOnElement(to, { root: root });
            setAbilityHelpersOnElement(from, { root: undefined });

            dispatchMutationEvent(from, { root, removed: true });
            dispatchMutationEvent(to, { root });
        }
    }

    add(element: HTMLElement, basic: Types.ModalizerBasicProps, extended?: Types.ModalizerExtendedProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.modalizer) {
            if (ah.modalizer.userId !== basic.id) {
                throw new Error('The element already has a modalizer with different id.');
            }

            return;
        }

        const modalizer = new Modalizer(element, this._ah, basic, extended);

        setAbilityHelpersOnElement(element, { modalizer });

        if (extended) {
            this._ah.deloser.add(element, undefined, { onFocusLost: extended.onFocusLost });
        }

        dispatchMutationEvent(element, { modalizer });
    }

    setProps(
        element: HTMLElement,
        basic?: Partial<Types.ModalizerBasicProps> | null,
        extended?: Partial<Types.ModalizerExtendedProps> | null
    ): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.modalizer) {
            ah.modalizer.setProps(basic, extended);
        }
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        const modalizer = ah && ah.modalizer;

        if (!modalizer) {
            return;
        }

        setAbilityHelpersOnElement(element, {
            modalizer: undefined
        });

        this._ah.deloser.remove(element);

        dispatchMutationEvent(element, { modalizer, removed: true });

        modalizer.dispose();
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);

        const modalizer = ahFrom && ahFrom.modalizer;

        if (modalizer) {
            modalizer.move(to);

            setAbilityHelpersOnElement(to, { modalizer: modalizer });
            setAbilityHelpersOnElement(from, { modalizer: undefined });

            this._ah.deloser.move(from, to);

            dispatchMutationEvent(from, { modalizer, removed: true });
            dispatchMutationEvent(to, { modalizer });
        }
    }

    focus(elementFromModalizer: HTMLElement, noFocusFirst?: boolean, noFocusDefault?: boolean): boolean {
        const m = ModalizerAPI.findModalizer(elementFromModalizer);

        if (m) {
            const actions = this._ah.deloser.getActions(m.modalizer.getElement());

            if (actions) {
                const basic = m.modalizer.getBasicProps();

                if (noFocusFirst === undefined) {
                    noFocusFirst = basic.isNoFocusFirst;
                }

                if (!noFocusFirst && this._ah.keyboardNavigation.isNavigatingWithKeyboard() && actions.focusFirst()) {
                    return true;
                }

                if (noFocusDefault === undefined) {
                    noFocusDefault = basic.isNoFocusDefault;
                }

                if (!noFocusDefault && actions.focusDefault()) {
                    return true;
                }

                return actions.resetFocus();
            }
        }

        return false;
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
        if (!e.target || !e.details.modalizer) {
            return;
        }

        const root = ModalizerAPI._getRootOnly(e.target as Node);

        if (root) {
            root.updateModalizers();
        }
    }

    private _onElementFocused = (e: HTMLElement): void => {
        if (!this._mainWindow) {
            return;
        }

        if (this._focusOutTimer) {
            this._mainWindow.clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        let modalizer: Types.Modalizer | undefined;

        if (e) {
            const l = ModalizerAPI.findModalizer(e);

            if (l) {
                modalizer = l.modalizer;
            }
        }

        if (modalizer) {
            if (this._curFocusInModalizer && (modalizer !== this._curFocusInModalizer)) {
                this._curFocusInModalizer.setFocused(false);
            }

            this._curFocusInModalizer = modalizer;

            this._curFocusInModalizer.setFocused(true);
        } else if (this._curFocusInModalizer) {
            this._focusOutTimer = this._mainWindow.setTimeout(() => {
                this._focusOutTimer = undefined;

                if (this._curFocusInModalizer) {
                    this._curFocusInModalizer.setFocused(false);

                    this._curFocusInModalizer = undefined;
                }
            }, 0);
        }
    }

    private static _getRootOnly(element: Node): Types.ModalizerRoot | undefined {
        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.root) {
                return ah.root;
            }
        }

        return undefined;
    }

    static findModalizer(element: Node): ModalizerFor | undefined {
        if (!element.ownerDocument) {
            return undefined;
        }

        let root: Types.ModalizerRoot | undefined;
        let modalizer: Types.Modalizer | undefined;

        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (!ah) {
                continue;
            }

            if (!modalizer && ah.modalizer) {
                modalizer = ah.modalizer;
            }

            if (modalizer && ah.root) {
                root = ah.root;

                break;
            }
        }

        if (!modalizer || !root) {
            return undefined;
        }

        return { modalizer, root };
    }

    static getRootId(element: HTMLElement): string {
        const l = ModalizerAPI.findModalizer(element);
        return (l && l.root.id) || _noRootId;
    }

    static getRootById(id: string): Types.ModalizerRoot | undefined {
        if (id === _noRootId) {
            return undefined;
        }

        return _rootById[id];
    }
}

export function setupModalizerInIFrame(iframeDocument: HTMLDocument, mainWindow?: Window): void {
    if (!mainWindow) {
        return;
    }

    observeMutationEvents(iframeDocument);

    setupIFrameToMainWindowEventsDispatcher(mainWindow, iframeDocument, _customEventName, [
        { type: EventFromIFrameDescriptorType.Document, name: MUTATION_EVENT_NAME, capture: false }
    ]);
}

function observeMutationEvents(doc: HTMLDocument): void {
    doc.addEventListener(MUTATION_EVENT_NAME, (e: MutationEvent) => {
        const root = e.details.root;

        if (root) {
            if (e.details.removed) {
                delete _rootById[root.id];
            } else {
                _rootById[root.id] = root;
            }
        }
    });
}
