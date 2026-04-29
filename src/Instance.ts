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

    const tabsterOnElement = entry.tabster || {};
    const oldTabsterProps = entry.attr?.object || {};
    const newTabsterProps = newAttr?.object || {};

    for (const key of Object.keys(
        oldTabsterProps
    ) as (keyof Types.TabsterAttributeProps)[]) {
        if (!newTabsterProps[key]) {
            if (key === "root") {
                const root = tabsterOnElement[key];

                if (root) {
                    tabster.root.onRoot(root, true);
                }
            }

            switch (key) {
                case "deloser":
                case "root":
                case "groupper":
                case "modalizer":
                case "restorer":
                case "mover":
                    // eslint-disable-next-line no-case-declarations
                    const part = tabsterOnElement[key];
                    if (part) {
                        part.dispose();
                        delete tabsterOnElement[key];
                    }
                    break;

                case "observed":
                    delete tabsterOnElement[key];
                    if (tabster.observedElement) {
                        tabster.observedElement.onObservedElementUpdate(
                            element
                        );
                    }
                    break;

                case "focusable":
                case "outline":
                case "uncontrolled":
                case "sys":
                    delete tabsterOnElement[key];
                    break;
            }
        }
    }

    for (const key of Object.keys(
        newTabsterProps
    ) as (keyof Types.TabsterAttributeProps)[]) {
        const sys = newTabsterProps.sys;

        switch (key) {
            case "root":
                if (tabsterOnElement.root) {
                    tabsterOnElement.root.setProps(
                        newTabsterProps.root as Types.RootProps
                    );
                } else {
                    tabsterOnElement.root = tabster.root.createRoot(
                        element,
                        newTabsterProps.root as Types.RootProps,
                        sys
                    );
                }
                tabster.root.onRoot(tabsterOnElement.root);
                break;

            case "focusable":
                tabsterOnElement.focusable = newTabsterProps.focusable;
                break;

            case "observed":
                if (tabster.observedElement) {
                    tabsterOnElement.observed = newTabsterProps.observed;
                    tabster.observedElement.onObservedElementUpdate(element);
                } else if (__DEV__) {
                    console.error(
                        "ObservedElement API used before initialization, please call `getObservedElement()`"
                    );
                }
                break;

            case "uncontrolled":
                tabsterOnElement.uncontrolled = newTabsterProps.uncontrolled;
                break;

            case "outline":
                if (tabster.outline) {
                    tabsterOnElement.outline = newTabsterProps.outline;
                } else if (__DEV__) {
                    console.error(
                        "Outline API used before initialization, please call `getOutline()`"
                    );
                }
                break;

            case "sys":
                tabsterOnElement.sys = newTabsterProps.sys;
                break;

            default: {
                const handler = tabster.attrHandlers.get(key);
                if (handler) {
                    handler(
                        element,
                        tabsterOnElement,
                        newTabsterProps[key],
                        oldTabsterProps?.[key],
                        sys
                    );
                } else if (__DEV__) {
                    console.error(
                        `${key} API used before initialization, please call \`get${
                            key[0].toUpperCase() + key.slice(1)
                        }()\``
                    );
                }
            }
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
