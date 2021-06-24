/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from './Types';
import { getElementUId, HTMLElementWithUID } from './Utils';

export function setTabsterOnElement(
    tabster: Types.TabsterCore,
    element: HTMLElementWithUID,
    tabsterOnElement: Partial<Types.TabsterOnElement>
): void {
    let uid = element.__tabsterElementUID;
    let entry = uid ? (tabster as unknown as Types.TabsterInternal).storageEntry(uid) : undefined;
    const cur = (entry?.tabster || {}) as Types.TabsterOnElement;
    const attr = entry?.attr;
    let attrObject: Types.TabsterAttributeProps;

    if (attr) {
        attrObject = attr.object;
    } else {
        attrObject = {};
    }

    Object.keys(tabsterOnElement).forEach((key: keyof Types.TabsterOnElement) => {
        const h = tabsterOnElement[key];

        if (h === undefined) {
            if (cur) {
                delete cur[key];
                delete attrObject[key];
            }
        } else {
            switch (key) {
                case 'deloser':
                    cur[key] = tabsterOnElement.deloser;
                    attrObject[key] = (h as Types.Deloser).getBasicProps();
                    break;

                case 'root':
                    cur[key] = tabsterOnElement.root;
                    attrObject[key] = (h as Types.Root).getBasicProps();
                    break;

                case 'modalizer':
                    cur[key] = tabsterOnElement.modalizer;
                    attrObject[key] = (h as Types.Modalizer).getBasicProps();
                    break;

                case 'focusable':
                    cur[key] = attrObject[key] = tabsterOnElement.focusable;
                    break;

                case 'groupper':
                    cur[key] = tabsterOnElement.groupper;
                    attrObject[key] = (h as Types.Groupper).getBasicProps();
                    break;

                case 'uberGroupper':
                    cur[key] = tabsterOnElement.uberGroupper;
                    attrObject[key] = true;
                    break;

                case 'observed':
                    cur[key] = attrObject[key] = tabsterOnElement.observed;
                    break;

                case 'outline':
                    cur[key] = attrObject[key] = tabsterOnElement.outline;
                    break;
                case 'ignorer':
                    cur[key] = attrObject[key] = tabsterOnElement.ignorer;
                    break;

                default:
                    throw new Error('Unknown Tabster part.');
            }
        }
    });

    if (Object.keys(cur).length === 0) {
        if (uid && entry) {
            delete entry.tabster;
            delete entry.attr;
            (tabster as unknown as Types.TabsterInternal).storageEntry(uid, false);
        }

        element.removeAttribute(Types.TabsterAttributeName);
    } else {
        const attrStr = JSON.stringify(attrObject);

        if (!entry) {
            if (!uid) {
                uid = getElementUId((tabster as unknown as Types.TabsterInternal).getWindow, element);
            }

            entry = (tabster as unknown as Types.TabsterInternal).storageEntry(uid, true)!;
        }

        entry.tabster = cur;
        entry.attr = {
            string: attrStr,
            object: attrObject,
            changing: true
        };

        if (!attr || (attr.string !== attrStr)) {
            element.setAttribute(Types.TabsterAttributeName, entry.attr.string);
        }

        entry.attr.changing = false;
    }
}

export function getTabsterOnElement(
    tabster: Types.TabsterCore,
    element: Node
): Types.TabsterOnElement | undefined {
    const uid = (element as HTMLElementWithUID).__tabsterElementUID;
    return uid ? (tabster as unknown as Types.TabsterInternal).storageEntry(uid)?.tabster : undefined;
}

