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
import { dom } from "./DOMAPI";

export function observeMutations(
    doc: Document,
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
        const removedNodes = new Set<Node>();

        for (const mutation of mutations) {
            const target = mutation.target;
            const removed = mutation.removedNodes;
            const added = mutation.addedNodes;

            if (mutation.type === "attributes") {
                if (mutation.attributeName === Types.TabsterAttributeName) {
                    // removedNodes helps to make sure we are not recreating things
                    // for the removed elements.
                    // For some reason, if we do removeChild() and setAttribute() on the
                    // removed child in the same tick, both the child removal and the attribute
                    // change will be present in the mutation records. And the attribute change
                    // will follow the child removal.
                    // So, we remember the removed nodes and ignore attribute changes for them.
                    if (!removedNodes.has(target)) {
                        updateTabsterByAttribute(
                            tabster,
                            target as HTMLElement
                        );
                    }
                }
            } else {
                for (let i = 0; i < removed.length; i++) {
                    const removedNode = removed[i];
                    removedNodes.add(removedNode);
                    updateTabsterElements(removedNode, true);
                    tabster._dummyObserver.domChanged?.(target as HTMLElement);
                }

                for (let i = 0; i < added.length; i++) {
                    updateTabsterElements(added[i]);
                    tabster._dummyObserver.domChanged?.(target as HTMLElement);
                }
            }
        }

        removedNodes.clear();

        tabster.modalizer?.hiddenUpdate();
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

    const observer = dom.createMutationObserver(onMutation);

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
