/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from './Types';
import { getElementUId, HTMLElementWithUID } from './Utils';

export function setAbilityHelpersOnElement(
    abilityHelpers: Types.AbilityHelpersCore,
    element: HTMLElementWithUID,
    helpers: Partial<Types.AbilityHelpersOnElement>
): void {
    let uid = element.__ahElementUID;
    let entry = uid ? (abilityHelpers as unknown as Types.AbilityHelpersInternal).storageEntry(uid) : undefined;
    const cur = (entry?.ah || {}) as Types.AbilityHelpersOnElement;
    const attr = entry?.attr;
    let attrObject: Types.AbilityHelpersAttributeProps;

    if (attr) {
        attrObject = attr.object;
    } else {
        attrObject = {};
    }

    Object.keys(helpers).forEach((key: keyof Types.AbilityHelpersOnElement) => {
        const h = helpers[key];

        if (h === undefined) {
            if (cur) {
                delete cur[key];
                delete attrObject[key];
            }
        } else {
            switch (key) {
                case 'deloser':
                    cur[key] = helpers.deloser;
                    attrObject[key] = (h as Types.Deloser).getBasicProps();
                    break;

                case 'root':
                    cur[key] = helpers.root;
                    attrObject[key] = (h as Types.Root).getBasicProps();
                    break;

                case 'modalizer':
                    cur[key] = helpers.modalizer;
                    attrObject[key] = (h as Types.Modalizer).getBasicProps();
                    break;

                case 'focusable':
                    cur[key] = attrObject[key] = helpers.focusable;
                    break;

                case 'groupper':
                    cur[key] = helpers.groupper;
                    attrObject[key] = (h as Types.Groupper).getBasicProps();
                    break;

                case 'uberGroupper':
                    cur[key] = helpers.uberGroupper;
                    attrObject[key] = true;
                    break;

                case 'observed':
                    cur[key] = attrObject[key] = helpers.observed;
                    break;

                case 'outline':
                    cur[key] = attrObject[key] = helpers.outline;
                    break;

                default:
                    throw new Error('Unknown helper.');
            }
        }
    });

    if (Object.keys(cur).length === 0) {
        if (uid && entry) {
            delete entry.ah;
            delete entry.attr;
            (abilityHelpers as unknown as Types.AbilityHelpersInternal).storageEntry(uid, false);
        }

        element.removeAttribute(Types.AbilityHelpersAttributeName);
    } else {
        const attrStr = JSON.stringify(attrObject);

        if (!entry) {
            if (!uid) {
                uid = getElementUId(element, (abilityHelpers as unknown as Types.AbilityHelpersInternal).getWindow());
            }

            entry = (abilityHelpers as unknown as Types.AbilityHelpersInternal).storageEntry(uid, true)!;
        }

        entry.ah = cur;
        entry.attr = {
            string: attrStr,
            object: attrObject,
            changing: true
        };

        if (!attr || (attr.string !== attrStr)) {
            element.setAttribute(Types.AbilityHelpersAttributeName, entry.attr.string);
        }

        entry.attr.changing = false;
    }
}

export function getAbilityHelpersOnElement(
    abilityHelpers: Types.AbilityHelpersCore,
    element: Node
): Types.AbilityHelpersOnElement | undefined {
    const uid = (element as HTMLElementWithUID).__ahElementUID;
    return uid ? (abilityHelpers as unknown as Types.AbilityHelpersInternal).storageEntry(uid)?.ah : undefined;
}

