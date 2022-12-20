/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";
import { createEventTarget } from "./EventTarget";
import { getTabsterOnElement } from "./Instance";
import { KeyboardNavigationState } from "./State/KeyboardNavigation";
import * as Types from "./Types";
import {
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    getElementUId,
    TabsterPart,
    triggerEvent,
    WeakHTMLElement,
} from "./Utils";
import { setTabsterAttribute } from "./AttributeHelpers";

export interface WindowWithTabsterInstance extends Window {
    __tabsterInstance?: Types.TabsterCore;
}

function _setInformativeStyle(
    weakElement: WeakHTMLElement,
    remove: boolean,
    id?: string
) {
    if (__DEV__) {
        const element = weakElement.get();

        if (element) {
            if (remove) {
                element.style.removeProperty("--tabster-root");
            } else {
                element.style.setProperty("--tabster-root", id + ",");
            }
        }
    }
}

class RootDummyManager extends DummyInputManager {
    private _tabster: Types.TabsterCore;
    private _setFocused: (focused: boolean, fromAdjacent?: boolean) => void;

    constructor(
        tabster: Types.TabsterCore,
        element: WeakHTMLElement,
        setFocused: (focused: boolean, fromAdjacent?: boolean) => void
    ) {
        super(
            tabster,
            element,
            DummyInputManagerPriorities.Root,
            undefined,
            true
        );

        this._setHandlers(this._onDummyInputFocus);

        this._tabster = tabster;
        this._setFocused = setFocused;
    }

    private _onDummyInputFocus = (dummyInput: DummyInput): void => {
        if (dummyInput.useDefaultAction) {
            // When we've reached the last focusable element, we want to let the browser
            // to move the focus outside of the page. In order to do that we're synchronously
            // calling focus() of the dummy input from the Tab key handler and allowing
            // the default action to move the focus out.
            this._setFocused(false, true);
        } else {
            // The only way a dummy input gets focused is during the keyboard navigation.
            KeyboardNavigationState.setVal(
                this._tabster.keyboardNavigation,
                true
            );

            const element = this._element.get();

            if (element) {
                this._setFocused(true, true);

                const toFocus =
                    this._tabster.focusedElement.getFirstOrLastTabbable(
                        dummyInput.isFirst,
                        { container: element }
                    );

                if (toFocus) {
                    nativeFocus(toFocus);
                    return;
                }
            }

            dummyInput.input?.blur();
        }
    };
}

