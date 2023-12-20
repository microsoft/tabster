/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ShadowDomTreeWalker } from "./pierce-dom/ShadowDomTreeWalker/ShadowDomTreeWalker";
import { ShadowMutationObserver } from "./pierce-dom/ShadowMutationObserver/ShadowMutationObserver";
import { elementContains } from "./pierce-dom/elementContains";
import {
    getParentElement,
    getParentNode,
} from "./pierce-dom/getParentElement/getParentElement";

// const _createMutationObserver = (callback: MutationCallback) => new MutationObserver(callback);
// const _createTreeWalker = (doc: Document, root: Node, whatToShow?: number, filter?: NodeFilter | null) => doc.createTreeWalker(root, whatToShow, filter);
// const _getParentNode = (node: Node | null | undefined) => node ? node.parentNode : null;
// const _getParentElement = (element: HTMLElement) => element ? element.parentElement : null;
// const _nodeContains = (parent: Node | null | undefined, child: Node | null | undefined) => !!(child && parent?.contains(child));

const _createMutationObserver = (callback: MutationCallback) =>
    new ShadowMutationObserver(callback);
const _createTreeWalker = (
    doc: Document,
    root: Node,
    whatToShow?: number,
    filter?: NodeFilter | null
) => new ShadowDomTreeWalker(root, whatToShow, filter, doc);
const _getParentNode = (node: Node | null | undefined) => getParentNode(node);
const _getParentElement = (element: HTMLElement | null | undefined) =>
    getParentElement(element);
const _nodeContains = (
    parent: Node | null | undefined,
    child: Node | null | undefined
) => elementContains(parent, child);

export interface DOMAPI {
    createMutationObserver: (callback: MutationCallback) => MutationObserver;
    createTreeWalker(
        doc: Document,
        root: Node,
        whatToShow?: number,
        filter?: NodeFilter | null
    ): TreeWalker;
    getParentNode(node: Node | null | undefined): ParentNode | null;
    getParentElement(
        element: HTMLElement | null | undefined
    ): HTMLElement | null;
    nodeContains(
        parent: Node | null | undefined,
        child: Node | null | undefined
    ): boolean;
}

export const dom: DOMAPI = {
    createMutationObserver: _createMutationObserver,
    createTreeWalker: _createTreeWalker,
    getParentNode: _getParentNode,
    getParentElement: _getParentElement,
    nodeContains: _nodeContains,
};

export function setDOMAPI(domapi: Partial<DOMAPI>) {
    for (const key of Object.keys(domapi) as (keyof DOMAPI)[]) {
        (dom[key] as typeof domapi[typeof key]) = domapi[key];
    }
}
