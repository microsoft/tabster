/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from './Instance';
import * as Types from './Types';
import {
    createElementTreeWalker,
    getInstanceContext,
    HTMLElementWithUID,
    InstanceContext,
    WeakHTMLElement
} from './Utils';

export interface MutationEventDetails {
    root?: Types.Root;
    modalizer?: Types.Modalizer;
    groupper?: Types.Groupper;
    observed?: HTMLElement;
    removed?: boolean;
    isMutation?: boolean;
}

export function observeMutations(
    doc: HTMLDocument,
    tabster: Types.TabsterInternal,
    updateTabsterByAttribute: (tabster: Types.TabsterCore, element: HTMLElementWithUID, dispose?: boolean) => void
): () => void {
    if (typeof MutationObserver === 'undefined') {
        return () => { /* Noop */ };
    }

    let observer = new MutationObserver(mutations => {
        const getWindow = tabster.getWindow;
        let elementByUId: InstanceContext['elementByUId'] | undefined;

        for (let mutation of mutations) {
            const target = mutation.target;
            const removed = mutation.removedNodes;
            const added = mutation.addedNodes;

            if (mutation.type === 'attributes') {
                if (mutation.attributeName === Types.TabsterAttributeName) {
                    updateTabsterByAttribute(tabster, target as HTMLElement);
                }
            } else {
                for (let i = 0; i < removed.length; i++) {
                    updateTabsterElements(removed[i], target.ownerDocument || doc);
                }

                for (let i = 0; i < added.length; i++) {
                    updateTabsterElements(added[i], undefined, target);
                }
            }
        }

        function updateTabsterElements(node: Node, removedFrom?: Document, addedTo?: Node): void {
            if (!elementByUId) {
                elementByUId = getInstanceContext(getWindow).elementByUId;
            }

            processNode(node as HTMLElement, removedFrom, addedTo);

            const walker = createElementTreeWalker(doc, node, (element: Node): number => {
                return processNode(element as HTMLElement, removedFrom, addedTo);
            });

            if (walker) {
                while (walker.nextNode()) { /* Iterating for the sake of calling processNode() callback. */ }
            }
        }

        function processNode(element: HTMLElement, removedFrom?: Document, addedTo?: Node): number {
            if (!element.getAttribute) {
                // It might actually be a text node.
                return NodeFilter.FILTER_SKIP;
            }

            const uid = (element as HTMLElementWithUID).__tabsterElementUID;

            if (uid) {
                if (removedFrom) {
                    delete elementByUId!!![uid];
                } else if (addedTo) {
                    elementByUId!!![uid] = new WeakHTMLElement(getWindow, element);
                }
            }

            if (getTabsterOnElement(tabster, element) || element.hasAttribute(Types.TabsterAttributeName)) {
                updateTabsterByAttribute(tabster, element, !!removedFrom);
            }

            return NodeFilter.FILTER_SKIP;
        }
    });

    observer.observe(doc, { childList: true, subtree: true, attributes: true, attributeFilter: [Types.TabsterAttributeName] });

    return () => {
        observer.disconnect();
    };
}
