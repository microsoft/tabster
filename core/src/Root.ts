/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from 'keyborg';

import { getTabsterOnElement, setTabsterOnElement } from './Instance';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import { dispatchMutationEvent, MutationEvent, MUTATION_EVENT_NAME } from './MutationEvent';
import * as Types from './Types';
import {
    getElementUId,
    makeFocusIgnored,
    WeakHTMLElement
} from './Utils';

interface DummyInput {
    isFirst: boolean;
    active: boolean;
    shouldMoveOut?: boolean;
    input?: HTMLDivElement;
    focusin?: (e: FocusEvent) => void;
    focusout?: (e: FocusEvent) => void;
}

export interface WindowWithTabsterInstance extends Window {
    __tabsterInstance?: Types.TabsterCore;
}

function _setInformativeStyle(weakElement: WeakHTMLElement, remove: boolean, id?: string) {
    if (__DEV__) {
        const element = weakElement.get();

        if (element) {
            if (remove) {
                element.style.removeProperty('--tabster-root');
            } else {
                element.style.setProperty('--tabster-root', id + ',');
            }
        }
    }
}

export class Root implements Types.Root {
    readonly uid: string;

    private _element: WeakHTMLElement;
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _basic: Types.RootBasicProps;
    private _dummyInputFirst: DummyInput | undefined;
    private _dummyInputLast: DummyInput | undefined;
    private _forgetFocusedGrouppers: () => void;

    constructor(
        element: HTMLElement,
        tabster: Types.TabsterCore,
        win: Types.GetWindow,
        forgetFocusedGrouppers: () => void,
        basic?: Types.RootBasicProps
    ) {
        this.uid = getElementUId(win, element);
        this._element = new WeakHTMLElement(win, element);
        this._tabster = tabster;
        this._win = win;
        this._basic = basic || {};
        this._forgetFocusedGrouppers = forgetFocusedGrouppers;

        this._dummyInputFirst = { isFirst: true, active: true };
        this._dummyInputLast = { isFirst: false, active: true };
        this._createDummyInput(this._dummyInputFirst);
        this._createDummyInput(this._dummyInputLast);

        this._add();
        this._addDummyInputs();

        tabster.focusedElement.subscribe(this._onFocus);

        setTabsterOnElement(this._tabster, element, { root: this });
    }

