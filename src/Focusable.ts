/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance.js";
import { getTabsterContext } from "./Context.js";
import type * as Types from "./Types.js";
import { FOCUSABLE_SELECTOR } from "./Consts.js";
import { getDummyInputContainer } from "./DummyInput.js";
import {
    createElementTreeWalker,
    getLastChild,
    getRadioButtonGroup,
    isDisplayNone,
    isRadio,
    matchesSelector,
    shouldIgnoreFocus,
} from "./Utils.js";
import { dom } from "./DOMAPI.js";

// Internal helpers — take TabsterCore. Used by other modules in src/ that
// hold a TabsterCore but no Tabster wrapper. Not re-exported from index.ts.

export function _getFocusableProps(
    core: Types.TabsterCore,
    element: HTMLElement
): Types.FocusableProps {
    const tabsterOnElement = getTabsterOnElement(core, element);
    return (tabsterOnElement && tabsterOnElement.focusable) || {};
}

export function _isFocusable(
    core: Types.TabsterCore,
    el: HTMLElement,
    includeProgrammaticallyFocusable?: boolean,
    noVisibleCheck?: boolean,
    noAccessibleCheck?: boolean
): boolean {
    if (
        matchesSelector(el, FOCUSABLE_SELECTOR) &&
        (includeProgrammaticallyFocusable || el.tabIndex !== -1)
    ) {
        return (
            (noVisibleCheck || _isElementVisible(el)) &&
            (noAccessibleCheck || _isElementAccessible(core, el))
        );
    }

    return false;
}

export function _isElementVisible(el: HTMLElement): boolean {
    if (!el.ownerDocument || el.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }

    if (isDisplayNone(el)) {
        return false;
    }

    const rect = el.ownerDocument.body.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
        // This might happen, for example, if our <body> is in hidden <iframe>.
        return false;
    }

    return true;
}

export function _isElementAccessible(
    core: Types.TabsterCore,
    el: HTMLElement
): boolean {
    for (let e: HTMLElement | null = el; e; e = dom.getParentElement(e)) {
        const tabsterOnElement = getTabsterOnElement(core, e);

        if (_isHidden(core, e)) {
            return false;
        }

        const ignoreDisabled = tabsterOnElement?.focusable?.ignoreAriaDisabled;

        if (!ignoreDisabled && e.hasAttribute("disabled")) {
            return false;
        }
    }

    return true;
}

function _isHidden(core: Types.TabsterCore, el: HTMLElement): boolean {
    const attrVal = el.getAttribute("aria-hidden");

    if (attrVal && attrVal.toLowerCase() === "true") {
        if (!core.modalizer?.isAugmented(el)) {
            return true;
        }
    }

    return false;
}

