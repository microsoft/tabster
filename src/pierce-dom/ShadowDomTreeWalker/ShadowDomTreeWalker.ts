/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getLastChild } from "../../Utils";

import { elementContains } from "../elementContains";

// import {
//     hasShadowRoot,
//     hasSlottedChildren,
//     maybeHandleShadowRootOrSlot,
// } from "./utils";
// import type { TreeWalkerWithType } from "./types";
// import { SlotTreeWalker } from "./SlotTreeWalker";

// export class ShadowDomTreeWalker implements TreeWalker {
//     public readonly filter: NodeFilter | null = null;
//     public readonly root: Node;
//     public readonly whatToShow: number;

//     private _rootHasShadow: boolean;
//     private _document: Document;
//     private _walkers: TreeWalkerWithType[] = [];
//     private _currentWalker: TreeWalkerWithType;

//     constructor(
//         root: Node,
//         whatToShow?: number,
//         filter?: NodeFilter | null,
//         doc?: Document
//     ) {
//         this._document = doc ?? document;
//         this.root = root;
//         this.filter = filter ?? null;
//         this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL;
//         this._rootHasShadow = hasShadowRoot(root);

//         this._currentWalker = this._pushWalker(root);
//     }

//     public get currentNode(): Node {
//         return this._currentWalker.currentNode;
//     }

//     public set currentNode(node: Node) {
//         this._currentWalker.currentNode = node;
//     }

//     public firstChild(): Node | null {
//         this._maybeHandleShadowRootOrSlot();

//         return this._currentWalker.firstChild();
//     }

//     public lastChild(): Node | null {
//         const current = this.currentNode;
//         this._currentWalker.lastChild();

//         if (!this._maybeHandleShadowRootOrSlot()) {
//             this._currentWalker.currentNode = current;
//         }

//         return this._currentWalker.lastChild();
//     }

//     public nextNode(): Node | null {
//         this._maybeHandleShadowRootOrSlot();

//         let next = this._currentWalker.nextNode();
//         while (
//             next === null &&
//             this._walkerIsInShadowRootOrSlot() &&
//             !this._atRootShadowWalker()
//         ) {
//             this._popWalker();
//             next = this._currentWalker.nextNode();
//         }

//         return next;
//     }

//     public nextSibling(): Node | null {
//         const sib = this._currentWalker.nextSibling();
//         return sib;
//     }

//     public parentNode(): Node | null {
//         const parent = this._currentWalker.parentNode();
//         if (!parent && this._walkerIsInShadowRootOrSlot()) {
//             this._popWalker();
//             return this.currentNode;
//         }

//         return parent;
//     }

//     public previousNode(): Node | null {
//         let inSlot = this._currentWalker.__inSlot__;
//         if (this._walkerIsInShadowRootOrSlot() && !this._atRootShadowWalker()) {
//             this._popWalker();
//             inSlot = false;
//         }

//         const current = this.currentNode;
//         const prev = this._currentWalker.previousNode();
//         if (
//             prev &&
//             hasSlottedChildren(prev) &&
//             !this._currentWalker.__inSlot__
//         ) {
//             this._currentWalker.currentNode = current;
//             this._currentWalker.__inSlot__ = true;
//             this._maybeHandleShadowRootOrSlot(prev);
//             const lastChild = this._currentWalker.lastChild();
//             return lastChild;
//         }

//         this._currentWalker.__inSlot__ = inSlot;

//         return prev;
//     }

//     public previousSibling(): Node | null {
//         return this._currentWalker.previousSibling();
//     }

//     private _maybeHandleShadowRootOrSlot(node?: Node): boolean {
//         const res = maybeHandleShadowRootOrSlot(node ?? this.currentNode);
//         if (res.type !== "light") {
//             this._pushWalker(res.node, res.type);
//             return true;
//         }

//         return false;
//     }

//     private _pushWalker(
//         root: Node,
//         type: "shadow" | "slot" | "light" = "light"
//     ): TreeWalkerWithType {
//         const walker = this._createTreeWalker(type, root);

