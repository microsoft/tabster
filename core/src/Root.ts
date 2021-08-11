/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from 'keyborg';

import { getTabsterOnElement } from './Instance';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import * as Types from './Types';
import { DummyInput, getElementUId, TabsterPart, WeakHTMLElement } from './Utils';

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

interface DummyInputProps {
    isFirst: boolean;
    shouldMoveOut?: boolean;
    isActive: boolean;
}

export class Root extends TabsterPart<Types.RootProps, undefined> implements Types.Root {
    readonly uid: string;

    private _dummyInputFirst: DummyInput<DummyInputProps> | undefined;
    private _dummyInputLast: DummyInput<DummyInputProps> | undefined;
    private _forgetFocusedGrouppers: () => void;
    private _unobserve: (() => void) | undefined;

    constructor(
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        forgetFocusedGrouppers: () => void,
        props: Types.RootProps
    ) {
        super(tabster, element, props);

        const win = tabster.getWindow;
        this.uid = getElementUId(win, element);
        this._forgetFocusedGrouppers = forgetFocusedGrouppers;

        this._dummyInputFirst = new DummyInput(
            win,
            false,
            this._onDummyInputFocus,
            this._onDummyInputBlur,
            { isFirst: true, isActive: true }
        );

        this._dummyInputLast = new DummyInput(
            win,
            false,
            this._onDummyInputFocus,
            this._onDummyInputBlur,
            { isFirst: false, isActive: true }
        );

        this._add();
        this._addDummyInputs();

        tabster.focusedElement.subscribe(this._onFocus);
        this._observeMutations(element);
    }

    dispose(): void {
        this._tabster.focusedElement.unsubscribe(this._onFocus);

        if (this._unobserve) {
            this._unobserve();
            this._unobserve = undefined;
        }

        this._remove();

        const dif = this._dummyInputFirst;
        if (dif) {
            dif.dispose();
            delete this._dummyInputFirst;
        }

        const dil = this._dummyInputLast;
        if (dil) {
            dil.dispose();
            delete this._dummyInputLast;
        }

        this._forgetFocusedGrouppers = () => {/**/};
    }

    moveOutWithDefaultAction(backwards: boolean): void {
        const first = this._dummyInputFirst;
        const last = this._dummyInputLast;

        if (first?.input && last?.input) {
            if (backwards) {
                first.props.shouldMoveOut = true;
                nativeFocus(first.input);
            } else {
                last.props.shouldMoveOut = true;
                nativeFocus(last.input);
            }
        }
    }

    private _observeMutations(element: HTMLElement): void {
        if (this._unobserve || (typeof MutationObserver === 'undefined')) {
            return;
        }

        let observer = new MutationObserver(mutations => {
            this._addDummyInputs();
        });

        observer.observe(element, { childList: true });

        this._unobserve = () => {
            observer.disconnect();
        };
    }

    private _onFocus = (e: HTMLElement | undefined) => {
        if (e) {
            const ctx = RootAPI.getTabsterContext(this._tabster, e);

            if (!ctx || ctx.uncontrolled) {
                this._setDummyInputsActive(false);
                return;
            }
        }

        this._setDummyInputsActive(true);
    }

