/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from './IFrameEvents';
import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { dispatchMutationEvent, MUTATION_EVENT_NAME, MutationEvent } from './MutationEvent';
import * as Types from './Types';
import { callOriginalFocusOnly, createElementTreeWalker, makeFocusIgnored } from './Utils';

interface DummyInput {
    isFirst: boolean;
    shouldMoveOut?: boolean;
}

const _customEventName = 'ability-helpers:root-related';
const _noRootId = 'no-root';

let _lastInternalId = 0;
let _rootById: { [id: string]: Types.Root } = {};

function _setInformativeStyle(element: HTMLElement, remove: boolean, id?: string, currentModalizerId?: string) {
    if (__DEV__) {
        if (remove) {
            element.style.removeProperty('--ah-root');
        } else {
            element.style.setProperty('--ah-root', id + ',' + currentModalizerId);
        }
    }
}

export class Root implements Types.Root {
    readonly id: string;

    private _element: HTMLElement;
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _curModalizerId: string | undefined;
    private _knownModalizers: { [id: string]: Types.Modalizer } = {};
    private _updateModalizersTimer: number | undefined;
    private _dummyInputFirstProps: DummyInput;
    private _dummyInputLastProps: DummyInput;
    private _dummyInputFirst: HTMLInputElement;
    private _dummyInputLast: HTMLInputElement;
    private _forgetFocusedGrouppers: () => void;

    constructor(element: HTMLElement, ah: Types.AbilityHelpers, mainWindow: Window, forgetFocusedGrouppers: () => void) {
        this.id = 'root' + ++_lastInternalId;
        this._element = element;
        this._ah = ah;
        this._mainWindow = mainWindow;
        this._forgetFocusedGrouppers = forgetFocusedGrouppers;

        this._dummyInputFirstProps = { isFirst: true };
        this._dummyInputLastProps = { isFirst: false };
        this._dummyInputFirst = this._createDummyInput(this._dummyInputFirstProps);
        this._dummyInputLast = this._createDummyInput(this._dummyInputLastProps);

        this._add();
        this._addDummyInputs();
    }