//         this._walkers.push(walker);
//         this._currentWalker = walker;

//         return this._currentWalker;
//     }

//     private _popWalker(): TreeWalkerWithType {
//         this._walkers.pop();
//         this._currentWalker = this._walkers[this._walkers.length - 1];

//         return this._currentWalker;
//     }

//     private _walkerIsInShadowRootOrSlot(): boolean {
//         return (
//             this._currentWalker.__type__ === "shadow" ||
//             this._currentWalker.__type__ === "slot"
//         );
//     }

//     private _atRootShadowWalker(): boolean {
//         return this._rootHasShadow && this._walkers.length === 2;
//     }

//     private _createTreeWalker(type: "shadow" | "slot" | "light", root: Node) {
//         let walker: TreeWalkerWithType;
//         if (type === "slot") {
//             walker = new SlotTreeWalker(root, this.whatToShow, this.filter);
//         } else {
//             walker = this._document.createTreeWalker(
//                 root,
//                 this.whatToShow,
//                 this._filterWithSlotHandling.bind(this),
//                 false
//             );
//             // walker = this._document.createTreeWalker(root, this.whatToShow, this.filter);
//         }

//         walker.__type__ = type;
//         walker.__inSlot__ = false;

//         return walker;
//     }

//     // Any slotted node outside of a SlotTreeWalker should be
//     // ignored
//     private _filterWithSlotHandling(node: Node): number {
//         if ((node as HTMLElement)?.assignedSlot) {
//             return NodeFilter.FILTER_REJECT;
//         }

//         if (typeof this.filter === "function") {
//             return this.filter(node);
//         } else if (this.filter?.acceptNode) {
//             return this.filter.acceptNode(node);
//         }

//         return NodeFilter.FILTER_ACCEPT;
//     }
// }

export class MyTreeWalker implements TreeWalker {
    public readonly filter: NodeFilter | null;
    public readonly root: Node;
    public readonly whatToShow: number;

    private _doc: Document;
    private _walkerStack: TreeWalker[] = [];
    private _currentNode: Node;
    private _currentSetFor: Set<TreeWalker> = new Set();

    constructor(
        doc: Document,
        root: Node,
        whatToShow?: number,
        filter?: NodeFilter | null
    ) {
        this._doc = doc;
        this.root = root;
        this.filter = filter ?? null;
        this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL;
        this._currentNode = root;

        this._walkerStack.unshift(
            doc.createTreeWalker(root, whatToShow, this._acceptNode)
        );

        const shadowRoot = (root as Element).shadowRoot;

        if (shadowRoot) {
            const walker = this._doc.createTreeWalker(
                shadowRoot,
                this.whatToShow,
                { acceptNode: this._acceptNode }
            );

            this._walkerStack.unshift(walker);
        }
    }

    private _acceptNode = (node: Node): number => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const shadowRoot = (node as Element).shadowRoot;