export class Root
    extends TabsterPart<Types.RootProps, undefined>
    implements Types.Root
{
    readonly uid: string;

    private _dummyManager?: RootDummyManager;
    private _isFocused = false;
    private _setFocusedTimer: number | undefined;
    private _setTabbableTimer: number | undefined;
    private _onDispose: (root: Root) => void;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (root: Root) => void,
        props: Types.RootProps
    ) {
        super(tabster, element, props);

        this._onDispose = onDispose;

        const win = tabster.getWindow;
        this.uid = getElementUId(win, element);

        if (tabster.controlTab || tabster.rootDummyInputs) {
            this.addDummyInputs();
        }

        tabster.focusedElement.subscribe(this._onFocus);

        this._add();
    }

    addDummyInputs(): void {
        if (!this._dummyManager) {
            this._dummyManager = new RootDummyManager(
                this._tabster,
                this._element,
                this._setFocused
            );
        }
    }

    dispose(): void {
        this._onDispose(this);

        const win = this._tabster.getWindow();

        if (this._setFocusedTimer) {
            win.clearTimeout(this._setFocusedTimer);
            delete this._setFocusedTimer;
        }

        if (this._setTabbableTimer) {
            win.clearTimeout(this._setTabbableTimer);
            delete this._setTabbableTimer;
        }

        this._dummyManager?.dispose();
        this._remove();
    }

    moveOutWithDefaultAction(isBackward: boolean) {
        const dummyManager = this._dummyManager;

        if (dummyManager) {
            dummyManager.moveOutWithDefaultAction(isBackward);
        } else {
            const el = this.getElement();

            if (el) {
                RootDummyManager.moveWithPhantomDummy(
                    this._tabster,
                    el,
                    true,
                    isBackward
                );
            }
        }
    }

    private _setFocused = (
        hasFocused: boolean,
        fromAdjacent?: boolean
    ): void => {
        if (this._setFocusedTimer) {
            this._tabster.getWindow().clearTimeout(this._setFocusedTimer);
            delete this._setFocusedTimer;
        }

        if (this._isFocused === hasFocused) {
            return;
        }

        const element = this._element.get();

        if (element) {
            if (hasFocused) {
                this._isFocused = true;
                triggerEvent<Types.RootFocusEventDetails>(
                    this._tabster.root.eventTarget,
                    "focus",
                    { element, fromAdjacent }
                );
            } else {
                this._setFocusedTimer = this._tabster
                    .getWindow()
                    .setTimeout(() => {
                        delete this._setFocusedTimer;
                        this._isFocused = false;
                        triggerEvent<Types.RootFocusEventDetails>(
                            this._tabster.root.eventTarget,
                            "blur",
                            { element, fromAdjacent }
                        );
                    }, 0);
            }
        }
    };

    private _onFocus = (e: HTMLElement | undefined) => {
        const win = this._tabster.getWindow();

        if (this._setTabbableTimer) {
            win.clearTimeout(this._setTabbableTimer);
            delete this._setTabbableTimer;
        }

        if (e) {
            const ctx = RootAPI.getTabsterContext(this._tabster, e);

            if (ctx) {
                this._setFocused(ctx.root.getElement() === this._element.get());
            }

            if (!ctx || ctx.uncontrolled || this._tabster.rootDummyInputs) {
                this._dummyManager?.setTabbable(false);
                return;
            }
        } else {
            this._setFocused(false);
        }

        this._setTabbableTimer = win.setTimeout(() => {
            delete this._setTabbableTimer;
            this._dummyManager?.setTabbable(true);
        }, 0);
    };

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateRootProps(props: Types.RootProps): void {
    // TODO: Implement validation.
}

