/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement } from './Instance';
import * as Types from './Types';
import { createElementTreeWalker } from './Utils';

export interface MutationEventDetails {
    root?: Types.ModalityLayerRoot;
    layer?: Types.ModalityLayerContainer;
    group?: Types.FocusableGroup;
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
        const changedRoots: { [id: string]: { removedFrom?: Node; addedTo?: Node; root: Types.ModalityLayerRoot; } } = {};
        const changedLayers: { [id: string]: { removedFrom?: Node; addedTo?: Node; layer: Types.ModalityLayerContainer; } } = {};
        const changedGroups: { [id: string]: { removedFrom?: Node; addedTo?: Node; group: Types.FocusableGroup } } = {};

        for (let mutation of mutations) {
            const removed = mutation.removedNodes;
            const added = mutation.addedNodes;

            for (let i = 0; i < removed.length; i++) {
                findTargets(removed[i], mutation.target);
            }

            for (let i = 0; i < added.length; i++) {
                findTargets(added[i], undefined, mutation.target);
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

        for (let id of Object.keys(changedLayers)) {
            const l = changedLayers[id];

            if (l.removedFrom) {
                dispatchMutationEvent(l.removedFrom, { layer: l.layer, removed: true });
            }

            if (l.addedTo) {
                dispatchMutationEvent(l.addedTo, { layer: l.layer, removed: false });
            }
        }

        for (let id of Object.keys(changedGroups)) {
            const g = changedGroups[id];

            if (g.removedFrom) {
                dispatchMutationEvent(g.removedFrom, { group: g.group, removed: true });
            }

            if (g.addedTo) {
                dispatchMutationEvent(g.addedTo, { group: g.group, removed: false });
            }
        }

        function findTargets(node: Node, removedFrom?: Node, addedTo?: Node): void {
            acceptNode(node as HTMLElement, removedFrom, addedTo);

            const walker = createElementTreeWalker(doc, node, (element: Node): number => {
                return acceptNode(element, removedFrom, addedTo);
            });

            if (walker) {
                while (walker.nextNode()) { /* Iterating for the sake of calling acceptNode callback. */ }
            }
        }

        function acceptNode(element: Node, removedFrom?: Node, addedTo?: Node): number {
            const ah = getAbilityHelpersOnElement(element);

            if (ah) {
                if (ah.modalityRoot) {
                    addRootTarget(ah.modalityRoot, removedFrom, addedTo);
                }

                if (ah.modalityLayer) {
                    addLayerTarget(ah.modalityLayer, removedFrom, addedTo);
                }

                if (ah.focusableGroup) {
                    addGroupTarget(element, ah.focusableGroup, removedFrom, addedTo);
                }
            }

            return NodeFilter.FILTER_SKIP;
        }

        function addRootTarget(root: Types.ModalityLayerRoot, removedFrom?: Node, addedTo?: Node): void {
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

        function addLayerTarget(layer: Types.ModalityLayerContainer, removedFrom?: Node, addedTo?: Node): void {
            let l = changedLayers[layer.internalId];

            if (!l) {
                l = changedLayers[layer.internalId] = { layer };
            }

            if (removedFrom) {
                l.removedFrom = removedFrom;
            }

            if (addedTo) {
                l.addedTo = addedTo;
            }
        }

        function addGroupTarget(el: Node, group: Types.FocusableGroup, removedFrom?: Node, addedTo?: Node): void {
            let g = changedGroups[group.id];

            if (!g) {
                g = changedGroups[group.id] = { group };
            }

            if (removedFrom) {
                g.removedFrom = removedFrom;
            }

            if (addedTo) {
                g.addedTo = addedTo;
            }
        }
    });

    observer.observe(doc, { childList: true, subtree: true });
}

export function dispatchMutationEvent(target: Node, details: MutationEventDetails): void {
    const event = document.createEvent('HTMLEvents') as MutationEvent;

    event.initEvent(MUTATION_EVENT_NAME, true, true);

    event.details = details;

    target.dispatchEvent(event);
}
