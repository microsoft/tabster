/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance";
import type {
    RestorerAPI as RestorerAPIType,
    GetWindow,
    Restorer as RestorerInterface,
    RestorerProps,
    KeyboardNavigationState,
    FocusedElementState,
    TabsterCore,
} from "./Types";
import { RestorerTypes } from "./Types";
import { TabsterPart } from "./Utils";

const EVENT_NAME = "restorer:restorefocus";
const HISOTRY_DEPTH = 10;

class Restorer extends TabsterPart<RestorerProps> implements RestorerInterface {
    constructor(
        tabster: TabsterCore,
        element: HTMLElement,
        props: RestorerProps
    ) {
        super(tabster, element, props);
        if (this._props.type === RestorerTypes.Source) {
            const element = this._element?.get();
            element?.addEventListener("focusout", this._onFocusOut);
        }
    }

    dispose(): void {
        if (this._props.type === RestorerTypes.Source) {
            const element = this._element?.get();
            element?.removeEventListener("focusout", this._onFocusOut);
        }
    }

    private _onFocusOut = (e: FocusEvent) => {
        if (e.relatedTarget === null) {
            const element = this._element?.get();
            element?.dispatchEvent(
                new Event(EVENT_NAME, {
                    bubbles: true,
                })
            );
        }
    };
}

export class RestorerAPI implements RestorerAPIType {
    private _tabster: TabsterCore;
    private _history: WeakRef<HTMLElement>[] = [];
    private _keyboardNavState: KeyboardNavigationState;
    private _focusedElementState: FocusedElementState;
    private _restoreFocusTimeout = 0;
    private _getWindow: GetWindow;

    constructor(tabster: TabsterCore) {
        this._tabster = tabster;
        this._getWindow = tabster.getWindow;
        this._getWindow().addEventListener(EVENT_NAME, this._onRestoreFocus);

        this._keyboardNavState = tabster.keyboardNavigation;
        this._focusedElementState = tabster.focusedElement;

        this._focusedElementState.subscribe(this._onFocusIn);
    }

    dispose(): void {
        const win = this._getWindow();
        this._focusedElementState.unsubscribe(this._onFocusIn);
        win.removeEventListener(EVENT_NAME, this._onRestoreFocus);

        if (this._restoreFocusTimeout) {
            win.clearTimeout(this._restoreFocusTimeout);
        }
    }

    private _onRestoreFocus = (e: Event) => {
        const win = this._getWindow();
        if (this._restoreFocusTimeout) {
            win.clearTimeout(this._restoreFocusTimeout);
        }

        this._restoreFocusTimeout = win.setTimeout(() =>
            this._restoreFocus(e.target as HTMLElement)
        );
    };

    private _onFocusIn = (element: HTMLElement | undefined) => {
        if (!element) {
            return;
        }

        const tabsterAttribute = getTabsterOnElement(this._tabster, element);
        if (
            tabsterAttribute?.restorer?.getProps().type !== RestorerTypes.Target
        ) {
            return;
        }

        // Don't duplicate the top of history
        if (this._history[this._history.length - 1]?.deref() === element) {
            return;
        }

        if (this._history.length > HISOTRY_DEPTH) {
            this._history.shift();
        }

        this._history.push(new WeakRef<HTMLElement>(element));
    };

    private _restoreFocus = (source: HTMLElement) => {
        // don't restore focus if focus isn't lost to body
        const doc = this._getWindow().document;
        if (doc.activeElement !== document.body) {
            return;
        }

        if (
            // clicking on any empty space focuses body - this is can be a false positive
            !this._keyboardNavState.isNavigatingWithKeyboard() &&
            // Source no longer exists on DOM - always restore focus
            doc.body.contains(source)
        ) {
            return;
        }

        let weakRef = this._history.pop();
        while (
            weakRef &&
            !doc.body.contains(weakRef.deref()?.parentElement ?? null)
        ) {
            weakRef = this._history.pop();
        }

        weakRef?.deref()?.focus();
    };

    public createRestorer(element: HTMLElement, props: RestorerProps) {
        return new Restorer(this._tabster, element, props);
    }
}
