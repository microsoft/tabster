/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createModalizerAPI } from "../Modalizer.js";
import type * as Types from "../Types.js";

const modalizerFindNextStrategy: Types.FindNextTabbableStrategy = (
    _tabster,
    ctx,
    _container,
    currentElement,
    referenceElement,
    isBackward,
    ignoreAccessibility
) => {
    // Modalizer is the lowest-precedence dispatcher — it only claims the
    // ctx when no Mover or Groupper is present. This matches the original
    // `else if (modalizer)` ordering and keeps the strategy independent of
    // registration order.
    //
    // Modalizer is also a hard trap — when its findNextTabbable yields
    // nothing we don't escape to the parent context (unlike Mover/Groupper),
    // so the parent-fallback helper isn't needed here.
    const modalizer = ctx.modalizer;
    if (!modalizer || ctx.mover || ctx.groupper) {
        return undefined;
    }
    return modalizer.findNextTabbable(
        currentElement,
        referenceElement,
        isBackward,
        ignoreAccessibility
    );
};

/**
 * Creates a new modalizer instance or returns an existing one
 * @param tabster Tabster instance
 * @param alwaysAccessibleSelector When Modalizer is active, we put aria-hidden to
 * everything else to hide it from screen readers. This CSS selector allows to
 * exclude some elements from this behaviour.
 * @param accessibleCheck An optional callback used to exclude elements from
 * receiving aria-hidden when a Modalizer is active.
 */
export function getModalizer(
    tabster: Types.Tabster,
    // @deprecated use accessibleCheck.
    alwaysAccessibleSelector?: string,
    accessibleCheck?: Types.ModalizerElementAccessibleCheck
): Types.ModalizerAPI {
    const tabsterCore = tabster.core;

    if (!tabsterCore.modalizer) {
        const api = createModalizerAPI(
            tabsterCore,
            alwaysAccessibleSelector,
            accessibleCheck
        );
        tabsterCore.modalizer = api;
        tabsterCore.disposers.add(api);
        tabsterCore.attrHandlers.set(
            "modalizer",
            (element, existingModalizer, newProps, oldProps, sys) => {
                if (existingModalizer) {
                    if (newProps.id && oldProps?.id !== newProps.id) {
                        // Modalizer id is changed, given the modalizers have
                        // complex logic and could be composite, it is easier
                        // to recreate the Modalizer instance than to implement
                        // the id update.
                        existingModalizer.dispose();
                        return api.createModalizer(element, newProps, sys);
                    }
                    existingModalizer.setProps(newProps);
                    return existingModalizer;
                }
                return api.createModalizer(element, newProps, sys);
            }
        );
        (tabsterCore.findNextTabbableStrategies ??= []).push(
            modalizerFindNextStrategy
        );
    }

    return tabsterCore.modalizer;
}
