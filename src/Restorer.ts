/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type {
    RestorerAPI as RestorerAPIType,
    GetWindow,
    RestorerType,
    Restorer as RestorerInterace,
    RestorerProps,
    KeyboardNavigationState,
    FocusedElementState,
} from "./Types";
import { RestorerTypes } from "./Types";
import { getTabsterAttributeOnElement } from "./Utils";

const EVENT_NAME = "restorer:restorefocus";
const HISOTRY_DEPTH = 10;

class Restorer implements RestorerInterace {
    private _element: HTMLElement | undefined;
    private _type: RestorerType;
    constructor(element: HTMLElement, type: RestorerType) {
        this._element = element;
        this._type = type;
        if (this._type === RestorerTypes.source) {
            this._element.addEventListener("focusout", this._onFocusOut);
        }
    }

    dispose(): void {
        if (this._type === RestorerTypes.source) {
            this._element?.removeEventListener("focusout", this._onFocusOut);
        }

        this._element = undefined;
    }

    private _onFocusOut = (e: FocusEvent) => {
        if (e.relatedTarget === null) {
            this._element?.dispatchEvent(
                new Event(EVENT_NAME, {
                    bubbles: true,
                })
            );
        }
    };
}

export class RestorerAPI implements RestorerAPIType {
    private _history: WeakRef<HTMLElement>[] = [];
    private _keyboardNavState: KeyboardNavigationState;
    private _focusedElementState: FocusedElementState;
    private _restoreFocusTimeout = 0;
    private _getWindow: GetWindow;

    constructor(
        getWindow: GetWindow,
        keyboardNavState: KeyboardNavigationState,
        focusedElementState: FocusedElementState
    ) {
        this._getWindow = getWindow;
        this._getWindow().addEventListener(EVENT_NAME, this._onRestoreFocus);

        this._keyboardNavState = keyboardNavState;
        this._focusedElementState = focusedElementState;

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

        const tabsterAttribute = getTabsterAttributeOnElement(element);
        if (tabsterAttribute?.restorer?.type !== RestorerTypes.target) {
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
            // source no longer exists on DOM - always restore focus
            doc.body.contains(source)
        ) {
            return;
        }

        let weakRef = this._history.pop();
        while (!doc.body.contains(weakRef?.deref()?.parentElement ?? null)) {
            console.log("loop");
            weakRef = this._history.pop();
        }

        weakRef?.deref()?.focus();
    };

    public createRestorer(element: HTMLElement, props: RestorerProps) {
        return new Restorer(element, props.type);
    }
}