export class RootAPI implements Types.RootAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _autoRoot: Types.RootProps | undefined;
    private _autoRootWaiting = false;
    private _roots: Record<string, Types.Root> = {};
    private _forceDummy = false;
    rootById: { [id: string]: Types.Root } = {};
    eventTarget: EventTarget;

    constructor(tabster: Types.TabsterCore, autoRoot?: Types.RootProps) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
        if (autoRoot) {
            this._autoRoot = autoRoot;
            this._autoRootCreate();
        }
        this.eventTarget = createEventTarget(this._win);
    }

    private _init = (): void => {
        this._initTimer = undefined;
    };

    private _autoRootCreate = (): Types.Root | undefined => {
        const doc = this._win().document;
        const body = doc.body;

        if (body) {
            this._autoRootUnwait(doc);

            const props = this._autoRoot;

            if (props) {
                setTabsterAttribute(body, { root: props }, true);
                return getTabsterOnElement(this._tabster, body)?.root;
            }
        } else if (!this._autoRootWaiting) {
            this._autoRootWaiting = true;
            doc.addEventListener("readystatechange", this._autoRootCreate);
        }

        return undefined;
    };

    private _autoRootUnwait(doc: Document): void {
        if (this._autoRootWaiting) {
            doc.removeEventListener("readystatechange", this._autoRootCreate);
            this._autoRootWaiting = false;
        }
    }

    dispose(): void {
        const win = this._win();

        this._autoRootUnwait(win.document);
        delete this._autoRoot;

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        Object.keys(this._roots).forEach((rootId) => {
            if (this._roots[rootId]) {
                this._roots[rootId].dispose();
                delete this._roots[rootId];
            }
        });

        this.rootById = {};
    }

    createRoot(element: HTMLElement, props: Types.RootProps): Types.Root {
        if (__DEV__) {
            validateRootProps(props);
        }

        const newRoot = new Root(
            this._tabster,
            element,
            this._onRootDispose,
            props
        ) as Types.Root;

        this._roots[newRoot.id] = newRoot;

        if (this._forceDummy) {
            newRoot.addDummyInputs();
        }

        return newRoot;
    }

    addDummyInputs(): void {
        this._forceDummy = true;

        const roots = this._roots;

        for (const id of Object.keys(roots)) {
            roots[id].addDummyInputs();
        }
    }

    static getRootByUId(
        getWindow: Types.GetWindow,
        id: string
    ): Types.Root | undefined {
        const tabster = (getWindow() as WindowWithTabsterInstance)
            .__tabsterInstance;
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
        let isExcludedFromMover = false;
        let isGroupperFirst: boolean | undefined;
        let modalizerInGroupper: Types.Groupper | undefined;
        let isRtl: boolean | undefined;
        let uncontrolled: HTMLElement | undefined;
        let curElement: Node | null = element;
        const ignoreKeydown: Types.FocusableProps["ignoreKeydown"] = {};

        while (curElement && (!root || checkRtl)) {
            const tabsterOnElement = getTabsterOnElement(
                tabster,
                curElement as HTMLElement
            );

            if (checkRtl && isRtl === undefined) {
                const dir = (curElement as HTMLElement).dir;

                if (dir) {
                    isRtl = dir.toLowerCase() === "rtl";
                }
            }

            if (!tabsterOnElement) {
                curElement = curElement.parentElement;
                continue;
            }

            if (tabsterOnElement.uncontrolled) {
                uncontrolled = curElement as HTMLElement;
            }

            if (
                !mover &&
                tabsterOnElement.focusable?.excludeFromMover &&
                !groupper
            ) {
                isExcludedFromMover = true;
            }

            const curModalizer = tabsterOnElement.modalizer;
            const curGroupper = tabsterOnElement.groupper;
            const curMover = tabsterOnElement.mover;

            if (!modalizer && curModalizer) {
                modalizer = curModalizer;
            }

            if (!groupper && curGroupper && (!modalizer || curModalizer)) {
                if (modalizer) {
                    // Modalizer dominates the groupper when they are on the same node and the groupper is active.
                    if (
                        !curGroupper.isActive() &&
                        curGroupper.getProps().tabbability &&
                        modalizer.userId !== tabster.modalizer?.activeId
                    ) {
                        modalizer = undefined;
                        groupper = curGroupper;
                    }

                    modalizerInGroupper = curGroupper;
                } else {
                    groupper = curGroupper;
                }
            }

            if (!mover && curMover && (!modalizer || curModalizer)) {
                mover = curMover;
                isGroupperFirst = !!groupper;
            }

            if (tabsterOnElement.root) {
                root = tabsterOnElement.root;
            }

            if (tabsterOnElement.focusable?.ignoreKeydown) {
                Object.assign(
                    ignoreKeydown,
                    tabsterOnElement.focusable.ignoreKeydown
                );
            }

            curElement = curElement.parentElement;
        }

        // No root element could be found, try to get an auto root
        if (!root) {
            const rootAPI = tabster.root as RootAPI;
            const autoRoot = rootAPI._autoRoot;

            if (autoRoot) {
                if (element.ownerDocument?.body) {
                    root = rootAPI._autoRootCreate();
                }
            }
        }

        if (groupper && !mover) {
            isGroupperFirst = true;
        }

        return root
            ? {
                  root,
                  modalizer,
                  groupper,
                  mover,
                  isGroupperFirst,
                  modalizerInGroupper,
                  isRtl: checkRtl ? !!isRtl : undefined,
                  uncontrolled,
                  isExcludedFromMover,
                  ignoreKeydown,
              }
            : undefined;
    }

    static getRoot(
        tabster: Types.TabsterCore,
        element: HTMLElement
    ): Types.Root | undefined {
        for (
            let el = element as HTMLElement | null;
            el;
            el = el.parentElement
        ) {
            const root = getTabsterOnElement(tabster, el)?.root;

            if (root) {
                return root;
            }
        }

        return undefined;
    }

    onRoot(root: Types.Root, removed?: boolean): void {
        if (removed) {
            delete this.rootById[root.uid];
        } else {
            this.rootById[root.uid] = root;
        }
    }

    private _onRootDispose = (root: Root) => {
        delete this._roots[root.id];
    };
}
