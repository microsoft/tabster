/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance";
import * as Types from "./Types";
import {
    createElementTreeWalker,
    getInstanceContext,
    HTMLElementWithUID,
    InstanceContext,
    WeakHTMLElement,
} from "./Utils";

export function observeMutations(
    doc: HTMLDocument,
    tabster: Types.TabsterCore,
    updateTabsterByAttribute: (
        tabster: Types.TabsterCore,
        element: HTMLElementWithUID,
        dispose?: boolean
    ) => void,
    syncState: boolean
): () => void {
    if (typeof MutationObserver === "undefined") {
        return () => {
            /* Noop */
        };
    }

    const getWindow = tabster.getWindow;

    let elementByUId: InstanceContext["elementByUId"] | undefined;

    const onMutation = (mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
            const target = mutation.target;
            const removed = mutation.removedNodes;
            const added = mutation.addedNodes;

            if (mutation.type === "attributes") {
                if (mutation.attributeName === Types.TabsterAttributeName) {
                    updateTabsterByAttribute(tabster, target as HTMLElement);
                }
            } else {
                for (let i = 0; i < removed.length; i++) {
                    updateTabsterElements(removed[i], true);
                }

                for (let i = 0; i < added.length; i++) {
                    updateTabsterElements(added[i]);
                }
            }
        }
    };

    function updateTabsterElements(node: Node, removed?: boolean): void {
        if (!elementByUId) {
            elementByUId = getInstanceContext(getWindow).elementByUId;
        }

        processNode(node as HTMLElement, removed);

        const walker = createElementTreeWalker(
            doc,
            node,
            (element: Node): number => {
                return processNode(element as HTMLElement, removed);
            }
        );

        if (walker) {
            while (walker.nextNode()) {
                /* Iterating for the sake of calling processNode() callback. */
            }
        }
    }

    function processNode(element: HTMLElement, removed?: boolean): number {
        if (!element.getAttribute) {
            // It might actually be a text node.
            return NodeFilter.FILTER_SKIP;
        }

        const uid = (element as HTMLElementWithUID).__tabsterElementUID;

        if (uid && elementByUId) {
            if (removed) {
                delete elementByUId[uid];
            } else {
                elementByUId[uid] ??= new WeakHTMLElement(getWindow, element);
            }
        }

        if (
            getTabsterOnElement(tabster, element) ||
            element.hasAttribute(Types.TabsterAttributeName)
        ) {
            updateTabsterByAttribute(tabster, element, removed);
        }

        return NodeFilter.FILTER_SKIP;
    }

    const observer = new MutationObserver(onMutation);

    if (syncState) {
        updateTabsterElements(getWindow().document.body);
    }

    observer.observe(doc, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [Types.TabsterAttributeName],
    });

    return () => {
        observer.disconnect();
    };
}