    private _setDummyInputsActive(isActive: boolean) {
        for (let dummy of [this._dummyInputFirst, this._dummyInputLast]) {
            if (dummy && (dummy.props.isActive !== isActive) && dummy.input) {
                // If the uncontrolled element is first/last in the application, focusing the
                // dummy input will not let the focus to go outside of the application.
                // So, we're making dummy inputs not tabbable if the uncontrolled element has focus.
                dummy.input.tabIndex = isActive ? 0 : -1;
                dummy.props.isActive = isActive;
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

    private _onDummyInputFocus = (input: HTMLDivElement, props: DummyInputProps): void => {
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

            if (element) {
                let hasFocused = props.isFirst
                    ? this._tabster.focusedElement.focusFirst({ container: element })
                    : this._tabster.focusedElement.focusLast({ container: element });

                if (hasFocused) {
                    return;
                }
            }

            input.blur();
        }
    }

    private _onDummyInputBlur = (input: HTMLDivElement, props: DummyInputProps): void => {
        props.shouldMoveOut = false;
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

function validateRootProps(props: Types.RootProps): void {
    // TODO: Implement validation.
}

export class RootAPI implements Types.RootAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _forgetFocusedGrouppers: () => void;
    private _autoRoot: Types.RootProps | undefined;
    private _autoRootInstance: Root | undefined;
    rootById: { [id: string]: Types.Root } = {};

    constructor(tabster: Types.TabsterCore, forgetFocusedGrouppers: () => void, autoRoot?: Types.RootProps) {
        this._tabster = tabster;
        this._win = (tabster as Types.TabsterInternal).getWindow;
        this._forgetFocusedGrouppers = forgetFocusedGrouppers;
        this._initTimer = this._win().setTimeout(this._init, 0);
        this._autoRoot = autoRoot;
    }

    private _init = (): void => {
        this._initTimer = undefined;
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

        this._forgetFocusedGrouppers = () => {/**/};

        this.rootById = {};
    }

    static dispose(instance: Types.RootAPI): void {
        (instance as RootAPI).dispose();
    }

    static createRoot: Types.RootConstructor = (
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        props: Types.RootProps
    ): Types.Root => {
        validateRootProps(props);

        return new Root(tabster, element, (tabster.root as RootAPI)._forgetFocusedGrouppers, props) as Types.Root;
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
        element: Node,
        options: Types.GetTabsterContextOptions = {}
    ): Types.TabsterContext | undefined {
        if (!element.ownerDocument) {
            return undefined;
        }

        const getAllGrouppersAndMovers = options.getAllGrouppersAndMovers;
        const checkRtl = options.checkRtl;
        let root: Types.Root | undefined;
        let modalizer: Types.Modalizer | undefined;
        let groupper: Types.Groupper | undefined;
        let mover: Types.Mover | undefined;
        let isGroupperFirst: boolean | undefined;
        let isRtl: boolean | undefined;
        let uncontrolled: HTMLElement | undefined;
        let allGrouppersAndMovers: Types.TabsterContext['allGrouppersAndMovers'] = getAllGrouppersAndMovers ? [] : undefined;
        let curElement: (Node | null) = element;

        while (curElement && (!root || checkRtl)) {
            const tabsterOnElement = getTabsterOnElement(tabster, curElement as HTMLElement);

            if (checkRtl && (isRtl === undefined)) {
                const dir = (curElement as HTMLElement).dir;

                if (dir) {
                    isRtl = dir.toLowerCase() === 'rtl';
                }
            }

            if (!tabsterOnElement) {
                curElement = curElement.parentElement;
                continue;
            }

            if (tabsterOnElement.uncontrolled) {
                uncontrolled = curElement as HTMLElement;
            }

            const curGroupper = tabsterOnElement.groupper;
            const curMover = tabsterOnElement.mover;

            if (getAllGrouppersAndMovers && allGrouppersAndMovers) {
                if (curGroupper) {
                    allGrouppersAndMovers.push({
                        isGroupper: true,
                        groupper: curGroupper
                    });
                }

                if (curMover) {
                    allGrouppersAndMovers.push({
                        isGroupper: false,
                        mover: curMover
                    });
                }
            }

            if (!groupper && curGroupper) {
                groupper = curGroupper;
            }

            if (!mover && curMover) {
                mover = curMover;
                isGroupperFirst = !!groupper;
            }

            if (!modalizer && tabsterOnElement.modalizer) {
                modalizer = tabsterOnElement.modalizer;
            }

            if (tabsterOnElement.root) {
                root = tabsterOnElement.root;
            }

            curElement = curElement.parentElement;
        }

        // No root element could be found, try to get an auto root
        if (!root) {
            const rootAPI = tabster.root as RootAPI;
            const autoRoot = rootAPI._autoRoot;

            if (autoRoot && !rootAPI._autoRootInstance) {
                const body = element.ownerDocument?.body;

                if (body) {
                    rootAPI._autoRootInstance = new Root(
                        rootAPI._tabster as Types.TabsterInternal,
                        body,
                        rootAPI._forgetFocusedGrouppers,
                        autoRoot
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
            isGroupperFirst,
            allGrouppersAndMovers,
            isRtl: checkRtl ? !!isRtl : undefined,
            uncontrolled
        } : undefined;
    }

    static onRoot(instance: Types.RootAPI, root: Types.Root, removed?: boolean): void {
        if (removed) {
            delete (instance as RootAPI).rootById[root.uid];
        } else {
            (instance as RootAPI).rootById[root.uid] = root;
        }
    }
}
