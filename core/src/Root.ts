/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from './Instance';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import * as Types from './Types';
import { DummyInput, DummyInputManager, getElementUId, TabsterPart, WeakHTMLElement } from './Utils';

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

class RootDummyManager extends DummyInputManager {
    private _tabster: Types.TabsterCore;

    constructor(tabster: Types.TabsterCore, element: WeakHTMLElement) {
        super(tabster, element);
        this._tabster = tabster;
        this.firstDummy.onFocusIn = this._onDummyInputFocus;
        this.lastDummy.onFocusIn = this._onDummyInputFocus;
    }

    setTabbable = (tabbable: boolean) => {
        const tabIndex = tabbable ? 0 : -1;

        if (this.firstDummy.input) {
            this.firstDummy.input.tabIndex = tabIndex;
        } 

        if (this.lastDummy.input) {
            this.lastDummy.input.tabIndex = tabIndex;
        } 
    }

    private _onDummyInputFocus = (dummyInput: DummyInput): void => {
        if (dummyInput.shouldMoveOut) {
            // When we've reached the last focusable element, we want to let the browser
            // to move the focus outside of the page. In order to do that we're synchronously
            // calling focus() of the dummy input from the Tab key handler and allowing
            // the default action to move the focus out.
        } else {
            // The only way a dummy input gets focused is during the keyboard navigation.
            KeyboardNavigationState.setVal(this._tabster.keyboardNavigation, true);

            const element = this._element.get();

            if (element) {
                let hasFocused = dummyInput.isFirst
                    ? this._tabster.focusedElement.focusFirst({ container: element })
                    : this._tabster.focusedElement.focusLast({ container: element });

                if (hasFocused) {
                    return;
                }
            }

            dummyInput.input?.blur();
        }
    }
}

export class Root extends TabsterPart<Types.RootProps, undefined> implements Types.Root {
    readonly uid: string;

    private _dummyManager?: RootDummyManager;

    constructor(
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        props: Types.RootProps
    ) {
        super(tabster, element, props);

        const win = tabster.getWindow;
        this.uid = getElementUId(win, element);
        if (tabster.controlTab) {
            this._dummyManager = new RootDummyManager(tabster, this._element);
        }
        tabster.focusedElement.subscribe(this._onFocus);

        this._add();

    }

    dispose(): void {
        this._dummyManager?.dispose();
        this._remove();
    }

    moveOutWithDefaultAction(backwards: boolean) {
        this._dummyManager?.moveOutWithDefaultAction(backwards);
    }

    private _onFocus = (e: HTMLElement | undefined) => {
        if (e) {
            const ctx = RootAPI.getTabsterContext(this._tabster, e);

            if (!ctx || ctx.uncontrolled) {
                this._dummyManager?.setTabbable(false);
                return;
            }
        }

        this._dummyManager?.setTabbable(true);
    }

    private _add(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, false, this.uid);
        }
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, true);
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
    private _autoRoot: Types.RootProps | undefined;
    private _autoRootInstance: Root | undefined;
    rootById: { [id: string]: Types.Root } = {};

    constructor(tabster: Types.TabsterCore, autoRoot?: Types.RootProps) {
        this._tabster = tabster;
        this._win = (tabster as Types.TabsterInternal).getWindow;
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
        if (__DEV__) {
            validateRootProps(props);
        }

        return new Root(tabster, element, props) as Types.Root;
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

        const checkRtl = options.checkRtl;
        let root: Types.Root | undefined;
        let modalizer: Types.Modalizer | undefined;
        let groupper: Types.Groupper | undefined;
        let mover: Types.Mover | undefined;
        let isGroupperFirst: boolean | undefined;
        let isRtl: boolean | undefined;
        let uncontrolled: HTMLElement | undefined;
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
