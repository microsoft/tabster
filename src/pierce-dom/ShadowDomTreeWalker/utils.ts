/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { ShadowRootOrSlot } from "./types";

export const hasShadowRoot = (node: Node): boolean => {
    return (node as HTMLElement).shadowRoot !== null;
};

export const hasSlottedChildren = (node: Node): boolean => {
    return (
        typeof (node as HTMLSlotElement).assignedElements === "function" &&
        (node as HTMLSlotElement).assignedNodes().length > 0
    );
};

export const isSlotted = (node: Node): boolean => {
    return (node as HTMLElement).assignedSlot !== null;
};

export const maybeHandleShadowRootOrSlot = (node: Node): ShadowRootOrSlot => {
    if (hasShadowRoot(node)) {
        const shadowRoot = (node as HTMLElement).shadowRoot;
        if (shadowRoot?.firstChild) {
            return { node: shadowRoot, type: "shadow" };
        }
    } else if (hasSlottedChildren(node)) {
        return { node, type: "slot" };
    }

    return { node, type: "light" };
};

export const dfs = (root: Node, visit: (node: Node) => boolean) => {
    const stack =
        typeof (root as HTMLSlotElement).assignedNodes === "function"
            ? [...(root as HTMLSlotElement).assignedNodes()]
            : [root];

    while (stack.length) {
        const node = stack.pop() as Node;

        if (!hasShadowRoot(node)) {
            const childNodes = node.hasChildNodes()
                ? node.childNodes
                : typeof (node as HTMLSlotElement).assignedNodes === "function"
                ? (node as HTMLSlotElement).assignedNodes()
                : null;

            if (childNodes) {
                let i = childNodes.length - 1;
                while (i > -1) {
                    const child = childNodes[i];
                    stack.push(child);

                    i--;
                }
            }
        }

        visit(node);
    }
};
