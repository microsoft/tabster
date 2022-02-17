/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance";
import { RootAPI } from "./Root";
import * as Types from "./Types";
import {
    createElementTreeWalker,
    getLastChild,
    matchesSelector,
    shouldIgnoreFocus,
} from "./Utils";

const _focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "*[tabindex]",
    "*[contenteditable]",
].join(", ");

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

    isFocusable(
        el: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): boolean {
        if (
            matchesSelector(el, _focusableSelector) &&
            (includeProgrammaticallyFocusable || el.tabIndex !== -1)
        ) {
            return (
                (noVisibleCheck || this.isVisible(el)) &&
                (noAccessibleCheck || this.isAccessible(el))
            );
        }

        return false;
    }

    isVisible(el: HTMLElement): boolean {
        if (!el.ownerDocument) {
            return false;
        }

        if (el.offsetParent === null && el.ownerDocument.body !== el) {
            return false;
        }

        const win = el.ownerDocument.defaultView;

        if (!win) {
            return false;
        }

        const rect = el.ownerDocument.body.getBoundingClientRect();

        if (rect.width === 0 && rect.height === 0) {
            // This might happen, for example, if our <body> is in hidden <iframe>.
            return false;
        }

        const computedStyle = win.getComputedStyle(el);

        if (computedStyle.visibility === "hidden") {
            return false;
        }

        return true;
    }

    isAccessible(el: HTMLElement): boolean {
        for (let e: HTMLElement | null = el; e; e = e.parentElement) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, e);

            if (this._isHidden(e)) {
                return false;
            }

            const ignoreDisabled =
                tabsterOnElement?.focusable?.ignoreAriaDisabled;

            if (!ignoreDisabled && this._isDisabled(e)) {
                return false;
            }
        }

        return true;
    }

    private _isDisabled(el: HTMLElement): boolean {
        return el.hasAttribute("disabled");
    }

    private _isHidden(el: HTMLElement): boolean {
        const attrVal = el.getAttribute("aria-hidden");

        if (attrVal && attrVal.toLowerCase() === "true") {
            return true;
        }

        return false;
    }

    findFirst(options: Types.FindFirstProps): HTMLElement | null | undefined {
        return this.findElement({
            container: this._getBody(),
            ...options,
        });
    }

    findLast(options: Types.FindFirstProps): HTMLElement | null | undefined {
        return this.findElement({
            container: this._getBody(),
            prev: true,
            ...options,
        });
    }

    findNext(options: Types.FindNextProps): HTMLElement | null | undefined {
        return this.findElement({
            container: this._getBody(),
            ...options,
        });
    }

    findPrev(options: Types.FindNextProps): HTMLElement | null | undefined {
        return this.findElement({
            container: this._getBody(),
            prev: true,
            ...options,
        });
    }

    findDefault(options: Types.FindDefaultProps): HTMLElement | null {
        return (
            this.findElement({
                ...options,
                acceptCondition: (el) =>
                    this._tabster.focusable.isFocusable(
                        el,
                        options.includeProgrammaticallyFocusable
                    ) && !!this.getProps(el).isDefault,
            }) || null
        );
    }

    findAll(options: Types.FindAllProps): HTMLElement[] {
        const {
            container,
            acceptCondition: customAcceptCondition,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            ignoreUncontrolled,
            ignoreAccessibiliy,
            skipDefaultCheck,
        } = options;

        const acceptCondition = (el: HTMLElement): boolean => {
            let defaultCheck: boolean;
            let customCheck = false;

            if (skipDefaultCheck) {
                defaultCheck = true;
            } else {
                defaultCheck = this._tabster.focusable.isFocusable(
                    el,
                    includeProgrammaticallyFocusable
                );
            }

            if (defaultCheck) {
                customCheck = customAcceptCondition
                    ? customAcceptCondition(el)
                    : true;
            }

            return defaultCheck && customCheck;
        };

        const acceptElementState: Types.FocusableAcceptElementState = {
            container,
            from: null,
            isForward: true,
            acceptCondition,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            ignoreUncontrolled,
            ignoreAccessibiliy,
            grouppers: {},
        };

        const walker = createElementTreeWalker(
            container.ownerDocument,
            container,
            (node) =>
                this._acceptElement(node as HTMLElement, acceptElementState)
        );

        const nodeFilter = walker?.filter;

        if (!walker || !nodeFilter) {
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
        options: Types.FindFocusableProps
    ): HTMLElement | null | undefined {
        const {
            container,
            currentElement = null,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            ignoreUncontrolled,
            ignoreAccessibiliy,
            prev,
            onUncontrolled,
        } = options;

        let { acceptCondition } = options;

        if (!container) {
            return null;
        }

        if (
            !container.ownerDocument ||
            (currentElement &&
                container !== currentElement &&
                !container.contains(currentElement))
        ) {
            return null;
        }

        if (!acceptCondition) {
            acceptCondition = (el) =>
                this._tabster.focusable.isFocusable(
                    el,
                    includeProgrammaticallyFocusable,
                    ignoreAccessibiliy,
                    ignoreAccessibiliy
                );
        }

        const acceptElementState: Types.FocusableAcceptElementState = {
            container,
            from: currentElement,
            isForward: !prev,
            acceptCondition,
            includeProgrammaticallyFocusable,
            ignoreGroupper,
            ignoreUncontrolled,
            ignoreAccessibiliy,
            grouppers: {},
        };

        const walker = createElementTreeWalker(
            container.ownerDocument,
            container,
            (node) =>
                this._acceptElement(node as HTMLElement, acceptElementState)
        );

        if (!walker) {
            return null;
        }

        if (currentElement) {
            walker.currentNode = currentElement;
        } else if (prev) {
            const lastChild = getLastChild(container);

            if (!lastChild) {
                return null;
            }

            if (
                this._acceptElement(lastChild, acceptElementState) ===
                NodeFilter.FILTER_ACCEPT
            ) {
                return lastChild;
            } else {
                walker.currentNode = lastChild;
            }
        }

        let foundElement = (
            prev ? walker.previousNode() : walker.nextNode()
        ) as HTMLElement | null | undefined;

        const nextUncontrolled = acceptElementState.nextUncontrolled;
        if (nextUncontrolled) {
            if (foundElement) {
                // We have an uncontrolled area and there is a controlled element after it.
                // Return undefined for the default Tab action.
                foundElement = undefined;
            } else {
                // Otherwise, return null to moveOutWithDefaultAction().
                foundElement = null;
            }

            if (onUncontrolled) {
                onUncontrolled(nextUncontrolled);
            }
        }

        return acceptElementState.found
            ? acceptElementState.foundElement
            : foundElement;
    }

    private _acceptElement(
        element: HTMLElement,
        state: Types.FocusableAcceptElementState
    ): number {
        if (element === state.container) {
            return NodeFilter.FILTER_SKIP;
        }

        if (state.found) {
            return NodeFilter.FILTER_ACCEPT;
        }

        const ctx = (state.currentCtx = RootAPI.getTabsterContext(
            this._tabster,
            element,
            {
                allMoversGrouppers: true,
            }
        ));

        // Tabster is opt in, if it is not managed, don't try and get do anything special
        if (!ctx) {
            return NodeFilter.FILTER_SKIP;
        }

        if (state.ignoreUncontrolled) {
            if (shouldIgnoreFocus(element)) {
                return NodeFilter.FILTER_SKIP;
            }
        } else if (ctx.groupper) {
            state.nextGroupper = ctx.groupper.getElement();
        } else if (ctx.mover) {
            state.nextMover = ctx.mover.getElement();
        } else if (ctx.uncontrolled && !state.nextUncontrolled) {
            if (!ctx.groupper && !ctx.mover) {
                state.nextUncontrolled = ctx.uncontrolled;

                return NodeFilter.FILTER_REJECT;
            }
        }

        // We assume iframes are focusable because native tab behaviour would tab inside
        if (element.tagName === "IFRAME" || element.tagName === "WEBVIEW") {
            return NodeFilter.FILTER_ACCEPT;
        }

        if (!state.ignoreAccessibiliy && !this.isAccessible(element)) {
            return NodeFilter.FILTER_REJECT;
        }

        if (!state.ignoreGroupper) {
            const from = state.from;
            let fromCtx = state.fromCtx;

            if (from && !fromCtx) {
                fromCtx = state.fromCtx = RootAPI.getTabsterContext(
                    this._tabster,
                    from
                );
            }

            let groupper: Types.Groupper | undefined = ctx.groupper;
            let mover: Types.Mover | undefined = ctx.mover;
            let isGroupperFirst = ctx.isGroupperFirst;

            if (
                !state.isForward &&
                ctx.allMoversGrouppers &&
                (!fromCtx || (!fromCtx.groupper && !fromCtx.mover))
            ) {
                let topMover: Types.Mover | undefined;
                let topGroupper: Types.Groupper | undefined;

                for (const gm of ctx.allMoversGrouppers) {
                    if (!topMover && gm.isMover) {
                        topMover = gm.mover;
                    }

                    const g = !gm.isMover && gm.groupper;

                    if (g && groupper && !topGroupper && g !== groupper) {
                        const groupperElement = groupper.getElement();

                        topGroupper = g;

                        if (
                            groupperElement &&
                            g.getElement()?.contains(groupperElement)
                        ) {
                            groupper = gm.groupper;
                        }
                    }
                }

                if (topMover) {
                    mover = topMover;
                }

                if (topGroupper) {
                    groupper = topGroupper;
                }

                if (mover && groupper) {
                    const el = mover.getElement();

                    isGroupperFirst =
                        el && !groupper.getElement()?.contains(el);
                }
            }

            if (mover) {
                // Avoid falling into the nested Mover.
                const from = state.from;
                const fromCtx = from
                    ? RootAPI.getTabsterContext(this._tabster, from)
                    : undefined;
                const fromMover = fromCtx?.mover;
                const moverElement = mover.getElement();
                const fromMoverElement = fromMover?.getElement();

                if (
                    mover !== fromMover &&
                    moverElement &&
                    fromMoverElement &&
                    fromMoverElement.contains(moverElement)
                ) {
                    mover = fromMover;
                    isGroupperFirst =
                        groupper &&
                        !groupper.getElement()?.contains(fromMoverElement);
                }
            }

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

        return state.acceptCondition(element)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
    }
}