export function _findFocusable(
    core: Types.TabsterCore,
    options: Types.FindFocusableProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null | undefined {
    const found = _findElements(core, false, options, out);
    return found ? found[0] : found;
}

export function _findAllFocusable(
    core: Types.TabsterCore,
    options: Types.FindAllProps
): HTMLElement[] {
    return _findElements(core, true, options) || [];
}

export function _findDefaultFocusable(
    core: Types.TabsterCore,
    options: Types.FindDefaultProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null {
    return (
        _findFocusable(
            core,
            {
                ...options,
                acceptCondition: (el) =>
                    _isFocusable(
                        core,
                        el,
                        options.includeProgrammaticallyFocusable
                    ) && !!_getFocusableProps(core, el).isDefault,
            },
            out
        ) || null
    );
}

function _findElements(
    core: Types.TabsterCore,
    isFindAll: boolean,
    options: Types.FindFocusableProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement[] | null | undefined {
    const {
        container,
        currentElement = null,
        includeProgrammaticallyFocusable,
        useActiveModalizer,
        ignoreAccessibility,
        modalizerId,
        isBackward,
        onElement,
    } = options;

    if (!out) {
        out = {};
    }

    const elements: HTMLElement[] = [];

    let { acceptCondition } = options;
    const hasCustomCondition = !!acceptCondition;

    if (!container) {
        return null;
    }

    if (!acceptCondition) {
        acceptCondition = (el) =>
            _isFocusable(
                core,
                el,
                includeProgrammaticallyFocusable,
                false,
                ignoreAccessibility
            );
    }

    const acceptElementState: Types.FocusableAcceptElementState = {
        container,
        modalizerUserId:
            modalizerId === undefined && useActiveModalizer
                ? core.modalizer?.activeId
                : modalizerId ||
                  getTabsterContext(core, container)?.modalizer?.userId,
        from: currentElement || container,
        isBackward,
        isFindAll,
        acceptCondition,
        hasCustomCondition,
        includeProgrammaticallyFocusable,
        ignoreAccessibility,
        cachedGrouppers: {},
        cachedRadioGroups: {},
    };

    const walker = createElementTreeWalker(
        container.ownerDocument,
        container,
        (node) => _acceptElement(core, node as HTMLElement, acceptElementState)
    );

    if (!walker) {
        return null;
    }

    const prepareForNextElement = (
        shouldContinueIfNotFound?: boolean
    ): boolean => {
        const foundElement =
            acceptElementState.foundElement ?? acceptElementState.foundBackward;

        if (foundElement) {
            elements.push(foundElement);
        }

        if (isFindAll) {
            if (foundElement) {
                acceptElementState.found = false;
                delete acceptElementState.foundElement;
                delete acceptElementState.foundBackward;
                delete acceptElementState.fromCtx;
                acceptElementState.from = foundElement;

                if (onElement && !onElement(foundElement)) {
                    return false;
                }
            }

            return !!(foundElement || shouldContinueIfNotFound);
        } else {
            if (foundElement && out) {
                out.uncontrolled = getTabsterContext(
                    core,
                    foundElement
                )?.uncontrolled;
            }

            return !!(shouldContinueIfNotFound && !foundElement);
        }
    };

    if (!currentElement) {
        out.outOfDOMOrder = true;
    }

    if (currentElement && dom.nodeContains(container, currentElement)) {
        walker.currentNode = currentElement;
    } else if (isBackward) {
        const lastChild = getLastChild(container);

        if (!lastChild) {
            return null;
        }

        if (
            _acceptElement(core, lastChild, acceptElementState) ===
                NodeFilter.FILTER_ACCEPT &&
            !prepareForNextElement(true)
        ) {
            if (acceptElementState.skippedFocusable) {
                out.outOfDOMOrder = true;
            }

            return elements;
        }

        walker.currentNode = lastChild;
    }

    do {
        if (isBackward) {
            walker.previousNode();
        } else {
            walker.nextNode();
        }
    } while (prepareForNextElement());

    if (acceptElementState.skippedFocusable) {
        out.outOfDOMOrder = true;
    }

    return elements.length ? elements : null;
}

function _acceptElement(
    core: Types.TabsterCore,
    element: HTMLElement,
    state: Types.FocusableAcceptElementState
): number {
    if (state.found) {
        return NodeFilter.FILTER_ACCEPT;
    }

    const foundBackward = state.foundBackward;

    if (
        foundBackward &&
        (element === foundBackward || !dom.nodeContains(foundBackward, element))
    ) {
        state.found = true;
        state.foundElement = foundBackward;
        return NodeFilter.FILTER_ACCEPT;
    }

    const container = state.container;

    if (element === container) {
        return NodeFilter.FILTER_SKIP;
    }

    if (!dom.nodeContains(container, element)) {
        return NodeFilter.FILTER_REJECT;
    }

    if (getDummyInputContainer(element)) {
        return NodeFilter.FILTER_REJECT;
    }

    if (dom.nodeContains(state.rejectElementsFrom, element)) {
        return NodeFilter.FILTER_REJECT;
    }

    const ctx = (state.currentCtx = getTabsterContext(core, element));

    // Tabster is opt in, if it is not managed, don't try and get do anything special
    if (!ctx) {
        return NodeFilter.FILTER_SKIP;
    }

    if (shouldIgnoreFocus(element)) {
        if (_isFocusable(core, element, undefined, true, true)) {
            state.skippedFocusable = true;
        }

        return NodeFilter.FILTER_SKIP;
    }

    // We assume iframes are focusable because native tab behaviour would tab inside.
    // But we do it only during the standard search when there is no custom accept
    // element condition.
    if (
        !state.hasCustomCondition &&
        (element.tagName === "IFRAME" || element.tagName === "WEBVIEW")
    ) {
        if (
            _isElementVisible(element) &&
            ctx.modalizer?.userId === core.modalizer?.activeId
        ) {
            state.found = true;
            state.rejectElementsFrom = state.foundElement = element;

            return NodeFilter.FILTER_ACCEPT;
        } else {
            return NodeFilter.FILTER_REJECT;
        }
    }

    if (!state.ignoreAccessibility && !_isElementAccessible(core, element)) {
        if (_isFocusable(core, element, false, true, true)) {
            state.skippedFocusable = true;
        }

        return NodeFilter.FILTER_REJECT;
    }

    let result: number | undefined;

    let fromCtx = state.fromCtx;

    if (!fromCtx) {
        fromCtx = state.fromCtx = getTabsterContext(core, state.from);
    }

    const fromMover = fromCtx?.mover;
    let groupper = ctx.groupper;
    let mover = ctx.mover;

    result = core.modalizer?.acceptElement(element, state);

    if (result !== undefined) {
        state.skippedFocusable = true;
    }

    if (result === undefined && (groupper || mover || fromMover)) {
        const groupperElement = groupper?.getElement();
        const fromMoverElement = fromMover?.getElement();
        let moverElement = mover?.getElement();

        if (
            moverElement &&
            dom.nodeContains(fromMoverElement, moverElement) &&
            dom.nodeContains(container, fromMoverElement) &&
            (!groupperElement ||
                !mover ||
                dom.nodeContains(fromMoverElement, groupperElement))
        ) {
            mover = fromMover;
            moverElement = fromMoverElement;
        }

        if (groupperElement) {
            if (
                groupperElement === container ||
                !dom.nodeContains(container, groupperElement)
            ) {
                groupper = undefined;
            } else if (!dom.nodeContains(groupperElement, element)) {
                // _acceptElement() callback is called during the tree walking.
                // Given the potentiality of virtual parents (driven by the custom getParent() function),
                // we need to make sure that the groupper from the current element's context is not,
                // portaling us out of the DOM order.
                return NodeFilter.FILTER_REJECT;
            }
        }

        if (moverElement) {
            if (!dom.nodeContains(container, moverElement)) {
                mover = undefined;
            } else if (!dom.nodeContains(moverElement, element)) {
                // _acceptElement() callback is called during the tree walking.
                // Given the potentiality of virtual parents (driven by the custom getParent() function),
                // we need to make sure that the mover from the current element's context is not,
                // portaling us out of the DOM order.
                return NodeFilter.FILTER_REJECT;
            }
        }

        if (groupper && mover) {
            if (
                moverElement &&
                groupperElement &&
                !dom.nodeContains(groupperElement, moverElement)
            ) {
                mover = undefined;
            } else {
                groupper = undefined;
            }
        }

        if (groupper) {
            result = groupper.acceptElement(element, state);
        }

        if (mover) {
            result = mover.acceptElement(element, state);
        }
    }

    if (result === undefined) {
        result = state.acceptCondition(element)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;

        if (
            result === NodeFilter.FILTER_SKIP &&
            _isFocusable(core, element, false, true, true)
        ) {
            state.skippedFocusable = true;
        }
    }

    if (result === NodeFilter.FILTER_ACCEPT && !state.found) {
        if (
            !state.isFindAll &&
            isRadio(element) &&
            !(element as HTMLInputElement).checked
        ) {
            // We need to mimic the browser's behaviour to skip unchecked radio buttons.
            const radioGroupName = (element as HTMLInputElement).name;
            let radioGroup: Types.RadioButtonGroup | undefined =
                state.cachedRadioGroups[radioGroupName];

            if (!radioGroup) {
                radioGroup = getRadioButtonGroup(element);

                if (radioGroup) {
                    state.cachedRadioGroups[radioGroupName] = radioGroup;
                }
            }

            if (radioGroup?.checked && radioGroup.checked !== element) {
                // Currently found element is a radio button in a group that has another radio button checked.
                return NodeFilter.FILTER_SKIP;
            }
        }

        if (state.isBackward) {
            // When TreeWalker goes backwards, it visits the container first,
            // then it goes inside. So, if the container is accepted, we remember it,
            // but allowing the TreeWalker to check inside.
            state.foundBackward = element;
            result = NodeFilter.FILTER_SKIP;
        } else {
            state.found = true;
            state.foundElement = element;
        }
    }

    return result;
}

// Public API — takes Tabster wrapper. Re-exported from index.ts.

export function getFocusableProps(
    tabster: Types.Tabster,
    element: HTMLElement
): Types.FocusableProps {
    return _getFocusableProps(tabster.core, element);
}

export function isFocusable(
    tabster: Types.Tabster,
    el: HTMLElement,
    includeProgrammaticallyFocusable?: boolean,
    noVisibleCheck?: boolean,
    noAccessibleCheck?: boolean
): boolean {
    return _isFocusable(
        tabster.core,
        el,
        includeProgrammaticallyFocusable,
        noVisibleCheck,
        noAccessibleCheck
    );
}

export function isElementVisible(
    _tabster: Types.Tabster,
    el: HTMLElement
): boolean {
    return _isElementVisible(el);
}

export function isElementAccessible(
    tabster: Types.Tabster,
    el: HTMLElement
): boolean {
    return _isElementAccessible(tabster.core, el);
}

export function findFirstFocusable(
    tabster: Types.Tabster,
    options: Types.FindFirstProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null | undefined {
    return _findFocusable(tabster.core, { ...options }, out);
}

export function findLastFocusable(
    tabster: Types.Tabster,
    options: Types.FindFirstProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null | undefined {
    return _findFocusable(tabster.core, { isBackward: true, ...options }, out);
}

export function findNextFocusable(
    tabster: Types.Tabster,
    options: Types.FindNextProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null | undefined {
    return _findFocusable(tabster.core, { ...options }, out);
}

export function findPrevFocusable(
    tabster: Types.Tabster,
    options: Types.FindNextProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null | undefined {
    return _findFocusable(tabster.core, { ...options, isBackward: true }, out);
}

export function findDefaultFocusable(
    tabster: Types.Tabster,
    options: Types.FindDefaultProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null {
    return _findDefaultFocusable(tabster.core, options, out);
}

export function findAllFocusable(
    tabster: Types.Tabster,
    options: Types.FindAllProps
): HTMLElement[] {
    return _findAllFocusable(tabster.core, options);
}

export function findFocusable(
    tabster: Types.Tabster,
    options: Types.FindFocusableProps,
    out?: Types.FindFocusableOutputProps
): HTMLElement | null | undefined {
    return _findFocusable(tabster.core, options, out);
}