export function updateTabsterByAttribute(
    tabster: Types.TabsterCore,
    element: HTMLElementWithUID
): void {
    const newAttrValue = element.getAttribute(Types.TabsterAttributeName);
    const tabsteri = (tabster as unknown as Types.TabsterInternal);

    let uid = element.__tabsterElementUID;
    let entry = uid ? tabsteri.storageEntry(uid) : undefined;

    let newAttr = entry?.attr;
    const tabsterOnElement = entry?.tabster;

    if (newAttrValue) {
        if (newAttrValue !== (newAttr && newAttr.string)) {
            try {
                const newValue = JSON.parse(newAttrValue) as Types.TabsterAttributeProps;

                if (typeof newValue !== 'object') {
                    throw new Error(`Value is not a JSON object, got '${ newAttrValue }'.`);
                }

                newAttr = {
                    string: newAttrValue,
                    object: newValue,
                    changing: false
                };
            } catch (e) {
                if (__DEV__) {
                    console.error(e);
                }
            }
        }
    } else if (tabsterOnElement) {
        newAttr = undefined;
    }

    const oldObject = entry?.attr?.object || {};
    const newObject = (newAttr && newAttr.object) || {};

    for (let key of Object.keys(oldObject) as (keyof Types.TabsterAttributeProps)[]) {
        if (!newObject[key]) {
            switch (key) {
                case 'deloser':
                    if (tabsteri.deloser) {
                        tabsteri.deloser.remove(element);
                    }
                    break;

                case 'root':
                    tabster.root.remove(element);
                    break;

                case 'modalizer':
                    if (tabsteri.modalizer) {
                        tabsteri.modalizer.remove(element);
                    }
                    break;

                case 'focusable':
                    tabster.focusable.setProps(element, null);
                    break;

                case 'groupper':
                    tabster.focusable.removeGroupper(element);
                    break;

                case 'uberGroupper':
                    break;

                case 'observed':
                    if (tabsteri.observedElement) {
                        tabsteri.observedElement.remove(element);
                    }
                    break;

                case 'outline':
                    if (tabsteri.outline) {
                        tabsteri.outline.setProps(element, null);
                    }
                    break;

                case 'ignorer':
                    tabsteri.ignorer.remove(element);
            }
        }
    }

    for (let key of Object.keys(newObject) as (keyof Types.TabsterAttributeProps)[]) {
        switch (key) {
            case 'deloser':
                if (tabsterOnElement && tabsterOnElement.deloser) {
                    tabsterOnElement.deloser.setProps(newObject.deloser);
                } else {
                    if (tabsteri.deloser) {
                        tabsteri.deloser.add(element, newObject.deloser);
                    }

                    if (!tabsteri.deloser && __DEV__) {
                        console.error('Deloser API used before initializing, please call `getDeloser`');
                    }
                }
                break;

            case 'root':
                if (tabsterOnElement && tabsterOnElement.root) {
                    tabsterOnElement.root.setProps(newObject.root);
                } else {
                    tabster.root.add(element);
                }
                break;

            case 'modalizer':
                if (tabsterOnElement && tabsterOnElement.modalizer) {
                    tabsterOnElement.modalizer.setProps(newObject.modalizer);
                } else {
                    if (tabsteri.modalizer) {
                        tabsteri.modalizer.add(element, newObject.modalizer!!!);
                    }

                    if (!tabsteri.modalizer && __DEV__) {
                        console.error('Modalizer API used before initializing, please call `getDeloser`');
                    }
                }
                break;

            case 'focusable':
                tabster.focusable.setProps(element, newObject.focusable || null);
                break;

            case 'groupper':
                if (tabsterOnElement && tabsterOnElement.groupper) {
                    tabsterOnElement.groupper.setProps(newObject.groupper);
                } else {
                    tabster.focusable.addGroupper(element, newObject.groupper);
                }
                break;

            case 'uberGroupper':
                break;

            case 'observed':
                if (tabsteri.observedElement) {
                    if (tabsterOnElement && tabsterOnElement.observed) {
                        tabsteri.observedElement.setProps(element, newObject.observed);
                    } else {
                        tabsteri.observedElement.add(element, newObject.observed);
                    }
                }
                break;

            case 'outline':
                if (tabsteri.outline) {
                    tabsteri.outline.setProps(element, newObject.outline || null);
                }
                break;

            case 'ignorer':
                tabsteri.ignorer.add(element);
                break;

            default:
                delete newObject[key];
                console.error(`Unknown key '${ key }' in data-tabster attribute value.`);
        }
    }

    if (newAttr) {
        newAttr.object = newObject;
        newAttr.string = JSON.stringify(newObject);
        newAttr.changing = true;

        if (!entry) {
            if (!uid) {
                uid = getElementUId((tabster as unknown as Types.TabsterInternal).getWindow, element);
            }

            entry = (tabster as unknown as Types.TabsterInternal).storageEntry(uid, true)!;
        }

        entry.attr = newAttr;

        if (newAttr.string !== newAttrValue) {
            element.setAttribute(Types.TabsterAttributeName, newAttr.string);
        }

        newAttr.changing = false;
    }
}

export function augmentAttribute(
    tabster: Types.TabsterCore,
    element: HTMLElementWithUID,
    name: string,
    value?: string | null // Restore original value when undefined.
): void {
    const uid = getElementUId((tabster as unknown as Types.TabsterInternal).getWindow, element);
    let entry = (tabster as unknown as Types.TabsterInternal).storageEntry(uid, true)!;

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

    if ((value === undefined) && (Object.keys(entry.aug).length === 0)) {
        delete entry.aug;
        (tabster as unknown as Types.TabsterInternal).storageEntry(uid, false);
    }
}
