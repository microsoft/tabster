/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { RootAPI } from "./Root.js";
import { _isElementVisible } from "./Focusable.js";
import { getTabsterOnElement } from "./Instance.js";
import type * as Types from "./Types.js";

/**
 * Walks up the DOM ancestors of `element`, collecting the nearest enclosing
 * Mover/Groupper/Modalizer/Root and related state. Imported by ~30 internal
 * call sites. Lives in its own module so importers don't pull the entire
 * RootAPI class definition along for the ride.
 */
export function getTabsterContext(
    tabster: Types.TabsterCore,
    element: Node,
    options: Types.GetTabsterContextOptions = {}
): Types.TabsterContext | undefined {
    if (!element.ownerDocument) {
        return undefined;
    }

    const { checkRtl, referenceElement } = options;

    const getParent = tabster.getParent;

    // Normally, the initialization starts on the next tick after the tabster
    // instance creation. However, if the application starts using it before
    // the next tick, we need to make sure the initialization is done.
    tabster.drainInitQueue();

    let root: Types.Root | undefined;
    let modalizer: Types.Modalizer | undefined;
    let groupper: Types.Groupper | undefined;
    let mover: Types.Mover | undefined;
    let excludedFromMover = false;
    let groupperBeforeMover: boolean | undefined;
    let modalizerInGroupper: Types.Groupper | undefined;
    let dirRightToLeft: boolean | undefined;
    let uncontrolled: HTMLElement | null | undefined;
    let curElement: Node | null = referenceElement || element;
    const ignoreKeydown: Types.FocusableProps["ignoreKeydown"] = {};

    while (curElement && (!root || checkRtl)) {
        const tabsterOnElement = getTabsterOnElement(
            tabster,
            curElement as HTMLElement
        );

        if (checkRtl && dirRightToLeft === undefined) {
            const dir = (curElement as HTMLElement).dir;

            if (dir) {
                dirRightToLeft = dir.toLowerCase() === "rtl";
            }
        }

        if (!tabsterOnElement) {
            curElement = getParent(curElement);
            continue;
        }

        const tagName = (curElement as HTMLElement).tagName;

        if (
            (tabsterOnElement.uncontrolled ||
                tagName === "IFRAME" ||
                tagName === "WEBVIEW") &&
            _isElementVisible(curElement as HTMLElement)
        ) {
            uncontrolled = curElement as HTMLElement;
        }

        if (
            !mover &&
            tabsterOnElement.focusable?.excludeFromMover &&
            !groupper
        ) {
            excludedFromMover = true;
        }

        const curModalizer = tabsterOnElement.modalizer;
        const curGroupper = tabsterOnElement.groupper;
        const curMover = tabsterOnElement.mover;

        if (!modalizer && curModalizer) {
            modalizer = curModalizer;
        }

        if (!groupper && curGroupper && (!modalizer || curModalizer)) {
            if (modalizer) {
                // Modalizer dominates the groupper when they are on the same node and the groupper is active.
                if (
                    !curGroupper.isActive() &&
                    curGroupper.getProps().tabbability &&
                    modalizer.userId !== tabster.modalizer?.activeId
                ) {
                    modalizer = undefined;
                    groupper = curGroupper;
                }

                modalizerInGroupper = curGroupper;
            } else {
                groupper = curGroupper;
            }
        }

        if (
            !mover &&
            curMover &&
            (!modalizer || curModalizer) &&
            (!curGroupper || curElement !== element) &&
            curElement.contains(element) // Mover makes sense only for really inside elements, not for virutal out of the DOM order children.
        ) {
            mover = curMover;
            groupperBeforeMover = !!groupper && groupper !== curGroupper;
        }

        if (tabsterOnElement.root) {
            root = tabsterOnElement.root;
        }

        if (tabsterOnElement.focusable?.ignoreKeydown) {
            Object.assign(
                ignoreKeydown,
                tabsterOnElement.focusable.ignoreKeydown
            );
        }

        curElement = getParent(curElement);
    }

    // No root element could be found, try to get an auto root
    if (!root) {
        const rootAPI = tabster.root as RootAPI;
        const autoRoot = rootAPI._autoRoot;

        if (autoRoot) {
            if (element.ownerDocument?.body) {
                root = rootAPI._autoRootCreate();
            }
        }
    }

    if (groupper && !mover) {
        groupperBeforeMover = true;
    }

    if (__DEV__ && !root) {
        if (modalizer || groupper || mover) {
            console.error(
                "Tabster Root is required for Mover, Groupper and Modalizer to work."
            );
        }
    }

    const shouldIgnoreKeydown = (event: KeyboardEvent) =>
        !!ignoreKeydown[
            event.key as keyof Types.FocusableProps["ignoreKeydown"]
        ];

    return root
        ? {
              root,
              modalizer,
              groupper,
              mover,
              groupperBeforeMover,
              modalizerInGroupper,
              rtl: checkRtl ? !!dirRightToLeft : undefined,
              uncontrolled,
              excludedFromMover,
              ignoreKeydown: shouldIgnoreKeydown,
          }
        : undefined;
}

/**
 * Walks up the ancestors of `element` returning the nearest enclosing Root.
 */
export function getRoot(
    tabster: Types.TabsterCore,
    element: HTMLElement
): Types.Root | undefined {
    const getParent = tabster.getParent;

    for (
        let el = element as HTMLElement | null;
        el;
        el = getParent(el) as HTMLElement | null
    ) {
        const root = getTabsterOnElement(tabster, el)?.root;

        if (root) {
            return root;
        }
    }

    return undefined;
}