    dispose(): void {
        if (this._updateModalizersTimer) {
            this._mainWindow.clearTimeout(this._updateModalizersTimer);
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
            _setInformativeStyle(this._element, false, this.id, this._curModalizerId);
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

        this.updateDummyInputs();

        this._updateModalizersTimer = this._mainWindow.setTimeout(() => {
            this._updateModalizersTimer = undefined;
            this._reallyUpdateModalizers();
        }, 0);
    }

    updateDummyInputs(): void {
        this._addDummyInputs();
    }

    moveOutWithDefaultAction(backwards: boolean): void {
        if (backwards) {
            this._dummyInputFirstProps.shouldMoveOut = true;
            callOriginalFocusOnly(this._dummyInputFirst);
        } else {
            this._dummyInputLastProps.shouldMoveOut = true;
            callOriginalFocusOnly(this._dummyInputLast);
        }
    }

    private _add(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, false, this.id, this._curModalizerId);
        }
    }

    private _remove(): void {
        this._removeDummyInputs();

        if (__DEV__) {
            _setInformativeStyle(this._element, true);
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

    private _createDummyInput(props: DummyInput): HTMLInputElement {
        const input = this._mainWindow.document.createElement('input');

        input.type = 'button';
        input.setAttribute('aria-hidden', 'true');

        const style = input.style;
        style.position = 'absolute';
        style.width = style.height = '1px';
        style.left = style.top = '-100500px';
        style.opacity = '0';
        style.zIndex = '-1';

        if (__DEV__) {
            style.setProperty('--ah-dummy-input', props.isFirst ? 'first' : 'last');
        }

        makeFocusIgnored(input);

        input.addEventListener('focusin', e => {
            if (props.shouldMoveOut) {
                // When we've reached the last focusable element, we want to let the browser
                // to move the focus outside of the page. In order to do that we're synchronously
                // calling focus() of the dummy input from the Tab key handler and allowing
                // the default action to move the focus out.
            } else {
                this._forgetFocusedGrouppers();

                let toFocus = props.isFirst
                    ? this._ah.focusable.findFirst(this._element)
                    : this._ah.focusable.findLast(this._element);

                if (toFocus) {
                    this._ah.focusedElement.focus(toFocus);
                } else {
                    input.blur();
                }
            }
        });

        input.addEventListener('focusout', e => {
            props.shouldMoveOut = false;
        });

        return input;
    }

    private _addDummyInputs(): void {
        const element = this._element;

        if (element.lastElementChild !== this._dummyInputLast) {
            element.appendChild(this._dummyInputLast);
        }

        const firstElementChild = element.firstElementChild;

        if (firstElementChild && (firstElementChild !== this._dummyInputFirst)) {
            element.insertBefore(this._dummyInputFirst, firstElementChild);
        }
    }

    private _removeDummyInputs(): void {
        const dif = this._dummyInputFirst;
        const dil = this._dummyInputLast;

        if (dif.parentElement) {
            dif.parentElement.removeChild(dif);
        }

        if (dil.parentElement) {
            dil.parentElement.removeChild(dil);
        }
    }
}

export class RootAPI implements Types.RootAPI {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _initTimer: number | undefined;
    private _forgetFocusedGrouppers: () => void;

    constructor(ah: Types.AbilityHelpers, mainWindow: Window, forgetFocusedGrouppers: () => void) {
        this._ah = ah;
        this._mainWindow = mainWindow;
        this._forgetFocusedGrouppers = forgetFocusedGrouppers;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._mainWindow.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent);

        observeMutationEvents(this._mainWindow.document);
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._mainWindow.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent);

        // TODO: Stop the observer.
    }

    add(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.root) {
            return;
        }

        const root = new Root(element, this._ah, this._mainWindow, this._forgetFocusedGrouppers);

        setAbilityHelpersOnElement(element, { root });

        const n: HTMLElement[] = [];

        for (let i: HTMLElement | null = element; i; i = i.parentElement) {
            n.push(i);
        }

        dispatchMutationEvent(element, { root: root });
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);
        const root = ah && ah.root;

        if (!root) {
            return;
        }

        dispatchMutationEvent(element, { root, removed: true });

        setAbilityHelpersOnElement(element, { root: undefined });

        root.dispose();
    }

    move(from: HTMLElement, to: HTMLElement): void {
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
        const details = e.details;

        if (details.root && !details.removed && (details.root.getElement() === e.target)) {
            details.root.updateDummyInputs();
        }

        if (!e.target || !details.modalizer) {
            return;
        }

        const root = RootAPI._getRootOnly(e.target as Node);

        if (root) {
            root.updateModalizers();
        }
    }

    private static _getRootOnly(element: Node): Types.Root | undefined {
        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.root) {
                return ah.root;
            }
        }

        return undefined;
    }

    static getRootId(element: HTMLElement): string {
        const l = RootAPI.findRootAndModalizer(element);
        return (l && l.root.id) || _noRootId;
    }

    static getRootById(id: string): Types.Root | undefined {
        if (id === _noRootId) {
            return undefined;
        }

        return _rootById[id];
    }

    static findRootAndModalizer(element: Node): Types.RootAndModalizer | undefined {
        if (!element.ownerDocument) {
            return undefined;
        }

        let root: Types.Root | undefined;
        let modalizer: Types.Modalizer | undefined;

        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (!ah) {
                continue;
            }

            if (!modalizer && ah.modalizer) {
                modalizer = ah.modalizer;
            }

            if (ah.root) {
                root = ah.root;
                break;
            }
        }

        return root ? { root, modalizer } : undefined;
    }
}

export function setupRootInIFrame(iframeDocument: HTMLDocument, mainWindow?: Window): void {
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
