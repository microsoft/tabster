/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance.js";
import type {
    GetWindow,
    Restorer as RestorerInterface,
    RestorerAPI as RestorerAPIType,
    RestorerProps,
    TabsterCore,
} from "./Types.js";
import { RestorerTypes, AsyncFocusSources } from "./Consts.js";
import {
    RestorerRestoreFocusEvent,
    RestorerRestoreFocusEventName,
} from "./Events.js";
import {
    addListener,
    dispatchEvent,
    removeListener,
    TabsterPart,
    WeakHTMLElement,
} from "./Utils.js";
import { dom } from "./DOMAPI.js";

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
            addListener(element, "focusout", this._onFocusOut);
            addListener(element, "focusin", this._onFocusIn);

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
            removeListener(element, "focusout", this._onFocusOut);
            removeListener(element, "focusin", this._onFocusIn);

            if (this._hasFocus) {
                const doc = this._tabster.getWindow().document;
                dispatchEvent(doc.body, new RestorerRestoreFocusEvent());
            }
        }
    }

    private _onFocusOut = (e: FocusEvent) => {
        const element = this._element?.get();
        if (element && e.relatedTarget === null) {
            dispatchEvent(element, new RestorerRestoreFocusEvent());
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

class History {
    private static readonly DEPTH = 10;
    private _stack: WeakHTMLElement<HTMLElement>[] = [];
    declare private _getWindow: GetWindow;
    constructor(getWindow: GetWindow) {
        this._getWindow = getWindow;
    }
    /**
     * Push a weak element to the top of the history stack.
     * If the stack is full, the bottom weak element is removed.
     * If the element is already at the top of the stack, it is not duplicated.
     */
    push(element: HTMLElement): void {
        // Don't duplicate the top of history
        if (this._stack[this._stack.length - 1]?.get() === element) {
            return;
        }

        if (this._stack.length > History.DEPTH) {
            this._stack.shift();
        }
        this._stack.push(new WeakHTMLElement<HTMLElement>(element));
    }
    /**
     * Pop the first element from the history that satisfies the callback.
     * The history is searched from the top to the bottom (from the most recent to the least recent).
     *
     * If a weak reference to the element is broken,
     * or the element is no longer in the DOM,
     * the element is removed from the top of the stack while popping.
     *
     * If no matching element is found, undefined is returned.
     * If the stack is empty, undefined is returned.
     */
    pop(
        filter: (element: HTMLElement) => boolean = () => true
    ): HTMLElement | undefined {
        const doc = this._getWindow().document;
        for (let index = this._stack.length - 1; index >= 0; index--) {
            const maybeElement = this._stack.pop()?.get();
            if (
                maybeElement &&
                dom.nodeContains(
                    doc.body,
                    dom.getParentElement(maybeElement)
                ) &&
                filter(maybeElement)
            ) {
                return maybeElement;
            }
        }
        return undefined;
    }
}

export function createRestorerAPI(tabster: TabsterCore): RestorerAPIType {
    const getWindow = tabster.getWindow;
    const history = new History(getWindow);
    const keyboardNavState = tabster.keyboardNavigation;
    const focusedElementState = tabster.focusedElement;

    const restoreFocus = (source: HTMLElement, sourceId?: string) => {
        // don't restore focus if focus isn't lost to body
        const doc = getWindow().document;
        if (dom.getActiveElement(doc) !== doc.body) {
            return;
        }
        if (
            // clicking on any empty space focuses body - this is can be a false positive
            !keyboardNavState.isNavigatingWithKeyboard() &&
            // Source no longer exists on DOM - always restore focus
            dom.nodeContains(doc.body, source)
        ) {
            return;
        }

        const getId = (element: HTMLElement) => {
            const restorerProps = getTabsterOnElement(
                tabster,
                element
            )?.restorer?.getProps();
            // We return id or undefined if there is actual restorer on the element,
            // and null otherwise. To filter out elements that had restorers in their lifetime
            // but don't have them anymore.
            return restorerProps ? restorerProps.id : null;
        };

        // sourceId is undefined or string, if there is no Restorer on the target, the element will
        // be filtered out because getId() will return null.
        history.pop((target) => sourceId === getId(target))?.focus();
    };

    const onRestoreFocus = (e: Event) => {
        focusedElementState.cancelAsyncFocus(AsyncFocusSources.Restorer);

        // ShadowDOM will have shadowRoot as e.target.
        const source = e.composedPath()[0] as HTMLElement | undefined;

        if (source) {
            // source id must be recovered before source is removed from DOM
            // otherwise it'll be unreachable
            // (as tabster on element will not be available through getTabsterOnElement)
            const sourceId = getTabsterOnElement(
                tabster,
                source
            )?.restorer?.getProps().id;

            focusedElementState.requestAsyncFocus(
                AsyncFocusSources.Restorer,
                () => restoreFocus(source, sourceId),
                0
            );
        }
    };

    const onFocusIn = (element: HTMLElement | undefined) => {
        if (!element) {
            return;
        }

        const tabsterAttribute = getTabsterOnElement(tabster, element);
        if (
            tabsterAttribute?.restorer?.getProps().type !== RestorerTypes.Target
        ) {
            return;
        }

        history.push(element);
    };

    addListener(getWindow(), RestorerRestoreFocusEventName, onRestoreFocus);
    focusedElementState.subscribe(onFocusIn);

    return {
        createRestorer(element: HTMLElement, props: RestorerProps) {
            const restorer = new Restorer(tabster, element, props);
            // Focus might already be on a restorer target when it gets created so the focusin will not do anything
            if (
                props.type === RestorerTypes.Target &&
                dom.getActiveElement(element.ownerDocument) === element
            ) {
                history.push(element);
            }

            return restorer;
        },

        dispose() {
            focusedElementState.unsubscribe(onFocusIn);
            focusedElementState.cancelAsyncFocus(AsyncFocusSources.Restorer);
            removeListener(
                getWindow(),
                RestorerRestoreFocusEventName,
                onRestoreFocus
            );
        },
    };
}
