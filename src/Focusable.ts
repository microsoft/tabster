/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { List } from './List';
import { ModalityLayer } from './ModalityLayer';
import * as Types from './Types';
import { createElementTreeWalker } from './Utils';

const _abilityDefaultFocusableClassName = 'ability-helpers-default-focusable';

const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '*[tabindex]',
    '*[contenteditable]'
].join(', ');

export class Focusable implements Types.Focusable {
    private _ah: Types.AbilityHelpers;

    constructor(ah: Types.AbilityHelpers) {
        this._ah = ah;
    }

    getInfo(element: HTMLElement): Types.FocusableElementInfo {
        const ah = getAbilityHelpersOnElement(element);
        const f = ah && ah.focusable;

        return {
            isDefaultFocusable: !!(f && f.default) || element.classList.contains(_abilityDefaultFocusableClassName),
            isIgnoredFocusable: !!(f && f.ignored)
        };
    }

    setup(element: HTMLElement, info: Partial<Types.FocusableElementInfo>): void {
        setAbilityHelpersOnElement(element, { focusable: {
            default: info.isDefaultFocusable,
            ignored: info.isIgnoredFocusable
        } });

        const style: string[] = [];

        if (info.isDefaultFocusable) {
            style.push('default');
        }

        if (info.isIgnoredFocusable) {
            style.push('ignored');
        }

        if (style.length) {
            element.style.setProperty('--ah-focusable', style.join(','));
        } else {
            element.style.removeProperty('--ah-focusable');
        }
    }

    isFocusable(el: HTMLElement, includeProgrammaticallyFocusable?: boolean, noAccessibleCheck?: boolean): boolean {
        if (el.matches && el.matches(focusableSelector) && (includeProgrammaticallyFocusable || (el.tabIndex !== -1))) {
            return this.isVisible(el) && (noAccessibleCheck ? true : this.isAccessible(el));
        }

        return false;
    }

    isVisible(el: HTMLElement): boolean {
        if (el.offsetParent === null) {
            return false;
        }

        const win = el.ownerDocument && el.ownerDocument.defaultView;

        if (!win) {
            return false;
        }

        const computedStyle = win.getComputedStyle(el);

        if (computedStyle.visibility === 'hidden') {
            return false;
        }

        return true;
    }

    isAccessible(el: HTMLElement): boolean {
        for (let e: (HTMLElement | null) = el; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.modalityLayer && !ah.modalityLayer.isActive()) {
                return true;
            }

            let attrVal = e.getAttribute('aria-hidden');

            if (attrVal && (attrVal.toLowerCase() === 'true')) {
                return false;
            }

            attrVal = e.getAttribute('aria-disabled');

            if (attrVal && (attrVal.toLowerCase() === 'true')) {
                return false;
            }
        }

        return true;
    }

    findFirst(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null {
        return this._findNextElement(container, container, false, includeProgrammaticallyFocusable, ignoreLayer);
    }

    findLast(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null {
        return this._findLast(container, false, includeProgrammaticallyFocusable, ignoreLayer);
    }

    findNext(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null {

        return this._findNext(false, false, includeProgrammaticallyFocusable, ignoreLayer, container, focused);
    }

    findPrev(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null {

        return this._findNext(false, true, includeProgrammaticallyFocusable, ignoreLayer, container, focused);
    }

    findFirstListItem(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null {
        return this._findNextElement(container, container, true, includeProgrammaticallyFocusable, ignoreLayer);
    }

    findLastListItem(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null {
        return this._findLast(container, true, includeProgrammaticallyFocusable, ignoreLayer);
    }

    findNextListItem(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null {

        return this._findNext(true, false, includeProgrammaticallyFocusable, ignoreLayer, container, focused);
    }

    findPrevListItem(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null {

        return this._findNext(true, true, includeProgrammaticallyFocusable, ignoreLayer, container, focused);
    }

    findDefault(container: HTMLElement): HTMLElement | null {
        if (!container.ownerDocument) {
            return null;
        }

        const walker = createElementTreeWalker(container.ownerDocument, container, (element: HTMLElement) => {
            const info = this.getInfo(element);

            if (info.isDefaultFocusable) {
                return this._ah.focusable.isFocusable(element)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_SKIP;
            }

            return NodeFilter.FILTER_SKIP;
        });

        return (walker ? walker.nextNode() : null) as (HTMLElement | null);
    }

    private _findNext(listItem: boolean, prev?: boolean, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null {

        if (!focused) {
            focused = this._ah.focusedElement.getFocusedElement();
        }

        if (!focused || !focused.ownerDocument) {
            return null;
        }

        container = container || focused.ownerDocument.body;

        if (!container.contains(focused)) {
            return null;
        }

        return this._findNextElement(container, focused, listItem, includeProgrammaticallyFocusable, ignoreLayer, prev);
    }

    private _findLast(
        container: HTMLElement,
        listItem: boolean,
        includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean
    ): HTMLElement | null {
        let lastChild: HTMLElement | null = null;

        for (let i = container.lastElementChild; i; i = i.lastElementChild) {
            lastChild = i as HTMLElement;
        }

        if (!lastChild) {
            return null;
        }

        if (this._acceptElement(lastChild, listItem, includeProgrammaticallyFocusable, ignoreLayer) === NodeFilter.FILTER_ACCEPT) {
            return lastChild;
        }

        return this._findNextElement(container, lastChild, listItem, includeProgrammaticallyFocusable, ignoreLayer, true);
    }

    private _findNextElement(
        container: HTMLElement,
        from: HTMLElement | null,
        listItem: boolean,
        includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean,
        prev?: boolean
    ): HTMLElement | null {
        if (!container.ownerDocument) {
            return null;
        }

        const walker = createElementTreeWalker(
            container.ownerDocument,
            container,
            (node) => this._acceptElement(node as HTMLElement, listItem, includeProgrammaticallyFocusable, ignoreLayer)
        );

        if (!walker) {
            return null;
        }

        if (from) {
            walker.currentNode = from;
        }

        return (prev ? walker.previousNode() : walker.nextNode()) as (HTMLElement | null);
    }

    private _acceptElement(
        element: HTMLElement,
        listItem: boolean,
        includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean
    ): number {
        const layerInfo = ModalityLayer.getLayerFor(element);

        if (ignoreLayer || !layerInfo ||
                (layerInfo.root.getCurrentLayerId() === layerInfo.layer.userId) ||
                layerInfo.layer.isAlwaysAccessible()) {

            const li = List.getItemFor(element);

            if (!listItem && li && (li.listItem !== li.list.getCurrentItem())) {
                return NodeFilter.FILTER_REJECT;
            }

            return (!listItem || (li && li.isListItem)) && this._ah.focusable.isFocusable(element, includeProgrammaticallyFocusable)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP;
        }

        return layerInfo ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
    }
}
