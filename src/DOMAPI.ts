/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { MyTreeWalker } from "./pierce-dom/ShadowDomTreeWalker/ShadowDomTreeWalker";
import { ShadowMutationObserver } from "./pierce-dom/ShadowMutationObserver/ShadowMutationObserver";
import { elementContains } from "./pierce-dom/elementContains";
import { getActiveElement } from "./pierce-dom/getActiveElement/getActiveElement";
import {
    getParentElement,
    getParentNode,
    getFirstChild,
    getLastChild,
    getNextSibling,
    getPreviousSibling,
    getFirstElementChild,
    getLastElementChild,
    getNextElementSibling,
    getPreviousElementSibling,
    appendChild,
    insertBefore,
    getSelection,
} from "./pierce-dom/getParentElement/getParentElement";
import {
    querySelector,
    querySelectorAll,
} from "./pierce-dom/querySelector/querySelector";

// const _createMutationObserver = (callback: MutationCallback) => new MutationObserver(callback);
// const _createTreeWalker = (doc: Document, root: Node, whatToShow?: number, filter?: NodeFilter | null) => doc.createTreeWalker(root, whatToShow, filter);
// const _getParentNode = (node: Node | null | undefined) => node ? node.parentNode : null;
// const _getParentElement = (element: HTMLElement) => element ? element.parentElement : null;
// const _nodeContains = (parent: Node | null | undefined, child: Node | null | undefined) => !!(child && parent?.contains(child));
// const _getActiveElement = (doc: Document) => doc.activeElement;
// const _querySelector = (element: Element, selector: string) => element.querySelector(selector);
// const _querySelectorAll = (element: Element, selector: string) => element.querySelectorAll(selector);

const _createMutationObserver = (callback: MutationCallback) =>
    new ShadowMutationObserver(callback);
const _createTreeWalker = (
    doc: Document,
    root: Node,
    whatToShow?: number,
    filter?: NodeFilter | null
) => new MyTreeWalker(doc, root, whatToShow, filter);
const _getParentNode = getParentNode;
const _getParentElement = getParentElement;
const _nodeContains = elementContains;
const _getActiveElement = getActiveElement;

const _querySelector = querySelector;
const _querySelectorAll = querySelectorAll;

const _getElementById = (doc: Document, id: string): HTMLElement | null => {
    return _querySelector(doc, "#" + id) as HTMLElement | null;
};

const _getFirstChild = getFirstChild;
const _getLastChild = getLastChild;
const _getNextSibling = getNextSibling;
const _getPreviousSibling = getPreviousSibling;
const _getFirstElementChild = getFirstElementChild;
const _getLastElementChild = getLastElementChild;
const _getNextElementSibling = getNextElementSibling;
const _getPreviousElementSibling = getPreviousElementSibling;
const _appendChild = appendChild;
const _insertBefore = insertBefore;
const _getSelection = getSelection;

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
    getActiveElement(doc: Document): Element | null;

    querySelector(element: ParentNode, selector: string): Element | null;
    querySelectorAll(element: ParentNode, selector: string): Element[];

    getElementById(doc: Document, id: string): HTMLElement | null;

    getFirstChild(node: Node | null | undefined): ChildNode | null;
    getLastChild(node: Node | null | undefined): ChildNode | null;
    getNextSibling(node: Node | null | undefined): ChildNode | null;
    getPreviousSibling(node: Node | null | undefined): ChildNode | null;
    getFirstElementChild(element: Element | null | undefined): Element | null;
    getLastElementChild(element: Element | null | undefined): Element | null;
    getNextElementSibling(element: Element | null | undefined): Element | null;
    getPreviousElementSibling(
        element: Element | null | undefined
    ): Element | null;

    appendChild(parent: Node, child: Node): void;
    insertBefore(parent: Node, child: Node, referenceChild: Node | null): void;

    getSelection(ref: Node): Selection | null;
}

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
};

export function setDOMAPI(domapi: Partial<DOMAPI>) {
    for (const key of Object.keys(domapi) as (keyof DOMAPI)[]) {
        (dom[key] as typeof domapi[typeof key]) = domapi[key];
    }
}
