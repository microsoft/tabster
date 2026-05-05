/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { KEYBORG_FOCUSIN, KEYBORG_FOCUSOUT, nativeFocus } from "keyborg";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance.js";
import type * as Types from "./Types.js";
import { RootFocusEvent, RootBlurEvent } from "./Events.js";
import {
    createDummyInputManager,
    type DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
} from "./DummyInput.js";
import {
    addListener,
    clearTimer,
    createTimer,
    dispatchEvent,
    getElementUId,
    removeListener,
    setTimer,
    TabsterPart,
    type Timer,
    type WeakHTMLElement,
} from "./Utils.js";
import { setTabsterAttribute } from "./AttributeHelpers.js";

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

function createRootDummyManager(
    tabster: Types.TabsterCore,
    element: WeakHTMLElement,
    setFocused: (focused: boolean) => void,
    sys: Types.SysProps | undefined
): DummyInputManager {
    const manager = createDummyInputManager(
        tabster,
        element,
        DummyInputManagerPriorities.Root,
        sys,
        undefined,
        true
    );

    const onDummyInputFocus = (dummyInput: DummyInput): void => {
        if (dummyInput.useDefaultAction) {
            // When we've reached the last focusable element, we want to let the browser
            // to move the focus outside of the page. In order to do that we're synchronously
            // calling focus() of the dummy input from the Tab key handler and allowing
            // the default action to move the focus out.
            setFocused(false);
        } else {
            // The only way a dummy input gets focused is during the keyboard navigation.
            tabster.keyboardNavigation.setNavigatingWithKeyboard(true);

            const el = element.get();

            if (el) {
                setFocused(true);

                const toFocus = tabster.focusedElement.getFirstOrLastTabbable(
                    dummyInput.isFirst,
                    { container: el, ignoreAccessibility: true }
                );

                if (toFocus) {
                    nativeFocus(toFocus);
                    return;
                }
            }

            dummyInput.input?.blur();
        }
    };

    manager.setHandlers(onDummyInputFocus);

    return manager;
}

export class Root
    extends TabsterPart<Types.RootProps, undefined>
    implements Types.Root
{
    readonly uid: string;

    private _dummyManager?: DummyInputManager;
    private _sys?: Types.SysProps;
    private _isFocused = false;
    private _setFocusedTimer: Timer;
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
        this._setFocusedTimer = createTimer();
        this.uid = getElementUId(win, element);

        this._sys = sys;

        if (tabster.controlTab || tabster.rootDummyInputs) {
            this.addDummyInputs();
        }

        const w = win();
        const doc = w.document;

        addListener(doc, KEYBORG_FOCUSIN, this._onFocusIn);
        addListener(doc, KEYBORG_FOCUSOUT, this._onFocusOut);

        this._add();
    }

    addDummyInputs(): void {
        if (!this._dummyManager) {
            this._dummyManager = createRootDummyManager(
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

        removeListener(doc, KEYBORG_FOCUSIN, this._onFocusIn);
        removeListener(doc, KEYBORG_FOCUSOUT, this._onFocusOut);

        clearTimer(this._setFocusedTimer, win);

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
                DummyInputManager.moveWithPhantomDummy(
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
        const win = this._tabster.getWindow();
        clearTimer(this._setFocusedTimer, win);

        if (this._isFocused === hasFocused) {
            return;
        }

        const element = this._element.get();

        if (element) {
            if (hasFocused) {
                this._isFocused = true;
                this._dummyManager?.setTabbable(false);
                dispatchEvent(element, new RootFocusEvent({ element }));
            } else {
                setTimer(
                    this._setFocusedTimer,
                    win,
                    () => {
                        this._isFocused = false;
                        this._dummyManager?.setTabbable(true);
                        dispatchEvent(element, new RootBlurEvent({ element }));
                    },
                    0
                );
            }
        }
    };

    private _onFocusIn = (event: Event) => {
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
    /** @internal — read by `getTabsterContext` (src/Context.ts) for auto-root fallback. */
    _autoRoot: Types.RootProps | undefined;
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

    /** @internal — invoked by `getTabsterContext` (src/Context.ts) for auto-root fallback. */
    _autoRootCreate = (): Types.Root | undefined => {
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
            addListener(doc, "readystatechange", this._autoRootCreate);
        }

        return undefined;
    };

    private _autoRootUnwait(doc: Document): void {
        removeListener(doc, "readystatechange", this._autoRootCreate);
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
