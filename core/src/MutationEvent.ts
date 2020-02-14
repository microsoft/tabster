/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement } from './Instance';
import * as Types from './Types';
import { createElementTreeWalker } from './Utils';

export interface MutationEventDetails {
    root?: Types.ModalizerRoot;
    modalizer?: Types.Modalizer;
    groupper?: Types.Groupper;
    removed?: boolean;
}

export interface MutationEvent extends Event {
    details: MutationEventDetails;
}

export const MUTATION_EVENT_NAME = 'ability-helpers:mutation-event';

export function observeMutations(doc: HTMLDocument): void {
    if (typeof MutationObserver === 'undefined') {
        return;
    }

    const observer = new MutationObserver(mutations => {
        const changedRoots: { [id: string]: { removedFrom?: Node; addedTo?: Node; root: Types.ModalizerRoot; } } = {};
        const changedModalizers: { [id: string]: { removedFrom?: Node; addedTo?: Node; modalizer: Types.Modalizer; } } = {};
        const changedGrouppers: { [id: string]: { removedFrom?: Node; addedTo?: Node; groupper: Types.Groupper } } = {};

        for (let mutation of mutations) {
            const removed = mutation.removedNodes;
            const added = mutation.addedNodes;

            if (mutation.type === 'attributes') {
                if (mutation.attributeName === Types.AbilityHelpersAttributeName) {
                    acceptNode(mutation.target as HTMLElement);
                    console.error(232323, mutation);
                }
            } else {
                for (let i = 0; i < removed.length; i++) {
                    findTargets(removed[i], mutation.target);
                }

                for (let i = 0; i < added.length; i++) {
                    findTargets(added[i], undefined, mutation.target);
                }
            }
        }

        for (let id of Object.keys(changedRoots)) {
            const r = changedRoots[id];

            if (r.removedFrom) {
                dispatchMutationEvent(r.removedFrom, { root: r.root, removed: true });
            }

            if (r.addedTo) {
                dispatchMutationEvent(r.addedTo, { root: r.root, removed: false });
            }
        }

        for (let id of Object.keys(changedModalizers)) {
            const l = changedModalizers[id];

            if (l.removedFrom) {
                dispatchMutationEvent(l.removedFrom, { modalizer: l.modalizer, removed: true });
            }

            if (l.addedTo) {
                dispatchMutationEvent(l.addedTo, { modalizer: l.modalizer, removed: false });
            }
        }

        for (let id of Object.keys(changedGrouppers)) {
            const g = changedGrouppers[id];

            if (g.removedFrom && !g.addedTo) {
                dispatchMutationEvent(g.removedFrom, { groupper: g.groupper, removed: true });
            }

            if (g.addedTo) {
                dispatchMutationEvent(g.addedTo, { groupper: g.groupper, removed: false });
            }
        }

        function findTargets(node: Node, removedFrom?: Node, addedTo?: Node): void {
            acceptNode(node as HTMLElement, removedFrom, addedTo);

            const walker = createElementTreeWalker(doc, node, (element: Node): number => {
                return acceptNode(element as HTMLElement, removedFrom, addedTo);
            });

            if (walker) {
                while (walker.nextNode()) { /* Iterating for the sake of calling acceptNode callback. */ }
            }
        }

        function acceptNode(element: HTMLElement, removedFrom?: Node, addedTo?: Node): number {
            if (!element.getAttribute) {
                // It might actually be a text node.
                return NodeFilter.FILTER_SKIP;
            }

            const ah = getAbilityHelpersOnElement(element);

            if (ah) {
                if (ah.root) {
                    addRootTarget(ah.root, removedFrom, addedTo);
                }

                if (ah.modalizer) {
                    addModalizerTarget(ah.modalizer, removedFrom, addedTo);
                }

                if (ah.groupper) {
                    addGroupTarget(element, ah.groupper, removedFrom, addedTo);
                }
            } else if (element.getAttribute(Types.AbilityHelpersAttributeName)) {
                console.error(8988888, element);
            }

            return NodeFilter.FILTER_SKIP;
        }

        function addRootTarget(root: Types.ModalizerRoot, removedFrom?: Node, addedTo?: Node): void {
            let r = changedRoots[root.id];

            if (!r) {
                r = changedRoots[root.id] = { root };
            }

            if (removedFrom) {
                r.removedFrom = removedFrom;
            }

            if (addedTo) {
                r.addedTo = addedTo;
            }
        }

        function addModalizerTarget(modalizer: Types.Modalizer, removedFrom?: Node, addedTo?: Node): void {
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

        function addGroupTarget(el: Node, groupper: Types.Groupper, removedFrom?: Node, addedTo?: Node): void {
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
    });

    observer.observe(doc, { childList: true, subtree: true, attributeFilter: [Types.AbilityHelpersAttributeName] });
}

export function dispatchMutationEvent(target: Node, details: MutationEventDetails): void {
    const event = document.createEvent('HTMLEvents') as MutationEvent;

    event.initEvent(MUTATION_EVENT_NAME, true, true);

    event.details = details;

    target.dispatchEvent(event);
}