export function updateAbilityHelpersByAttribute(
    abilityHelpers: Types.AbilityHelpersCore,
    element: HTMLElementWithUID
): void {
    const newAttrValue = element.getAttribute(Types.AbilityHelpersAttributeName);
    const ahi = (abilityHelpers as unknown as Types.AbilityHelpersInternal);

    let uid = element.__ahElementUID;
    let entry = uid ? ahi.storageEntry(uid) : undefined;

    let newAttr = entry?.attr;
    const elementAH = entry?.ah;

    if (newAttrValue) {
        if (newAttrValue !== (newAttr && newAttr.string)) {
            try {
                const newValue = JSON.parse(newAttrValue) as Types.AbilityHelpersAttributeProps;

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
    } else if (elementAH) {
        newAttr = undefined;
    }

    const oldObject = entry?.attr?.object || {};
    const newObject = (newAttr && newAttr.object) || {};

    for (let key of Object.keys(oldObject) as (keyof Types.AbilityHelpersAttributeProps)[]) {
        if (!newObject[key]) {
            switch (key) {
                case 'deloser':
                    if (ahi.deloser) {
                        ahi.deloser.remove(element);
                    }
                    break;

                case 'root':
                    abilityHelpers.root.remove(element);
                    break;

                case 'modalizer':
                    if (ahi.modalizer) {
                        ahi.modalizer.remove(element);
                    }
                    break;

                case 'focusable':
                    abilityHelpers.focusable.setProps(element, null);
                    break;

                case 'groupper':
                    abilityHelpers.focusable.removeGroupper(element);
                    break;

                case 'uberGroupper':
                    break;

                case 'observed':
                    if (ahi.observedElement) {
                        ahi.observedElement.remove(element);
                    }
                    break;

                case 'outline':
                    if (ahi.outline) {
                        ahi.outline.setProps(element, null);
                    }
                    break;
            }
        }
    }

    debugger;
    for (let key of Object.keys(newObject) as (keyof Types.AbilityHelpersAttributeProps)[]) {
        switch (key) {
            case 'deloser':
                if (elementAH && elementAH.deloser) {
                    elementAH.deloser.setProps(newObject.deloser);
                } else {
                    if (ahi.deloser) {
                        ahi.deloser.add(element, newObject.deloser);
                    }
                }
                break;

            case 'root':
                if (elementAH && elementAH.root) {
                    elementAH.root.setProps(newObject.root);
                } else {
                    abilityHelpers.root.add(element);
                }
                break;

            case 'modalizer':
                if (elementAH && elementAH.modalizer) {
                    elementAH.modalizer.setProps(newObject.modalizer);
                } else {
                    if (ahi.modalizer) {
                        ahi.modalizer.add(element, newObject.modalizer!!!);
                    }
                }
                break;

            case 'focusable':
                abilityHelpers.focusable.setProps(element, newObject.focusable || null);
                break;

            case 'groupper':
                if (elementAH && elementAH.groupper) {
                    elementAH.groupper.setProps(newObject.groupper);
                } else {
                    abilityHelpers.focusable.addGroupper(element, newObject.groupper);
                }
                break;

            case 'uberGroupper':
                break;

            case 'observed':
                if (ahi.observedElement) {
                    if (elementAH && elementAH.observed) {
                        ahi.observedElement.setProps(element, newObject.observed);
                    } else {
                        ahi.observedElement.add(element, newObject.observed);
                    }
                }
                break;

            case 'outline':
                if (ahi.outline) {
                    ahi.outline.setProps(element, newObject.outline || null);
                }
                break;

            default:
                delete newObject[key];
                console.error(`Unknown key '${ key }' in data-ah attribute value.`);
        }
    }

    if (newAttr) {
        newAttr.object = newObject;
        newAttr.string = JSON.stringify(newObject);
        newAttr.changing = true;

        if (!entry) {
            if (!uid) {
                uid = getElementUId(element, (abilityHelpers as unknown as Types.AbilityHelpersInternal).getWindow());
            }

            entry = (abilityHelpers as unknown as Types.AbilityHelpersInternal).storageEntry(uid, true)!;
        }

        entry.attr = newAttr;

        if (newAttr.string !== newAttrValue) {
            element.setAttribute(Types.AbilityHelpersAttributeName, newAttr.string);
        }

        newAttr.changing = false;
    }
}

export function augmentAttribute(
    abilityHelpers: Types.AbilityHelpersCore,
    element: HTMLElementWithUID,
    name: string,
    value?: string | null // Restore original value when undefined.
): void {
    const uid = getElementUId(element, (abilityHelpers as unknown as Types.AbilityHelpersInternal).getWindow());
    let entry = (abilityHelpers as unknown as Types.AbilityHelpersInternal).storageEntry(uid, true)!;

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
        (abilityHelpers as unknown as Types.AbilityHelpersInternal).storageEntry(uid, false);
    }
}
