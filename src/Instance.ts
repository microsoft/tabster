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

export interface HTMLElementWithAbilityHelpers extends HTMLElement  {
    __abilityHelpers?: Types.AbilityHelpersOnElement;
}

export function setAbilityHelpersOnElement(element: HTMLElement, abilityHelpers: Partial<Types.AbilityHelpersOnElement>): void {
    const cur = (element as HTMLElementWithAbilityHelpers).__abilityHelpers || {};

    Object.keys(abilityHelpers).forEach((key: keyof Types.AbilityHelpersOnElement) => {
        const h = abilityHelpers[key];

        if (h === undefined) {
            if (cur) {
                delete cur[key];
            }
        } else {
            cur[key] = h as any;
        }
    });

    if (Object.keys(cur).length === 0) {
        delete (element as HTMLElementWithAbilityHelpers).__abilityHelpers;
    } else {
        (element as HTMLElementWithAbilityHelpers).__abilityHelpers = cur;
    }
}

export function getAbilityHelpersOnElement(element: Node): Types.AbilityHelpersOnElement | undefined {
    return (element as HTMLElementWithAbilityHelpers).__abilityHelpers;
}
