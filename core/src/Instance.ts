/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { OutlineElements } from './Outline';
import * as Types from './Types';

export interface WindowWithAbilityHelpers extends Window {
    __abilityHelpers?: {
        helpers: Types.AbilityHelpers,
        mainWindow: Window,
        outlineStyle?: HTMLStyleElement,
        outline?: OutlineElements
    };
}

export interface HTMLElementWithAbilityHelpers extends HTMLElement {
    __abilityHelpers?: Types.AbilityHelpersOnElement;
}

export interface HTMLElementWithAbilityHelpersAttribute extends HTMLElementWithAbilityHelpers {
    __ahAttr?: Types.AbilityHelpersAttributeOnElement;
}

export function setAbilityHelpersOnElement(
    element: HTMLElementWithAbilityHelpersAttribute,
    helpers: Partial<Types.AbilityHelpersOnElement>
): void {
    const cur = (element.__abilityHelpers || {}) as Types.AbilityHelpersOnElement;
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
                    attrObject[key] = true;
                    break;

                case 'root':
                    cur[key] = helpers.root;
                    attrObject[key] = true;
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

                case 'groupperContainer':
                    cur[key] = helpers.groupperContainer;
                    attrObject[key] = true;
                    break;

                case 'outline':
                    cur[key] = helpers.outline = attrObject[key] = helpers.outline;
                    break;

                default:
                    throw new Error('Unknown helper.');
            }
        }
    });

    if (Object.keys(cur).length === 0) {
        delete element.__abilityHelpers;
        delete element.__ahAttr;
        element.removeAttribute(Types.AbilityHelpersAttributeName);
    } else {
        element.__abilityHelpers = cur;
        element.__ahAttr = {
            string: JSON.stringify(attrObject),
            object: attrObject
        };
        element.setAttribute(Types.AbilityHelpersAttributeName, element.__ahAttr.string);
    }
}

export function getAbilityHelpersOnElement(element: Node): Types.AbilityHelpersOnElement | undefined {
    return (element as HTMLElementWithAbilityHelpers).__abilityHelpers;
}