    dispose(): void {
        this._tabster.focusedElement.unsubscribe(this._onFocus);

        this._remove();

        const dif = this._dummyInputFirst;
        if (dif) {
            this._disposeDummyInput(dif);
            delete this._dummyInputFirst;
        }

        const dil = this._dummyInputLast;
        if (dil) {
            this._disposeDummyInput(dil);
            delete this._dummyInputLast;
        }

        const rootElement = this._element.get();
        if (rootElement) {
            setTabsterOnElement(this._tabster, rootElement, { root: undefined });
        }

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

    getElement(): HTMLElement | undefined {
        return this._element.get();
    }

    updateDummyInputs(): void {
        this._addDummyInputs();
    }

    moveOutWithDefaultAction(backwards: boolean): void {
        if (this._dummyInputFirst?.input && this._dummyInputLast?.input) {
            if (backwards) {
                this._dummyInputFirst.shouldMoveOut = true;
                nativeFocus(this._dummyInputFirst.input);
            } else {
                this._dummyInputLast.shouldMoveOut = true;
                nativeFocus(this._dummyInputLast.input);
            }
        }
    }

    private _onFocus = (e: HTMLElement | undefined) => {
        if (e) {
            const ctx = RootAPI.getTabsterContext(this._tabster, e);

            if (!ctx) {
                this._setDummyInputsActive(false);
                return;
            }
        }

        this._setDummyInputsActive(true);
    }

    private _setDummyInputsActive(active: boolean) {
        for (let dummy of [this._dummyInputFirst, this._dummyInputLast]) {
            if (dummy && (dummy.active !== active) && dummy.input) {
                // If the uncontrolled element is first/last in the application, focusing the
                // dummy input will not let the focus to go outside of the application.
                // So, we're making dummy inputs not tabbable if the uncontrolled element has focus.
                dummy.input.tabIndex = active ? 0 : -1;
                dummy.active = active;
            }
        }
    }

    private _add(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, false, this.uid);
        }
    }

    private _remove(): void {
        this._removeDummyInputs();

        if (__DEV__) {
            _setInformativeStyle(this._element, true);
        }
    }

    private _createDummyInput(props: DummyInput): void {
        if (props.input) {
            return;
        }

        const input = this._win().document.createElement('div');

        input.tabIndex = 0;
        input.setAttribute('role', 'none');
        input.setAttribute(Types.TabsterDummyInputAttributeName, '');
        input.setAttribute('aria-hidden', 'true');

        const style = input.style;
        style.position = 'fixed';
        style.width = style.height = '1px';
        style.left = style.top = '-100500px';
        style.opacity = '0';
        style.zIndex = '-1';

        if (__DEV__) {
            style.setProperty('--tabster-dummy-input', props.isFirst ? 'first' : 'last');
        }

        makeFocusIgnored(input);

        props.input = input;
        props.focusin = e => {
            if (props.shouldMoveOut) {
                // When we've reached the last focusable element, we want to let the browser
                // to move the focus outside of the page. In order to do that we're synchronously
                // calling focus() of the dummy input from the Tab key handler and allowing
                // the default action to move the focus out.
            } else {
                // The only way a dummy input gets focused is during the keyboard navigation.
                KeyboardNavigationState.setVal(this._tabster.keyboardNavigation, true);

                this._forgetFocusedGrouppers();

                const element = this._element.get();

                let toFocus: HTMLElement | null;

                if (element) {
                    toFocus = props.isFirst
                        ? this._tabster.focusable.findFirst(element)
                        : this._tabster.focusable.findLast(element);
                } else {
                    toFocus = null;
                }

                if (toFocus) {
                    this._tabster.focusedElement.focus(toFocus);
                } else {
                    props.input?.blur();
                }
            }
        };

        props.focusout = e => {
            props.shouldMoveOut = false;
        };

        input.addEventListener('focusin', props.focusin);
        input.addEventListener('focusout', props.focusout);
    }

    private _disposeDummyInput(props: DummyInput): void {
        const input = props.input;

        if (!input) {
            return;
        }

        delete props.input;

        const fi = props.focusin;
        if (fi) {
            input.removeEventListener('focusin', fi);
            delete props.focusin;
        }

        const fo = props.focusout;
        if (fo) {
            input.removeEventListener('focusout', fo);
            delete props.focusout;
        }
    }

    private _addDummyInputs(): void {
        const element = this._element.get();
        const dif = this._dummyInputFirst?.input;
        const dil = this._dummyInputLast?.input;

        if (!element || !dif || !dil) {
            return;
        }

        if (element.lastElementChild !== dil) {
            element.appendChild(dil);
        }

        const firstElementChild = element.firstElementChild;

        if (firstElementChild && (firstElementChild !== dif)) {
            element.insertBefore(dif, firstElementChild);
        }
    }

    private _removeDummyInputs(): void {
        const dif = this._dummyInputFirst?.input;
        const dil = this._dummyInputLast?.input;

        if (dif?.parentElement) {
            dif.parentElement.removeChild(dif);
        }

        if (dil?.parentElement) {
            dil.parentElement.removeChild(dil);
        }
    }
}

