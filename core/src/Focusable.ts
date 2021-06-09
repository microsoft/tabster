/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement, setTabsterOnElement } from './Instance';
import { RootAPI } from './Root';
import * as Types from './Types';
import { createElementTreeWalker, matchesSelector } from './Utils';

const _focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '*[tabindex]',
    '*[contenteditable]'
].join(', ');

export class FocusableAPI implements Types.FocusableAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
    }

    protected dispose(): void {
        /**/
    }

    static dispose(instance: Types.FocusableAPI): void {
        (instance as FocusableAPI).dispose();
    }

    private _getBody(): HTMLElement | undefined {
        const last = this._tabster.focusedElement.getLastFocusedElement();

        if (last && last.ownerDocument) {
            return last.ownerDocument.body;
        }

        return this._win().document.body;
    }

    getProps(element: HTMLElement): Types.FocusableProps {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        return (tabsterOnElement && tabsterOnElement.focusable) || {};
    }

    setProps(element: HTMLElement, props: Partial<Types.FocusableProps> | null): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        const curProps: Types.FocusableProps = (tabsterOnElement && tabsterOnElement.focusable) || {};
        const newProps: Types.FocusableProps = {};

        if (props) {
            newProps.isDefault = props.isDefault;
            newProps.isIgnored = props.isIgnored;
            newProps.ignoreAriaDisabled = props.ignoreAriaDisabled;
        }

        if (
            (curProps.isDefault !== newProps.isDefault) ||
            (curProps.isIgnored !== newProps.isIgnored) ||
            (curProps.ignoreAriaDisabled !== newProps.ignoreAriaDisabled)
        ) {
            setTabsterOnElement(this._tabster, element, { focusable: newProps });
        }
    }

    isFocusable(
        el: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): boolean {
        if (matchesSelector(el, _focusableSelector) && (includeProgrammaticallyFocusable || (el.tabIndex !== -1))) {
            return (noVisibleCheck || this.isVisible(el)) && (noAccessibleCheck || this.isAccessible(el));
        }

        return false;
    }

    isVisible(el: HTMLElement): boolean {
        if (!el.ownerDocument) {
            return false;
        }

        if ((el.offsetParent === null) && (el.ownerDocument.body !== el)) {
            return false;
        }

        const win = el.ownerDocument.defaultView;

        if (!win) {
            return false;
        }

        const rect = el.ownerDocument.body.getBoundingClientRect();

        if ((rect.width === 0) && (rect.height === 0)) {
            // This might happen, for example, if our <body> is in hidden <iframe>.
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
            const tabsterOnElement = getTabsterOnElement(this._tabster, e);

            if (this._isHidden(e)) {
                return false;
            }

            const ignoreDisabled = tabsterOnElement?.focusable?.ignoreAriaDisabled;

            if (!ignoreDisabled && this._isDisabled(e)) {
                return false;
            }
        }

        return true;
    }

    private _attrIs(el: HTMLElement, name: string, value: string): boolean {
        let attrVal = el.getAttribute(name);
        if (attrVal && (attrVal.toLowerCase() === value)) {
            return true;
        }

        return false;

    }

    private _isDisabled(el: HTMLElement): boolean {
        return this._attrIs(el, 'aria-disabled', 'true');
    }

    private _isHidden(el: HTMLElement): boolean {
        return this._attrIs(el, 'aria-hidden', 'true');
    }

    findFirst(
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this.findElement(
            context || this._getBody(),
            null,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            false
        );
    }

    findLast(
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this.findElement(
            context || this._getBody(),
            null,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            true
        );
    }

    findNext(
        current: HTMLElement,
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this.findElement(
            context || this._getBody(),
            current,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            false
        );
    }

    findPrev(
        current: HTMLElement,
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this.findElement(
            context || this._getBody(),
            current,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            true
        );
    }

    findDefault(
        context?: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        ignoreGroupper?: boolean
    ): HTMLElement | null {
        return this.findElement(
            context || this._getBody(),
            null,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            false,
            el => (this._tabster.focusable.isFocusable(el, includeProgrammaticallyFocusable) && !!this.getProps(el).isDefault)
        );
    }

    /**
     * Finds all focusables in a given context that satisfy an given condition
     *
     * @param context @see {@link _findElement}
     * @param customFilter A callback that checks whether an element should be added to results
     * @param ignoreProgrammaticallyFocusable @see {@link _findElement}
     * @param ignoreGroupper @see {@link _findElement}
     * @param skipDefaultCondition skips the default condition that leverages @see {@link isFocusable}, be careful using this
     */
    findAll(
        context: HTMLElement,
        customFilter?: (el: HTMLElement) => boolean,
        includeProgrammaticallyFocusable?: boolean,
        ignoreGroupper?: boolean,
        skipDefaultCondition?: boolean
    ): HTMLElement[] {
        const acceptCondition = (el: HTMLElement): boolean => {
            let defaultCheck: boolean;
            let customCheck = false;

            if (skipDefaultCondition) {
                defaultCheck = true;
            } else {
                defaultCheck = this._tabster.focusable.isFocusable(
                    el,
                    includeProgrammaticallyFocusable
                );
            }

            if (defaultCheck) {
                customCheck = customFilter ? customFilter(el) : true;
            }

            return defaultCheck && customCheck;
        };

        const acceptElementState: Types.FocusableAcceptElementState = {
            container: context,
            from: null,
            acceptCondition,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            grouppers: {}
        };

        const walker = createElementTreeWalker(
            context.ownerDocument,
            context,
            node => this._acceptElement(node as HTMLElement, acceptElementState)
        );

        const nodeFilter = walker?.filter;

        if (!walker || !context || !nodeFilter) {
            return [];
        }

        const foundNodes: HTMLElement[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
            foundNodes.push(node as HTMLElement);
        }

        return foundNodes;
    }

    findElement(
        container: HTMLElement | undefined,
        currentElement: HTMLElement | null,
        includeProgrammaticallyFocusable?: boolean,
        ignoreGroupper?: boolean,
        prev?: boolean,
        acceptCondition?: (el: HTMLElement) => boolean
    ): HTMLElement | null {
        if (!container) {
            return null;
        }

        if (!container.ownerDocument || (currentElement && (container !== currentElement) && !container.contains(currentElement))) {
            return null;
        }

        if (!acceptCondition) {
            acceptCondition = el => this._tabster.focusable.isFocusable(el, includeProgrammaticallyFocusable);
        }

        const acceptElementState: Types.FocusableAcceptElementState = {
            container,
            from: currentElement,
            acceptCondition,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            grouppers: {}
        };

        const walker = createElementTreeWalker(
            container.ownerDocument,
            container,
            (node) => this._acceptElement(node as HTMLElement, acceptElementState)
        );

        if (!walker) {
            return null;
        }

        if (currentElement) {
            walker.currentNode = currentElement;
        } else if (prev) {
            let lastChild: HTMLElement | null = null;

            for (let i = container.lastElementChild; i; i = i.lastElementChild) {
                lastChild = i as HTMLElement;
            }

            if (!lastChild) {
                return null;
            }

            if (this._acceptElement(lastChild, acceptElementState) === NodeFilter.FILTER_ACCEPT) {
                return lastChild;
            } else {
                walker.currentNode = lastChild;
            }
        }

        const ret = (prev ? walker.previousNode() : walker.nextNode()) as (HTMLElement | null);

        return acceptElementState.found || ret;
    }

    private _acceptElement(
        element: HTMLElement,
        state: Types.FocusableAcceptElementState
    ): number {
        if (element === state.container) {
            return NodeFilter.FILTER_SKIP;
        }

        if (state.found) {
            return NodeFilter.FILTER_REJECT;
        }

        const ctx = RootAPI.getTabsterContext(this._tabster, element);

        // Tabster is opt in, if it is not managed, don't try and get do anything special
        if (!ctx) {
            return NodeFilter.FILTER_SKIP;
        }

        // We assume iframes are focusable because native tab behaviour would tab inside
        if (element.tagName === 'IFRAME') {
            return NodeFilter.FILTER_ACCEPT;
        }

        if (!this.isAccessible(element)) {
            return NodeFilter.FILTER_REJECT;
        }

        if (!state.ignoreGroupper) {
            let groupper: Types.Groupper | undefined;
            let mover: Types.Mover | undefined;
            groupper = ctx.groupper;
            mover = ctx.mover;
            const isGroupperFirst = ctx.isGroupperFirst;

            if (groupper && isGroupperFirst) {
                mover = undefined;
            } else if (mover && !isGroupperFirst) {
                groupper = undefined;
            }

            if (groupper) {
                const result = groupper.acceptElement(element, state);

                if (result !== undefined) {
                    return result;
                }
            }

            if (mover) {
                const result = mover.acceptElement(element, state);

                if (result !== undefined) {
                    return result;
                }
            }
        }

        return state.acceptCondition(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
}