            if (shadowRoot) {
                const walker = this._doc.createTreeWalker(
                    shadowRoot,
                    this.whatToShow,
                    { acceptNode: this._acceptNode }
                );

                this._walkerStack.unshift(walker);

                return NodeFilter.FILTER_ACCEPT;
            } else {
                if (typeof this.filter === "function") {
                    return this.filter(node);
                } else if (this.filter?.acceptNode) {
                    return this.filter.acceptNode(node);
                }
            }
        }

        return NodeFilter.FILTER_SKIP;
    };

    public get currentNode(): Node {
        return this._currentNode;
    }

    public set currentNode(node: Node) {
        if (!elementContains(this.root, node)) {
            throw new Error(
                "Cannot set currentNode to a node that is not contained by the root node."
            );
        }

        const walkers: TreeWalker[] = [];
        let curNode: Node | null | undefined = node;
        let currentWalkerCurrentNode = node;

        this._currentNode = node;

        while (curNode && curNode !== this.root) {
            if (curNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                const shadowRoot = curNode as ShadowRoot;

                const walker = this._doc.createTreeWalker(
                    shadowRoot,
                    this.whatToShow,
                    { acceptNode: this._acceptNode }
                );

                walkers.push(walker);

                walker.currentNode = currentWalkerCurrentNode;

                this._currentSetFor.add(walker);

                curNode = currentWalkerCurrentNode = shadowRoot.host;
            } else {
                curNode = curNode.parentNode;
            }
        }

        const walker = this._doc.createTreeWalker(this.root, this.whatToShow, {
            acceptNode: this._acceptNode,
        });

        walkers.push(walker);

        walker.currentNode = currentWalkerCurrentNode;

        this._currentSetFor.add(walker);

        this._walkerStack = walkers;
    }

    public firstChild(): Node | null {
        throw new Error("Method not implemented.");
    }

    public lastChild(): Node | null {
        throw new Error("Method not implemented.");
    }

    public nextNode(): Node | null {
        const nextNode = this._walkerStack[0].nextNode();

        if (nextNode) {
            const shadowRoot = (nextNode as Element).shadowRoot;

            if (shadowRoot) {
                let nodeResult: number | undefined;

                if (typeof this.filter === "function") {
                    nodeResult = this.filter(nextNode);
                } else if (this.filter?.acceptNode) {
                    nodeResult = this.filter.acceptNode(nextNode);
                }

                if (nodeResult === NodeFilter.FILTER_ACCEPT) {
                    return nextNode;
                }

                // _acceptNode should have added new walker for this shadow,
                // go in recursively.
                return this.nextNode();
            }

            return nextNode;
        } else {
            if (this._walkerStack.length > 1) {
                this._walkerStack.shift();

                return this.nextNode();
            } else {
                return null;
            }
        }
    }

    public previousNode(): Node | null {
        const currentWalker = this._walkerStack[0];

        if (currentWalker.currentNode === currentWalker.root) {
            if (this._currentSetFor.has(currentWalker)) {
                this._currentSetFor.delete(currentWalker);

                if (this._walkerStack.length > 1) {
                    this._walkerStack.shift();
                    return this.previousNode();
                } else {
                    return null;
                }
            }

            const lastChild = getLastChild(currentWalker.root as HTMLElement);

            if (lastChild) {
                currentWalker.currentNode = lastChild;

                let nodeResult: number | undefined;

                if (typeof this.filter === "function") {
                    nodeResult = this.filter(lastChild);
                } else if (this.filter?.acceptNode) {
                    nodeResult = this.filter.acceptNode(lastChild);
                }

                if (nodeResult === NodeFilter.FILTER_ACCEPT) {
                    return lastChild;
                }
            }
        }

        const previousNode = currentWalker.previousNode();

        if (previousNode) {
            const shadowRoot = (previousNode as Element).shadowRoot;

            if (shadowRoot) {
                let nodeResult: number | undefined;

                if (typeof this.filter === "function") {
                    nodeResult = this.filter(previousNode);
                } else if (this.filter?.acceptNode) {
                    nodeResult = this.filter.acceptNode(previousNode);
                }

                if (nodeResult === NodeFilter.FILTER_ACCEPT) {
                    return previousNode;
                }

                // _acceptNode should have added new walker for this shadow,
                // go in recursively.
                return this.previousNode();
            }

            return previousNode;
        } else {
            if (this._walkerStack.length > 1) {
                this._walkerStack.shift();

                return this.previousNode();
            } else {
                return null;
            }
        }
    }

    public nextSibling(): Node | null {
        throw new Error("Method not implemented.");
    }

    public previousSibling(): Node | null {
        throw new Error("Method not implemented.");
    }

    public parentNode(): Node | null {
        throw new Error("Method not implemented.");
    }
}

// export function createShadowDomTreeWalker(
//     doc: Document,
//     root: Node,
//     whatToShow?: number,
//     filter?: NodeFilter | null
// ): TreeWalker {
//     return new ShadowDomTreeWalker(root, whatToShow, filter, doc);
// }
