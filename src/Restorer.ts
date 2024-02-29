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
import { RestorerTypes, AsyncFocusSources } from "./Types";
import {
    RestorerRestoreFocusEventName,
    RestorerRestoreFocusEvent,
} from "./Events";
import { TabsterPart, WeakHTMLElement } from "./Utils";
import { dom } from "./DOMAPI";

const HISOTRY_DEPTH = 10;

class Restorer extends TabsterPart<RestorerProps> implements RestorerInterface {
    private _hasFocus = false;

    constructor(
        tabster: TabsterCore,
        element: HTMLElement,
        props: RestorerProps
    ) {
        super(tabster, element, props);

        if (this._props.type === RestorerTypes.Source) {
            const element = this._element?.get();
            element?.addEventListener("focusout", this._onFocusOut);
            element?.addEventListener("focusin", this._onFocusIn);

            // set hasFocus when the instance is created, in case focus has already moved within it
            this._hasFocus = dom.nodeContains(
                element,
                element && dom.getActiveElement(element.ownerDocument)
            );
        }
    }

    dispose(): void {
        if (this._props.type === RestorerTypes.Source) {
            const element = this._element?.get();
            element?.removeEventListener("focusout", this._onFocusOut);
            element?.removeEventListener("focusin", this._onFocusIn);

            if (this._hasFocus) {
                const doc = this._tabster.getWindow().document;
                doc.body.dispatchEvent(new RestorerRestoreFocusEvent());
            }
        }
    }

    private _onFocusOut = (e: FocusEvent) => {
        const element = this._element?.get();
        if (element && e.relatedTarget === null) {
            element.dispatchEvent(new RestorerRestoreFocusEvent());
        }
        if (
            element &&
            !dom.nodeContains(element, e.relatedTarget as HTMLElement | null)
        ) {
            this._hasFocus = false;
        }
    };

    private _onFocusIn = () => {
        this._hasFocus = true;
    };
}

export class RestorerAPI implements RestorerAPIType {
    private _tabster: TabsterCore;
    private _history: WeakHTMLElement<HTMLElement>[] = [];
    private _keyboardNavState: KeyboardNavigationState;
    private _focusedElementState: FocusedElementState;
    private _getWindow: GetWindow;

    constructor(tabster: TabsterCore) {
        this._tabster = tabster;
        this._getWindow = tabster.getWindow;
        this._getWindow().addEventListener(
            RestorerRestoreFocusEventName,
            this._onRestoreFocus
        );

        this._keyboardNavState = tabster.keyboardNavigation;
        this._focusedElementState = tabster.focusedElement;

        this._focusedElementState.subscribe(this._onFocusIn);
    }

    dispose(): void {
        const win = this._getWindow();
        this._focusedElementState.unsubscribe(this._onFocusIn);

        this._focusedElementState.cancelAsyncFocus(AsyncFocusSources.Restorer);

        win.removeEventListener(
            RestorerRestoreFocusEventName,
            this._onRestoreFocus
        );
    }

    private _onRestoreFocus = (e: Event) => {
        this._focusedElementState.cancelAsyncFocus(AsyncFocusSources.Restorer);

        // ShadowDOM will have shadowRoot as e.target.
        const target = e.composedPath()[0];

        if (target) {
            this._focusedElementState.requestAsyncFocus(
                AsyncFocusSources.Restorer,
                () => this._restoreFocus(target as HTMLElement),
                0
            );
        }
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

        this._addToHistory(element);
    };

    private _addToHistory(element: HTMLElement) {
        // Don't duplicate the top of history
        if (this._history[this._history.length - 1]?.get() === element) {
            return;
        }

        if (this._history.length > HISOTRY_DEPTH) {
            this._history.shift();
        }

        this._history.push(
            new WeakHTMLElement<HTMLElement>(this._getWindow, element)
        );
    }

    private _restoreFocus = (source: HTMLElement) => {
        // don't restore focus if focus isn't lost to body
        const doc = this._getWindow().document;
        if (dom.getActiveElement(doc) !== doc.body) {
            return;
        }

        if (
            // clicking on any empty space focuses body - this is can be a false positive
            !this._keyboardNavState.isNavigatingWithKeyboard() &&
            // Source no longer exists on DOM - always restore focus
            dom.nodeContains(doc.body, source)
        ) {
            return;
        }

        let weakElement = this._history.pop();
        while (
            weakElement &&
            !dom.nodeContains(doc.body, dom.getParentElement(weakElement.get()))
        ) {
            weakElement = this._history.pop();
        }

        weakElement?.get()?.focus();
    };

    public createRestorer(element: HTMLElement, props: RestorerProps) {
        const restorer = new Restorer(this._tabster, element, props);
        // Focus might already be on a restorer target when it gets created so the focusin will not do anything
        if (
            props.type === RestorerTypes.Target &&
            dom.getActiveElement(element.ownerDocument) === element
        ) {
            this._addToHistory(element);
        }

        return restorer;
    }
}