export class RootAPI implements Types.RootAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _forgetFocusedGrouppers: () => void;
    private _unobserve: (() => void) | undefined;
    private _autoRoot: Types.RootBasicProps | undefined;
    private _autoRootInstance: Root | undefined;
    rootById: { [id: string]: Types.Root } = {};

    constructor(tabster: Types.TabsterCore, forgetFocusedGrouppers: () => void, autoRoot?: Types.RootBasicProps) {
        this._tabster = tabster;
        this._win = (tabster as unknown as Types.TabsterInternal).getWindow;
        this._forgetFocusedGrouppers = forgetFocusedGrouppers;
        this._initTimer = this._win().setTimeout(this._init, 0);
        this._autoRoot = autoRoot;
    }

    private _init = (): void => {
        this._initTimer = undefined;

        const win = this._win();

        win.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation);

        this._unobserve = observeMutationEvents(this._win);
    }

    protected dispose(): void {
        const win = this._win();

        if (this._autoRootInstance) {
            this._autoRootInstance.dispose();
            delete this._autoRootInstance;
            delete this._autoRoot;
        }

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation);

        if (this._unobserve) {
            this._unobserve();
            delete this._unobserve;
        }

        this._forgetFocusedGrouppers = () => {/**/};

        this.rootById = {};
    }

    static dispose(instance: Types.RootAPI): void {
        (instance as RootAPI).dispose();
    }

    add(element: HTMLElement, basic?: Types.RootBasicProps): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (tabsterOnElement && tabsterOnElement.root) {
            return;
        }

        const root = new Root(element, this._tabster, this._win, this._forgetFocusedGrouppers, basic);

        const n: HTMLElement[] = [];

        for (let i: HTMLElement | null = element; i; i = i.parentElement) {
            n.push(i);
        }

        dispatchMutationEvent(element, { root: root });
    }

    remove(element: HTMLElement): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        const root = tabsterOnElement && tabsterOnElement.root;

        if (!root) {
            return;
        }

        dispatchMutationEvent(element, { root, removed: true });
        root.dispose();
    }

    setProps(element: HTMLElement, basic?: Partial<Types.RootBasicProps> | null): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (tabsterOnElement && tabsterOnElement.root) {
            tabsterOnElement.root.setProps(basic);
        }
    }

    private _onMutation = (e: MutationEvent): void => {
        const details = e.details;
        const root = details.root;

        if (root) {
            if (details.removed) {
                if (details.isMutation) {
                    root.dispose();
                }
            } else if (root.getElement() === e.target) {
                root.updateDummyInputs();
            }
        }
    }

    static getRootByUId(getWindow: Types.GetWindow, id: string): Types.Root | undefined {
        const tabster = (getWindow() as WindowWithTabsterInstance).__tabsterInstance;
        return tabster && (tabster.root as RootAPI).rootById[id];
    }

    /**
     * Fetches the tabster context for an element walking up its ancestors
     *
     * @param tabster Tabster instance
     * @param element The element the tabster context should represent
     * @param options Additional options
     * @returns undefined if the element is not a child of a tabster root, otherwise all applicable tabster behaviours and configurations
     */
    static getTabsterContext(
        tabster: Types.TabsterCore,
        element: Node, options: Types.GetTabsterContextOptions = {},
    ): Types.TabsterContext | undefined {
        if (!element.ownerDocument) {
            return undefined;
        }

        let root: Types.Root | undefined;
        let modalizer: Types.Modalizer | undefined;
        let groupper: Types.Groupper | undefined;
        let mover: HTMLElement | undefined;
        let moverOptions: Types.MoverOptions | undefined;
        let isGroupperFirst: boolean | undefined;
        let isRtl = false;

        let curElement: (Node | null) = element;
        while (curElement && (!root || options.checkRtl )) {
            const tabsterOnElement = getTabsterOnElement(tabster, curElement);

            if (!tabsterOnElement) {
                curElement = curElement.parentElement;
                continue;
            }

            // Element inside an ignorer subtree - no context
            if (tabsterOnElement.uncontrolled) {
                return undefined;
            }

            if (!groupper && tabsterOnElement.groupper) {
                groupper = tabsterOnElement.groupper;
            }

            const moverOnElement = tabsterOnElement.focusable?.mover;
            if ((moverOnElement !== undefined) && (moverOptions === undefined)) {
                moverOptions = moverOnElement;

                if ((moverOptions.navigationType === Types.MoverKeys.Arrows) || (moverOptions.navigationType === Types.MoverKeys.Both)) {
                    mover = curElement as HTMLElement;
                    isGroupperFirst = !!groupper;
                }
            }

            if (!modalizer && tabsterOnElement.modalizer) {
                modalizer = tabsterOnElement.modalizer;
            }

            if (tabsterOnElement.root) {
                root = tabsterOnElement.root;
            }

            if ((curElement as HTMLElement).getAttribute('dir') === 'rtl') {
                isRtl = true;
            }

            curElement = curElement.parentElement;
        }

        // No root element could be found, try to get an auto root
        if (!root && (tabster.root as RootAPI)._autoRoot) {
            const rootAPI = tabster.root as RootAPI;

            if (!rootAPI._autoRootInstance) {
                const body = element.ownerDocument?.body;

                if (body) {
                    rootAPI._autoRootInstance = new Root(
                        body,
                        rootAPI._tabster,
                        rootAPI._win,
                        rootAPI._forgetFocusedGrouppers,
                        rootAPI._autoRoot
                    );
                }
            }

            root = rootAPI._autoRootInstance;
        }

        return root ? {
            root,
            modalizer,
            groupper,
            mover,
            moverOptions,
            isGroupperFirst,
            isRtl: options.checkRtl ? isRtl : undefined,
        } : undefined;

    }
}

function observeMutationEvents(getWindow: Types.GetWindow): () => void {
    const handler = (e: MutationEvent) => {
        const root = e.details.root;
        const tabster = (getWindow() as WindowWithTabsterInstance).__tabsterInstance;

        if (tabster && root) {
            if (e.details.removed) {
                delete (tabster.root as RootAPI).rootById[root.uid];
            } else {
                (tabster.root as RootAPI).rootById[root.uid] = root;
            }
        }
    };

    getWindow().document.addEventListener(MUTATION_EVENT_NAME, handler);

    return () => {
        getWindow().document.removeEventListener(MUTATION_EVENT_NAME, handler);
    };
}
