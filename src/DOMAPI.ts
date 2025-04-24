/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DOMAPI } from "./Types";

const _createMutationObserver = (callback: MutationCallback) =>
    new MutationObserver(callback);
const _createTreeWalker = (
    doc: Document,
    root: Node,
    whatToShow?: number,
    filter?: NodeFilter | null
) => doc.createTreeWalker(root, whatToShow, filter);
const _getParentNode = (node: Node | null | undefined) =>
    node ? node.parentNode : null;
const _getParentElement = (element: HTMLElement) =>
    element ? element.parentElement : null;
const _nodeContains = (
    parent: Node | null | undefined,
    child: Node | null | undefined
) => !!(child && parent?.contains(child));
const _getActiveElement = (doc: Document) => doc.activeElement;
const _querySelector = (element: Element, selector: string) =>
    element.querySelector(selector);
const _querySelectorAll = (element: ParentNode, selector: string) =>
    Array.prototype.slice.call(element.querySelectorAll(selector), 0);
const _getElementById = (doc: Document, id: string): HTMLElement | null =>
    doc.getElementById(id);
const _getFirstChild = (node: Node | null | undefined): ChildNode | null =>
    node?.firstChild || null;
const _getLastChild = (node: Node | null | undefined): ChildNode | null =>
    node?.lastChild || null;
const _getNextSibling = (node: Node | null | undefined): ChildNode | null =>
    node?.nextSibling || null;
const _getPreviousSibling = (node: Node | null | undefined): ChildNode | null =>
    node?.previousSibling || null;
const _getFirstElementChild = (
    element: Element | null | undefined
): Element | null => element?.firstElementChild || null;
const _getLastElementChild = (
    element: Element | null | undefined
): Element | null => element?.lastElementChild || null;
const _getNextElementSibling = (
    element: Element | null | undefined
): Element | null => element?.nextElementSibling || null;
const _getPreviousElementSibling = (
    element: Element | null | undefined
): Element | null => element?.previousElementSibling || null;
const _appendChild = (parent: Node, child: Node): Node =>
    parent.appendChild(child);
const _insertBefore = (
    parent: Node,
    child: Node,
    referenceChild: Node | null
): Node => parent.insertBefore(child, referenceChild);
const _getSelection = (ref: Node): Selection | null =>
    ref.ownerDocument?.getSelection() || null;
const _getElementsByName = (referenceElement: HTMLElement, name: string) =>
    referenceElement.ownerDocument.getElementsByName(name);

export const dom: DOMAPI = {
    createMutationObserver: _createMutationObserver,
    createTreeWalker: _createTreeWalker,
    getParentNode: _getParentNode,
    getParentElement: _getParentElement,
    nodeContains: _nodeContains,
    getActiveElement: _getActiveElement,
    querySelector: _querySelector,
    querySelectorAll: _querySelectorAll,
    getElementById: _getElementById,
    getFirstChild: _getFirstChild,
    getLastChild: _getLastChild,
    getNextSibling: _getNextSibling,
    getPreviousSibling: _getPreviousSibling,
    getFirstElementChild: _getFirstElementChild,
    getLastElementChild: _getLastElementChild,
    getNextElementSibling: _getNextElementSibling,
    getPreviousElementSibling: _getPreviousElementSibling,
    appendChild: _appendChild,
    insertBefore: _insertBefore,
    getSelection: _getSelection,
    getElementsByName: _getElementsByName,
};

export function setDOMAPI(domapi: Partial<DOMAPI>) {
    for (const key of Object.keys(domapi) as (keyof DOMAPI)[]) {
        (dom[key] as (typeof domapi)[typeof key]) = domapi[key];
    }
}
