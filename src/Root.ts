/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { KEYBORG_FOCUSIN, KEYBORG_FOCUSOUT } from "keyborg";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance.js";
import type * as Types from "./Types.js";
import { RootFocusEvent, RootBlurEvent } from "./Events.js";
import { type DummyInputManager } from "./DummyInput.js";
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

export class Root
    extends TabsterPart<Types.RootProps, undefined>
    implements Types.Root
{
    // `declare` keeps the type info for TS without emitting a `this.x = void 0`
    // class-field initializer that the constructor immediately overwrites.
    declare readonly uid: string;
    declare private _dummyManager?: DummyInputManager;
    declare private _sys?: Types.SysProps;
    private _isFocused = false;
    declare private _setFocusedTimer: Timer;
    declare private _onDispose: (root: Root) => void;

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

        // No-ops without a registered rootDummyManagerFactory.
        this.addDummyInputs();

        const w = win();
        const doc = w.document;

        addListener(doc, KEYBORG_FOCUSIN, this._onFocusIn);
        addListener(doc, KEYBORG_FOCUSOUT, this._onFocusOut);

        this._add();
    }

    addDummyInputs(): void {
        if (!this._dummyManager) {
            this._dummyManager = this._tabster.rootDummyManagerFactory?.(
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
        // Both the manager-dispatch and the phantom-dummy fallback live in
        // the registered handler set by `getRootDummyInputs`. Without that
        // opt-in, this is a no-op — the consumer has chosen no dummy-input
        // behaviour at any level.
        this._tabster.moveOutOfRoot?.(
            this._tabster,
            this.getElement(),
            this._dummyManager,
            isBackward,
            relatedEvent
        );
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
    declare private _tabster: Types.TabsterCore;
    declare private _win: Types.GetWindow;
    /** @internal — read by `getTabsterContext` (src/Context.ts) for auto-root fallback. */
    declare _autoRoot: Types.RootProps | undefined;
    private _autoRootWaiting = false;
    private _roots: Record<string, Types.Root> = {};
    rootById: { [id: string]: Types.Root } = {};

    constructor(tabster: Types.TabsterCore, autoRoot?: Types.RootProps) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._autoRoot = autoRoot;

        tabster.attrHandlers.set(
            "root",
            (element, existing, newProps, _, sys) => {
                if (existing) {
                    (existing as Types.Root).setProps(newProps);
                    return existing as Types.Root;
                }
                return this.createRoot(element, newProps, sys);
            }
        );

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
        this.rootById[newRoot.uid] = newRoot;

        return newRoot;
    }

    addDummyInputs(): void {
        // Root.addDummyInputs() is idempotent and runs in every Root
        // constructor, so future roots pick up dummies automatically once
        // the factory is registered. This call covers existing roots.
        for (const id of Object.keys(this._roots)) {
            this._roots[id].addDummyInputs();
        }
    }

    private _onRootDispose = (root: Root) => {
        delete this._roots[root.id];
        delete this.rootById[root.uid];
    };
}
