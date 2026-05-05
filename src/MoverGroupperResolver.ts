/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type * as Types from "./Types.js";
import { dom } from "./DOMAPI.js";
import { getTabsterContext } from "./Context.js";

/**
 * Resolves which mover/groupper actually applies to `element` given the
 * current and from-element contexts, then dispatches to the chosen feature's
 * `acceptElement`. Extracted from `Focusable._acceptElement` so it only
 * enters the bundle once `getMover` or `getGroupper` is called — the
 * always-on Focusable path skips this work entirely when neither feature
 * is loaded.
 *
 * Returns `NodeFilter.FILTER_REJECT` (a virtual-parent containment violation),
 * the result of the chosen feature's `acceptElement`, or `undefined` if no
 * mover/groupper applies and the caller should fall through to its default
 * acceptance check.
 */
export const resolveMoverGroupperContext: Types.FocusableContextResolver = (
    core,
    element,
    container,
    state,
    ctx
) => {
    let fromCtx = state.fromCtx;
    if (!fromCtx) {
        fromCtx = state.fromCtx = getTabsterContext(core, state.from);
    }

    const fromMover = fromCtx?.mover;
    let groupper = ctx.groupper;
    let mover = ctx.mover;

    if (!groupper && !mover && !fromMover) {
        return undefined;
    }

    const groupperElement = groupper?.getElement();
    const fromMoverElement = fromMover?.getElement();
    let moverElement = mover?.getElement();

    if (
        moverElement &&
        dom.nodeContains(fromMoverElement, moverElement) &&
        dom.nodeContains(container, fromMoverElement) &&
        (!groupperElement ||
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
            // Given the potentiality of virtual parents (driven by the custom
            // getParent() function), we need to make sure that the groupper
            // from the current element's context is not portaling us out of
            // the DOM order.
            return NodeFilter.FILTER_REJECT;
        }
    }

    if (moverElement) {
        if (!dom.nodeContains(container, moverElement)) {
            mover = undefined;
        } else if (!dom.nodeContains(moverElement, element)) {
            return NodeFilter.FILTER_REJECT;
        }
    }

    if (groupper && mover) {
        if (!dom.nodeContains(groupperElement, moverElement)) {
            mover = undefined;
        } else {
            groupper = undefined;
        }
    }

    let result: number | undefined;

    if (groupper) {
        result = groupper.acceptElement(element, state);
    }

    if (mover) {
        result = mover.acceptElement(element, state);
    }

    return result;
};
