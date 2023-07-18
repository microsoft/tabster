/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type {
    RestorerAPI,
    GetWindow,
    Restorer,
    RestorerProps,
    KeyboardNavigationState,
    FocusedElementState,
} from "./Types";
import { RestorerTypes } from "./Types";
import { getTabsterAttributeOnElement } from "./Utils";

const EVENT_NAME = "restorer:restorefocus";
const HISOTRY_DEPTH = 10;

function createRestorer(
    element: HTMLElement | undefined,
    props: RestorerProps
): Restorer {
    const { type } = props;
    const onFocusOut = (e: FocusEvent) => {
        if (e.relatedTarget === null) {
            element?.dispatchEvent(
                new Event(EVENT_NAME, {
                    bubbles: true,
                })
            );
        }
    };

    const dispose = () => {
        if (type === RestorerTypes.source) {
            element?.removeEventListener("focusout", onFocusOut);
        }

        element = undefined;
    };

    if (type === RestorerTypes.source) {
        element?.addEventListener("focusout", onFocusOut);
    }

    return {
        dispose,
    };
}

export function createRestorerAPI(
    getWindow: GetWindow,
    keyboardNavState: KeyboardNavigationState,
    focusedElementState: FocusedElementState
): RestorerAPI {
    let restoreFocusTimeout = 0;
    const history: WeakRef<HTMLElement>[] = [];
    const onRestoreFocus = (e: Event) => {
        const win = getWindow();
        if (restoreFocusTimeout) {
            win.clearTimeout(restoreFocusTimeout);
        }

        restoreFocusTimeout = win.setTimeout(() =>
            restoreFocus(e.target as HTMLElement)
        );
    };

    const onFocusIn = (element: HTMLElement | undefined) => {
        if (!element) {
            return;
        }

        const tabsterAttribute = getTabsterAttributeOnElement(element);
        if (tabsterAttribute?.restorer?.type !== RestorerTypes.target) {
            return;
        }

        // Don't duplicate the top of history
        if (history[history.length - 1]?.deref() === element) {
            return;
        }

        if (history.length > HISOTRY_DEPTH) {
            history.shift();
        }

        history.push(new WeakRef<HTMLElement>(element));
    };

    const restoreFocus = (source: HTMLElement) => {
        // don't restore focus if focus isn't lost to body
        const doc = getWindow().document;
        if (doc.activeElement !== document.body) {
            return;
        }

        if (
            // clicking on any empty space focuses body - this is can be a false positive
            !keyboardNavState.isNavigatingWithKeyboard() &&
            // source no longer exists on DOM - always restore focus
            doc.body.contains(source)
        ) {
            return;
        }

        let weakRef = history.pop();
        while (
            weakRef &&
            !doc.body.contains(weakRef.deref()?.parentElement ?? null)
        ) {
            weakRef = history.pop();
        }

        weakRef?.deref()?.focus();
    };

    getWindow().addEventListener(EVENT_NAME, onRestoreFocus);
    focusedElementState.subscribe(onFocusIn);

    const dispose = () => {
        const win = getWindow();
        focusedElementState.unsubscribe(onFocusIn);
        win.removeEventListener(EVENT_NAME, onRestoreFocus);

        if (restoreFocusTimeout) {
            win.clearTimeout(restoreFocusTimeout);
        }
    };

    return {
        dispose,
        createRestorer,
    };
}
