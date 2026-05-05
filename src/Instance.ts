/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type * as Types from "./Types.js";
import { TABSTER_ATTRIBUTE_NAME } from "./Consts.js";

export function getTabsterOnElement(
    tabster: Types.TabsterCore,
    element: HTMLElement
): Types.TabsterOnElement | undefined {
    return tabster.storageEntry(element)?.tabster;
}

// Plain-value attribute keys: their value is stored verbatim on the element's
// TabsterOnElement entry, with no associated API instance to create or dispose.
// Listed here so the generic dispatch in `updateTabsterByAttribute` doesn't
// need to consult the attr-handler registry for them.
const PLAIN_VALUE_KEYS = new Set<keyof Types.TabsterAttributeProps>([
    "focusable",
    "uncontrolled",
    "sys",
]);

interface MaybeDisposable {
    dispose?: () => void;
}

export function updateTabsterByAttribute(
    tabster: Types.TabsterCore,
    element: HTMLElement,
    dispose?: boolean
): void {
    const newAttrValue =
        dispose || tabster._noop
            ? undefined
            : element.getAttribute(TABSTER_ATTRIBUTE_NAME);

    let entry = tabster.storageEntry(element);
    let newAttr: Types.TabsterAttributeOnElement | undefined;

    if (newAttrValue) {
        if (newAttrValue !== entry?.attr?.string) {
            try {
                const newValue = JSON.parse(
                    newAttrValue
                ) as Types.TabsterAttributeProps;

                if (typeof newValue !== "object") {
                    throw new Error(
                        `Value is not a JSON object, got '${newAttrValue}'.`
                    );
                }

                newAttr = {
                    string: newAttrValue,
                    object: newValue,
                };
            } catch (e) {
                if (__DEV__) {
                    console.error(
                        `data-tabster attribute error: ${e}`,
                        element
                    );
                }
            }
        } else {
            return;
        }
    } else if (!entry) {
        return;
    }

    if (!entry) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        entry = tabster.storageEntry(element, true)!;
    }

    if (!entry.tabster) {
        entry.tabster = {};
    }

    const tabsterOnElement = entry.tabster;
    const oldTabsterProps = entry.attr?.object || {};
    const newTabsterProps = newAttr?.object || {};

    // Removal pass: any key present on the old attribute but missing from the
    // new one is being unset. Generic shape: dispose if the live value is
    // disposable, then drop the slot. The single feature-specific tail is
    // observed-element teardown, which has no dispose() but needs explicit
    // notification.
    for (const key of Object.keys(
        oldTabsterProps
    ) as (keyof Types.TabsterAttributeProps)[]) {
        if (newTabsterProps[key]) {
            continue;
        }

        const part = tabsterOnElement[key] as MaybeDisposable | undefined;
        if (typeof part?.dispose === "function") {
            part.dispose();
        }
        delete tabsterOnElement[key];

        if (key === "observed") {
            tabster.observedElement?.onObservedElementUpdate(
                element,
                undefined
            );
        }
    }

    // Addition / update pass: plain-value keys are stored verbatim; everything
    // else dispatches to a handler registered by the feature's `getX` factory
    // (or by `RootAPI` for the always-on root case).
    //
    // `observed` is special: its post-assignment notification triggers
    // synchronous waiters that read tabsterOnElement.observed back through
    // storage, so the assignment must precede the notification. Handlers
    // can't express that ordering, so it stays inline.
    for (const key of Object.keys(
        newTabsterProps
    ) as (keyof Types.TabsterAttributeProps)[]) {
        if (PLAIN_VALUE_KEYS.has(key)) {
            tabsterOnElement[key] = newTabsterProps[key] as never;
            continue;
        }

        if (key === "observed") {
            const observedProps =
                newTabsterProps.observed as Types.ObservedElementProps;
            tabsterOnElement.observed = observedProps;
            if (tabster.observedElement) {
                tabster.observedElement.onObservedElementUpdate(
                    element,
                    observedProps
                );
            } else if (__DEV__) {
                console.error(
                    "ObservedElement API used before initialization, please call `getObservedElement()`"
                );
            }
            continue;
        }

        const handler = tabster.attrHandlers.get(key);
        if (handler) {
            tabsterOnElement[key] = handler(
                element,
                tabsterOnElement[key],
                newTabsterProps[key],
                oldTabsterProps?.[key],
                newTabsterProps.sys
            ) as never;
        } else if (__DEV__) {
            console.error(
                `${key} API used before initialization, please call \`get${
                    key[0].toUpperCase() + key.slice(1)
                }()\``
            );
        }
    }

    if (newAttr) {
        entry.attr = newAttr;
    } else {
        if (Object.keys(tabsterOnElement).length === 0) {
            delete entry.tabster;
            delete entry.attr;
        }
        tabster.storageEntry(element, false);
    }
}
