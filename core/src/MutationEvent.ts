/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from './Instance';
import * as Types from './Types';
import { createElementTreeWalker, elementByUId, getElementUId, HTMLElementWithUID, WeakHTMLElement } from './Utils';

export interface MutationEventDetails {
    root?: Types.Root;
    modalizer?: Types.Modalizer;
    uberGroupper?: Types.UberGroupper;
    groupper?: Types.Groupper;
    observed?: HTMLElement;
    removed?: boolean;
    isMutation?: boolean;
}

export interface MutationEvent extends Event {
    details: MutationEventDetails;
}

export const MUTATION_EVENT_NAME = 'tabster:mutation-event';

export function observeMutations(
    doc: HTMLDocument,
    tabster: Types.TabsterCore,
    updateTabsterByAttribute: (tabster: Types.TabsterCore, element: HTMLElementWithUID) => void
): () => void {
    if (typeof MutationObserver === 'undefined') {
        return () => { /* Noop */ };
    }

    let observer = new MutationObserver(mutations => {
        const changedRoots: { [id: string]: { removedFrom?: Document; addedTo?: Node; root: Types.Root; } } = {};
        const changedModalizers: { [id: string]: { removedFrom?: Document; addedTo?: Node; modalizer: Types.Modalizer; } } = {};
        const changedGrouppers: { [id: string]: { removedFrom?: Document; addedTo?: Node; groupper: Types.Groupper } } = {};
        const changedObservedElements: { [id: string]: { removedFrom?: Document; addedTo?: Node; element: HTMLElement } } = {};

        for (let mutation of mutations) {
            const target = mutation.target;
            const removed = mutation.removedNodes;
            const added = mutation.addedNodes;

            if (mutation.type === 'attributes') {
                if (mutation.attributeName === Types.TabsterAttributeName) {
                    const uid = (target as HTMLElementWithUID).__tabsterElementUID;

                    const tabsterAttr = uid ? (tabster as unknown as Types.TabsterInternal).storageEntry(uid)?.attr : undefined;

                    if (!tabsterAttr || !tabsterAttr.changing) {
                        updateTabsterByAttribute(tabster, target as HTMLElement);
                    }
                }
            } else {
                const tabsterOnElement = getTabsterOnElement(tabster, target);
                const root = tabsterOnElement && tabsterOnElement.root;

                if (root) {
                    changedRoots[root.uid] = { root, addedTo: target };
                }

                for (let i = 0; i < removed.length; i++) {
                    findTargets(removed[i], target.ownerDocument || doc);
                }

                for (let i = 0; i < added.length; i++) {
                    findTargets(added[i], undefined, target);
                }
            }
        }

        for (let id of Object.keys(changedRoots)) {
            const r = changedRoots[id];

            if (r.removedFrom) {
                dispatchMutationEvent(r.removedFrom, { root: r.root, removed: true, isMutation: true });
            }

            if (r.addedTo) {
                dispatchMutationEvent(r.addedTo, { root: r.root, removed: false, isMutation: true });
            }
        }

        for (let id of Object.keys(changedModalizers)) {
            const l = changedModalizers[id];

            if (l.removedFrom) {
                dispatchMutationEvent(l.removedFrom, { modalizer: l.modalizer, removed: true, isMutation: true });
            }

            if (l.addedTo) {
                dispatchMutationEvent(l.addedTo, { modalizer: l.modalizer, removed: false, isMutation: true });
            }
        }

        for (let id of Object.keys(changedGrouppers)) {
            const g = changedGrouppers[id];

            if (g.removedFrom && !g.addedTo) {
                dispatchMutationEvent(g.removedFrom, { groupper: g.groupper, removed: true, isMutation: true });
            }

            if (g.addedTo) {
                dispatchMutationEvent(g.addedTo, { groupper: g.groupper, removed: false, isMutation: true });
            }
        }

        for (let id of Object.keys(changedObservedElements)) {
            const e = changedObservedElements[id];

            if (e.removedFrom && !e.addedTo) {
                dispatchMutationEvent(e.removedFrom, { observed: e.element, removed: true, isMutation: true });
            }

            if (e.addedTo) {
                dispatchMutationEvent(e.addedTo, { observed: e.element, removed: false, isMutation: true });
            }
        }

        function findTargets(node: Node, removedFrom?: Document, addedTo?: Node): void {
            acceptNode(node as HTMLElement, removedFrom, addedTo);

            const walker = createElementTreeWalker(doc, node, (element: Node): number => {
                return acceptNode(element as HTMLElement, removedFrom, addedTo);
            });

            if (walker) {
                while (walker.nextNode()) { /* Iterating for the sake of calling acceptNode callback. */ }
            }
        }

        function acceptNode(element: HTMLElement, removedFrom?: Document, addedTo?: Node): number {
            if (!element.getAttribute) {
                // It might actually be a text node.
                return NodeFilter.FILTER_SKIP;
            }

            const uid = (element as HTMLElementWithUID).__tabsterElementUID;

            if (uid) {
                if (removedFrom) {
                    delete elementByUId[uid];
                } else if (addedTo) {
                    elementByUId[uid] = new WeakHTMLElement(element);
                }
            }

            const tabsterOnElement = getTabsterOnElement(tabster, element);

            if (tabsterOnElement) {
                if (tabsterOnElement.root) {
                    addRootTarget(tabsterOnElement.root, removedFrom, addedTo);
                }

                if (tabsterOnElement.modalizer) {
                    addModalizerTarget(tabsterOnElement.modalizer, removedFrom, addedTo);
                }

                if (tabsterOnElement.groupper) {
                    addGroupTarget(element, tabsterOnElement.groupper, removedFrom, addedTo);
                }

                if (tabsterOnElement.observed) {
                    addObservedElementTarget(element, removedFrom, addedTo);
                }
            } else if (element.getAttribute(Types.TabsterAttributeName)) {
                updateTabsterByAttribute(tabster, element);
            }

            return NodeFilter.FILTER_SKIP;
        }

        function addRootTarget(root: Types.Root, removedFrom?: Document, addedTo?: Node): void {
            let r = changedRoots[root.uid];

            if (!r) {
                r = changedRoots[root.uid] = { root };
            }

            if (removedFrom) {
                r.removedFrom = removedFrom;
            }

            if (addedTo) {
                r.addedTo = addedTo;
            }
        }

        function addModalizerTarget(modalizer: Types.Modalizer, removedFrom?: Document, addedTo?: Node): void {
            let m = changedModalizers[modalizer.internalId];

            if (!m) {
                m = changedModalizers[modalizer.internalId] = { modalizer };
            }

            if (removedFrom) {
                m.removedFrom = removedFrom;
            }

            if (addedTo) {
                m.addedTo = addedTo;
            }
        }

        function addGroupTarget(el: Node, groupper: Types.Groupper, removedFrom?: Document, addedTo?: Node): void {
            let g = changedGrouppers[groupper.id];

            if (!g) {
                g = changedGrouppers[groupper.id] = { groupper };
            }

            if (removedFrom) {
                g.removedFrom = removedFrom;
            }

            if (addedTo) {
                g.addedTo = addedTo;
            }
        }

        function addObservedElementTarget(element: HTMLElement, removedFrom?: Document, addedTo?: Node): void {
            if (!doc.defaultView) {
                return;
            }

            const uid = getElementUId(element, doc.defaultView);
            let e = changedObservedElements[uid];

            if (!e) {
                e = changedObservedElements[uid] = { element };
            }

            if (removedFrom) {
                e.removedFrom = removedFrom;
            }

            if (addedTo) {
                e.addedTo = addedTo;
            }
        }
    });

    observer.observe(doc, { childList: true, subtree: true, attributes: true, attributeFilter: [Types.TabsterAttributeName] });

    return () => {
        observer.disconnect();
    };
}

export function dispatchMutationEvent(target: Node, details: MutationEventDetails): void {
    const event = document.createEvent('HTMLEvents') as MutationEvent;

    event.initEvent(MUTATION_EVENT_NAME, true, true);

    event.details = details;

    target.dispatchEvent(event);
}
