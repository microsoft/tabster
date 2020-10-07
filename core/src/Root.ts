/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import { dispatchMutationEvent, MutationEvent, MUTATION_EVENT_NAME } from './MutationEvent';
import * as Types from './Types';
import { callOriginalFocusOnly, createElementTreeWalker, getElementUId, makeFocusIgnored } from './Utils';

interface DummyInput {
    isFirst: boolean;
    shouldMoveOut?: boolean;
}

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
    readonly uid: string;

    private _element: HTMLElement;
    private _ah: Types.AbilityHelpers;
    private _win: Window;
    private _basic: Types.RootBasicProps;
    private _curModalizerId: string | undefined;
    private _knownModalizers: { [id: string]: Types.Modalizer } = {};
    private _updateModalizersTimer: number | undefined;
    private _dummyInputFirstProps: DummyInput;
    private _dummyInputLastProps: DummyInput;
    private _dummyInputFirst: HTMLDivElement;
    private _dummyInputLast: HTMLDivElement;
    private _forgetFocusedGrouppers: () => void;

    constructor(
        element: HTMLElement,
        ah: Types.AbilityHelpers,
        win: Window,
        forgetFocusedGrouppers: () => void,
        basic?: Types.RootBasicProps
    ) {
        this.uid = getElementUId(element, win);
        this._element = element;
        this._ah = ah;
        this._win = win;
        this._basic = basic || {};
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
            this._win.clearTimeout(this._updateModalizersTimer);
            this._updateModalizersTimer = undefined;
        }

        this._remove();

        this._knownModalizers = {};
        this._forgetFocusedGrouppers = () => {/**/};
    }

    setProps(basic?: Partial<Types.RootBasicProps> | null): void {
        if (basic) {
            this._basic = { ...this._basic, ...basic };
        } else if (basic === null) {
            this._basic = {};
        }
    }

    getBasicProps(): Types.RootBasicProps {
        return this._basic;
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
            _setInformativeStyle(this._element, false, this.uid, this._curModalizerId);
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

    getModalizerById(id: string): Types.Modalizer | undefined {
        return this._knownModalizers[id];
    }

    updateModalizers(): void {
        if (this._updateModalizersTimer) {
            return;
        }

        this.updateDummyInputs();

        this._updateModalizersTimer = this._win.setTimeout(() => {
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
            _setInformativeStyle(this._element, false, this.uid, this._curModalizerId);
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
            const ah = getAbilityHelpersOnElement(this._ah, element);

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

    private _createDummyInput(props: DummyInput): HTMLDivElement {
        const input = this._win.document.createElement('div');

        input.tabIndex = 0;
        input.setAttribute('role', 'none');
        input.setAttribute('aria-hidden', 'true');

        const style = input.style;
        style.position = 'fixed';
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
                // The only way a dummy input gets focused is during the keyboard navigation.
                KeyboardNavigationState.setVal(this._ah.keyboardNavigation, true);

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
    private _win: Window;
    private _initTimer: number | undefined;
    private _forgetFocusedGrouppers: () => void;
    private _unobserve: (() => void) | undefined;

    constructor(ah: Types.AbilityHelpers, mainWindow: Window, forgetFocusedGrouppers: () => void) {
        this._ah = ah;
        this._win = mainWindow;
        this._forgetFocusedGrouppers = forgetFocusedGrouppers;
        this._initTimer = this._win.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._win.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation);

        this._unobserve = observeMutationEvents(this._win.document);
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._win.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation);

        if (this._unobserve) {
            this._unobserve();
        }

        this._forgetFocusedGrouppers = () => {/**/};
        delete this._unobserve;
    }

    static dispose(instance: Types.RootAPI): void {
        (instance as RootAPI).dispose();
    }

    add(element: HTMLElement, basic?: Types.RootBasicProps): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);

        if (ah && ah.root) {
            return;
        }

        const root = new Root(element, this._ah, this._win, this._forgetFocusedGrouppers, basic);

        setAbilityHelpersOnElement(this._ah, element, { root });

        const n: HTMLElement[] = [];

        for (let i: HTMLElement | null = element; i; i = i.parentElement) {
            n.push(i);
        }

        dispatchMutationEvent(element, { root: root });
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);
        const root = ah && ah.root;

        if (!root) {
            return;
        }

        dispatchMutationEvent(element, { root, removed: true });

        setAbilityHelpersOnElement(this._ah, element, { root: undefined });

        root.dispose();
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(this._ah, from);
        const root = ahFrom && ahFrom.root;

        if (root) {
            root.move(to);

            setAbilityHelpersOnElement(this._ah, to, { root: root });
            setAbilityHelpersOnElement(this._ah, from, { root: undefined });

            dispatchMutationEvent(from, { root, removed: true });
            dispatchMutationEvent(to, { root });
        }
    }

    setProps(element: HTMLElement, basic?: Partial<Types.RootBasicProps> | null): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);

        if (ah && ah.root) {
            ah.root.setProps(basic);
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

        const root = RootAPI._getRootOnly(this._ah, e.target as Node);

        if (root) {
            root.updateModalizers();
        }
    }

    private static _getRootOnly(abilityHelpers: Types.AbilityHelpers, element: Node): Types.Root | undefined {
        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(abilityHelpers, e);

            if (ah && ah.root) {
                return ah.root;
            }
        }

        return undefined;
    }

    static getRootByUId(id: string): Types.Root | undefined {
        return _rootById[id];
    }

    static findRootAndModalizer(abilityHelpers: Types.AbilityHelpers, element: Node): Types.RootAndModalizer | undefined {
        if (!element.ownerDocument) {
            return undefined;
        }

        let root: Types.Root | undefined;
        let modalizer: Types.Modalizer | undefined;

        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(abilityHelpers, e);

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

function observeMutationEvents(doc: HTMLDocument): () => void {
    const handler = (e: MutationEvent) => {
        const root = e.details.root;

        if (root) {
            if (e.details.removed) {
                delete _rootById[root.uid];
            } else {
                _rootById[root.uid] = root;
            }
        }
    };

    doc.addEventListener(MUTATION_EVENT_NAME, handler);

    return () => {
        doc.removeEventListener(MUTATION_EVENT_NAME, handler);
    };
}
