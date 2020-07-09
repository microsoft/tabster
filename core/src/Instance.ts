/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from './Types';

export function setAbilityHelpersOnElement(
    element: Types.HTMLElementWithAbilityHelpersAttribute,
    helpers: Partial<Types.AbilityHelpersOnElement>
): void {
    const cur = (element.__ah || {}) as Types.AbilityHelpersOnElement;
    const attr = element.__ahAttr;
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
        delete element.__ah;
        delete element.__ahAttr;

        element.removeAttribute(Types.AbilityHelpersAttributeName);
    } else {
        const attrStr = JSON.stringify(attrObject);

        element.__ah = cur;
        element.__ahAttr = {
            string: attrStr,
            object: attrObject,
            changing: true
        };

        if (!attr || (attr.string !== attrStr)) {
            element.setAttribute(Types.AbilityHelpersAttributeName, element.__ahAttr.string);
        }

        element.__ahAttr.changing = false;
    }
}

export function getAbilityHelpersOnElement(element: Node): Types.AbilityHelpersOnElement | undefined {
    return (element as Types.HTMLElementWithAbilityHelpers).__ah;
}

export function updateAbilityHelpersByAttribute(
    abilityHelpers: Types.AbilityHelpers,
    element: Types.HTMLElementWithAbilityHelpersAttribute
): void {
    const newAttrValue = element.getAttribute(Types.AbilityHelpersAttributeName);

    let newAttr = element.__ahAttr;
    const elementAH = element.__ah;

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

    const oldObject = (element.__ahAttr && element.__ahAttr.object) || {};
    const newObject = (newAttr && newAttr.object) || {};

    for (let key of Object.keys(oldObject) as (keyof Types.AbilityHelpersAttributeProps)[]) {
        if (!newObject[key]) {
            switch (key) {
                case 'deloser':
                    abilityHelpers.deloser.remove(element);
                    break;

                case 'root':
                    abilityHelpers.root.remove(element);
                    break;

                case 'modalizer':
                    abilityHelpers.modalizer.remove(element);
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
                    abilityHelpers.observed.remove(element);
                    break;

                case 'outline':
                    abilityHelpers.outline.setProps(element, null);
                    break;
            }
        }
    }

    for (let key of Object.keys(newObject) as (keyof Types.AbilityHelpersAttributeProps)[]) {
        switch (key) {
            case 'deloser':
                if (elementAH && elementAH.deloser) {
                    elementAH.deloser.setProps(newObject.deloser);
                } else {
                    abilityHelpers.deloser.add(element, newObject.deloser);
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
                    abilityHelpers.modalizer.add(element, newObject.modalizer!!!);
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
                if (elementAH && elementAH.observed) {
                    abilityHelpers.observed.setProps(element, newObject.observed);
                } else {
                    abilityHelpers.observed.add(element, newObject.observed);
                }
                break;

            case 'outline':
                abilityHelpers.outline.setProps(element, newObject.outline || null);
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

        element.__ahAttr = newAttr;

        if (newAttr.string !== newAttrValue) {
            element.setAttribute(Types.AbilityHelpersAttributeName, newAttr.string);
        }

        newAttr.changing = false;
    }
}

export function augmentAttribute(
    element: Types.HTMLElementWithAugmentedAttributes,
    name: string,
    value?: string | null // Restore original value when undefined.
): void {
    if (!element.__ahAug) {
        if (value === undefined) {
            return;
        }

        element.__ahAug = {};
    }

    if (value === undefined) {
        if (name in element.__ahAug) {
            const origVal = element.__ahAug[name];

            delete element.__ahAug[name];

            if (origVal === null) {
                element.removeAttribute(name);
            } else {
                element.setAttribute(name, origVal);
            }
        }
    } else {
        if (!(name in element.__ahAug)) {
            element.__ahAug[name] = element.getAttribute(name);
        }

        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    }

    if ((value === undefined) && (Object.keys(element.__ahAug).length === 0)) {
        delete element.__ahAug;
    }
}
