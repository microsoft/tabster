/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { KEYBORG_FOCUSIN, KEYBORG_FOCUSOUT, nativeFocus } from "keyborg";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance";
import * as Types from "./Types";
import { RootFocusEvent, RootBlurEvent } from "./Events";
import {
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    getElementUId,
    TabsterPart,
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
    private _setFocused: (focused: boolean) => void;

    constructor(
        tabster: Types.TabsterCore,
        element: WeakHTMLElement,
        setFocused: (focused: boolean) => void,
        sys: Types.SysProps | undefined
    ) {
        super(
            tabster,
            element,
            DummyInputManagerPriorities.Root,
            sys,
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
            this._setFocused(false);
        } else {
            // The only way a dummy input gets focused is during the keyboard navigation.
            this._tabster.keyboardNavigation.setNavigatingWithKeyboard(true);

            const element = this._element.get();

            if (element) {
                this._setFocused(true);

                const toFocus =
                    this._tabster.focusedElement.getFirstOrLastTabbable(
                        dummyInput.isFirst,
                        { container: element, ignoreAccessibility: true }
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
    private _sys?: Types.SysProps;
    private _isFocused = false;
    private _setFocusedTimer: number | undefined;
    private _onDispose: (root: Root) => void;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (root: Root) => void,
        props: Types.RootProps,
        sys: Types.SysProps | undefined
    ) {
        super(tabster, element, props);

        this._onDispose = onDispose;

        const win = tabster.getWindow;
        this.uid = getElementUId(win, element);

        this._sys = sys;

        if (tabster.controlTab || tabster.rootDummyInputs) {
            this.addDummyInputs();
        }

        const w = win();
        const doc = w.document;

        doc.addEventListener(KEYBORG_FOCUSIN, this._onFocusIn);
        doc.addEventListener(KEYBORG_FOCUSOUT, this._onFocusOut);

        this._add();
    }

    addDummyInputs(): void {
        if (!this._dummyManager) {
            this._dummyManager = new RootDummyManager(
                this._tabster,
                this._element,
                this._setFocused,
                this._sys
            );
        }
    }

    dispose(): void {
        this._onDispose(this);

        const win = this._tabster.getWindow();
        const doc = win.document;

        doc.removeEventListener(KEYBORG_FOCUSIN, this._onFocusIn);
        doc.removeEventListener(KEYBORG_FOCUSOUT, this._onFocusOut);

        if (this._setFocusedTimer) {
            win.clearTimeout(this._setFocusedTimer);
            delete this._setFocusedTimer;
        }

        this._dummyManager?.dispose();
        this._remove();
    }

    moveOutWithDefaultAction(isBackward: boolean, relatedEvent: KeyboardEvent) {
        const dummyManager = this._dummyManager;

        if (dummyManager) {
            dummyManager.moveOutWithDefaultAction(isBackward, relatedEvent);
        } else {
            const el = this.getElement();

            if (el) {
                RootDummyManager.moveWithPhantomDummy(
                    this._tabster,
                    el,
                    true,
                    isBackward,
                    relatedEvent
                );
            }
        }
    }

    private _setFocused = (hasFocused: boolean): void => {
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
                this._dummyManager?.setTabbable(false);
                element.dispatchEvent(new RootFocusEvent({ element }));
            } else {
                this._setFocusedTimer = this._tabster
                    .getWindow()
                    .setTimeout(() => {
                        delete this._setFocusedTimer;

                        this._isFocused = false;
                        this._dummyManager?.setTabbable(true);
                        element.dispatchEvent(new RootBlurEvent({ element }));
                    }, 0);
            }
        }
    };

    private _onFocusIn = (event: FocusEvent) => {
        const getParent = this._tabster.getParent;
        const rootElement = this._element.get();
        let curElement = event.composedPath()[0] as HTMLElement | null;

        do {
            if (curElement === rootElement) {
                this._setFocused(true);
                return;
            }

            curElement =
                curElement && (getParent(curElement) as HTMLElement | null);
        } while (curElement);
    };

    private _onFocusOut = () => {
        this._setFocused(false);
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
    private _autoRoot: Types.RootProps | undefined;
    private _autoRootWaiting = false;
    private _roots: Record<string, Types.Root> = {};
    private _forceDummy = false;
    rootById: { [id: string]: Types.Root } = {};

    constructor(tabster: Types.TabsterCore, autoRoot?: Types.RootProps) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._autoRoot = autoRoot;

        tabster.queueInit(() => {
            if (this._autoRoot) {
                this._autoRootCreate();
            }
        });
    }

    private _autoRootCreate = (): Types.Root | undefined => {
        const doc = this._win().document;
        const body = doc.body;

        if (body) {
            this._autoRootUnwait(doc);

            const props = this._autoRoot;

            if (props) {
                setTabsterAttribute(body, { root: props }, true);
                updateTabsterByAttribute(this._tabster, body);
                return getTabsterOnElement(this._tabster, body)?.root;
            }
        } else if (!this._autoRootWaiting) {
            this._autoRootWaiting = true;
            doc.addEventListener("readystatechange", this._autoRootCreate);
        }

        return undefined;
    };

    private _autoRootUnwait(doc: Document): void {
        doc.removeEventListener("readystatechange", this._autoRootCreate);
        this._autoRootWaiting = false;
    }

    dispose(): void {
        const win = this._win();

        this._autoRootUnwait(win.document);
        delete this._autoRoot;

        Object.keys(this._roots).forEach((rootId) => {
            if (this._roots[rootId]) {
                this._roots[rootId].dispose();
                delete this._roots[rootId];
            }
        });

        this.rootById = {};
    }

    createRoot(
        element: HTMLElement,
        props: Types.RootProps,
        sys: Types.SysProps | undefined
    ): Types.Root {
        if (__DEV__) {
            validateRootProps(props);
        }

        const newRoot = new Root(
            this._tabster,
            element,
            this._onRootDispose,
            props,
            sys
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

        const { checkRtl, referenceElement } = options;

        const getParent = tabster.getParent;

        // Normally, the initialization starts on the next tick after the tabster
        // instance creation. However, if the application starts using it before
        // the next tick, we need to make sure the initialization is done.
        tabster.drainInitQueue();

        let root: Types.Root | undefined;
        let modalizer: Types.Modalizer | undefined;
        let groupper: Types.Groupper | undefined;
        let mover: Types.Mover | undefined;
        let excludedFromMover = false;
        let groupperBeforeMover: boolean | undefined;
        let modalizerInGroupper: Types.Groupper | undefined;
        let dirRightToLeft: boolean | undefined;
        let uncontrolled: HTMLElement | null | undefined;
        let curElement: Node | null = referenceElement || element;
        const ignoreKeydown: Types.FocusableProps["ignoreKeydown"] = {};

        while (curElement && (!root || checkRtl)) {
            const tabsterOnElement = getTabsterOnElement(
                tabster,
                curElement as HTMLElement
            );

            if (checkRtl && dirRightToLeft === undefined) {
                const dir = (curElement as HTMLElement).dir;

                if (dir) {
                    dirRightToLeft = dir.toLowerCase() === "rtl";
                }
            }

            if (!tabsterOnElement) {
                curElement = getParent(curElement);
                continue;
            }

            const tagName = (curElement as HTMLElement).tagName;

            if (
                (tabsterOnElement.uncontrolled ||
                    tagName === "IFRAME" ||
                    tagName === "WEBVIEW") &&
                tabster.focusable.isVisible(curElement as HTMLElement)
            ) {
                uncontrolled = curElement as HTMLElement;
            }

            if (
                !mover &&
                tabsterOnElement.focusable?.excludeFromMover &&
                !groupper
            ) {
                excludedFromMover = true;
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

            if (
                !mover &&
                curMover &&
                (!modalizer || curModalizer) &&
                (!curGroupper || curElement !== element) &&
                curElement.contains(element) // Mover makes sense only for really inside elements, not for virutal out of the DOM order children.
            ) {
                mover = curMover;
                groupperBeforeMover = !!groupper && groupper !== curGroupper;
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

            curElement = getParent(curElement);
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
            groupperBeforeMover = true;
        }

        if (__DEV__ && !root) {
            if (modalizer || groupper || mover) {
                console.error(
                    "Tabster Root is required for Mover, Groupper and Modalizer to work."
                );
            }
        }

        const shouldIgnoreKeydown = (event: KeyboardEvent) =>
            !!ignoreKeydown[
                event.key as keyof Types.FocusableProps["ignoreKeydown"]
            ];

        return root
            ? {
                  root,
                  modalizer,
                  groupper,
                  mover,
                  groupperBeforeMover,
                  modalizerInGroupper,
                  rtl: checkRtl ? !!dirRightToLeft : undefined,
                  uncontrolled,
                  excludedFromMover,
                  ignoreKeydown: shouldIgnoreKeydown,
              }
            : undefined;
    }

    static getRoot(
        tabster: Types.TabsterCore,
        element: HTMLElement
    ): Types.Root | undefined {
        const getParent = tabster.getParent;

        for (
            let el = element as HTMLElement | null;
            el;
            el = getParent(el) as HTMLElement | null
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
