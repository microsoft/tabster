/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

export function getTabsterOnElement(
    tabster: Types.TabsterCore,
    element: HTMLElement
): Types.TabsterOnElement | undefined {
    return (tabster as Types.TabsterInternal).storageEntry(element)?.tabster;
}

export function updateTabsterByAttribute(
    tabster: Types.TabsterInternal,
    element: HTMLElement,
    dispose?: boolean
): void {
    const newAttrValue =
        dispose || tabster._noop
            ? undefined
            : element.getAttribute(Types.TabsterAttributeName);
    const tabsteri = tabster as Types.TabsterInternal;

    let entry = tabsteri.storageEntry(element);
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
        entry = (tabster as Types.TabsterInternal).storageEntry(element, true)!;
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
                    tabsteri.updateRoot(root, true);
                }
            } else if (key === "modalizer") {
                const modalizer = tabsterOnElement.modalizer;

                if (tabsteri.updateModalizer && modalizer) {
                    tabsteri.updateModalizer(modalizer, true);
                }
            }

            switch (key) {
                case "deloser":
                case "root":
                case "groupper":
                case "modalizer":
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
                    if (tabsteri.updateObserved) {
                        tabsteri.updateObserved(element);
                    }
                    break;

                case "focusable":
                case "outline":
                case "uncontrolled":
                    delete tabsterOnElement[key];
                    break;
            }
        }
    }

    for (const key of Object.keys(
        newTabsterProps
    ) as (keyof Types.TabsterAttributeProps)[]) {
        switch (key) {
            case "deloser":
                if (tabsterOnElement.deloser) {
                    tabsterOnElement.deloser.setProps(
                        newTabsterProps.deloser as Types.DeloserProps
                    );
                } else {
                    if (tabsteri.createDeloser) {
                        tabsterOnElement.deloser = tabsteri.createDeloser(
                            tabsteri,
                            element,
                            newTabsterProps.deloser as Types.DeloserProps
                        );
                    } else if (__DEV__) {
                        console.error(
                            "Deloser API used before initializing, please call `getDeloser()`"
                        );
                    }
                }
                break;

            case "root":
                if (tabsterOnElement.root) {
                    tabsterOnElement.root.setProps(
                        newTabsterProps.root as Types.RootProps
                    );
                } else {
                    tabsterOnElement.root = tabsteri.createRoot(
                        tabsteri,
                        element,
                        newTabsterProps.root as Types.RootProps
                    );
                }
                tabsteri.updateRoot(tabsterOnElement.root);
                break;

            case "modalizer":
                if (tabsterOnElement.modalizer) {
                    tabsterOnElement.modalizer.setProps(
                        newTabsterProps.modalizer as Types.ModalizerProps
                    );
                } else {
                    if (tabsteri.createModalizer) {
                        tabsterOnElement.modalizer = tabsteri.createModalizer(
                            tabsteri,
                            element,
                            newTabsterProps.modalizer as Types.ModalizerProps
                        );
                    } else if (__DEV__) {
                        console.error(
                            "Modalizer API used before initializing, please call `getModalizer()`"
                        );
                    }
                }
                break;

            case "focusable":
                tabsterOnElement.focusable = newTabsterProps.focusable;
                break;

            case "groupper":
                if (tabsterOnElement.groupper) {
                    tabsterOnElement.groupper.setProps(
                        newTabsterProps.groupper as Types.GroupperProps
                    );
                } else {
                    if (tabsteri.createGroupper) {
                        tabsterOnElement.groupper = tabsteri.createGroupper(
                            tabsteri,
                            element,
                            newTabsterProps.groupper as Types.GroupperProps
                        );
                    } else if (__DEV__) {
                        console.error(
                            "Groupper API used before initializing, please call `getGroupper()`"
                        );
                    }
                }
                break;

            case "mover":
                if (tabsterOnElement.mover) {
                    tabsterOnElement.mover.setProps(
                        newTabsterProps.mover as Types.MoverProps
                    );
                } else {
                    if (tabsteri.createMover) {
                        tabsterOnElement.mover = tabsteri.createMover(
                            tabsteri,
                            element,
                            newTabsterProps.mover as Types.MoverProps
                        );
                    } else if (__DEV__) {
                        console.error(
                            "Mover API used before initializing, please call `getMover()`"
                        );
                    }
                }
                break;

            case "observed":
                if (tabsteri.updateObserved) {
                    tabsterOnElement.observed = newTabsterProps.observed;
                    tabsteri.updateObserved(element);
                } else if (__DEV__) {
                    console.error(
                        "ObservedElement API used before initializing, please call `getObservedElement()`"
                    );
                }
                break;

            case "uncontrolled":
                tabsterOnElement.uncontrolled = newTabsterProps.uncontrolled;
                break;

            case "outline":
                if (tabsteri.outline) {
                    tabsterOnElement.outline = newTabsterProps.outline;
                } else if (__DEV__) {
                    console.error(
                        "Outline API used before initializing, please call `getOutline()`"
                    );
                }
                break;

            default:
                console.error(
                    `Unknown key '${key}' in data-tabster attribute value.`
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
        tabsteri.storageEntry(element, false);
    }
}

export function augmentAttribute(
    tabster: Types.TabsterCore,
    element: HTMLElement,
    name: string,
    value?: string | null // Restore original value when undefined.
): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const entry = (tabster as Types.TabsterInternal).storageEntry(
        element,
        true
    )!;

    if (!entry.aug) {
        if (value === undefined) {
            return;
        }

        entry.aug = {};
    }

    if (value === undefined) {
        if (name in entry.aug) {
            const origVal = entry.aug[name];

            delete entry.aug[name];

            if (origVal === null) {
                element.removeAttribute(name);
            } else {
                element.setAttribute(name, origVal);
            }
        }
    } else {
        if (!(name in entry.aug)) {
            entry.aug[name] = element.getAttribute(name);
        }

        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    }

    if (value === undefined && Object.keys(entry.aug).length === 0) {
        delete entry.aug;
        (tabster as Types.TabsterInternal).storageEntry(element, false);
    }
}
