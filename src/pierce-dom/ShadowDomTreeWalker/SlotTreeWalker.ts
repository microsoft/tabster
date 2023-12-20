/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { dfs } from "./utils";

export class SlotTreeWalker implements TreeWalker {
    public readonly filter: NodeFilter | null = null;
    public readonly root: Node;
    public readonly whatToShow: number;

    private _filterFn: (node: Node) => number;
    private _currentIndex: number;
    private _nodes: Node[];
    private _nodesToIndex: Map<Node, number>;

    constructor(root: Node, whatToShow?: number, filter?: NodeFilter | null) {
        if (typeof (root as HTMLSlotElement).assignedNodes !== "function") {
            throw new Error(
                "`root` must be an `HTMLSlotElement with slotted nodes."
            );
        }

        this.root = root;
        this.filter = filter ?? null;

        if (typeof filter === "function") {
            this._filterFn = filter;
        } else if (filter?.acceptNode) {
            this._filterFn = filter.acceptNode;
        } else {
            this._filterFn = () => NodeFilter.FILTER_ACCEPT;
        }

        this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL;

        this._nodes = [];
        this._nodesToIndex = new Map();

        dfs(root, (node) => {
            if (this._allowed(node)) {
                const index = this._nodes.length;
                this._nodes.push(node);
                this._nodesToIndex.set(node, index);
            }
            return true;
        });

        this._currentIndex = -1;
    }

    public get currentNode(): Node {
        return this._currentIndex < 0
            ? this.root
            : this._nodes[this._currentIndex];
    }

    public set currentNode(node: Node) {
        const index = this._nodesToIndex.get(node);
        if (index === undefined) {
            throw new Error("Node not found in tree.");
        }

        this._currentIndex = index;
    }

    public firstChild(): Node | null {
        this._currentIndex = 0;
        return this.currentNode;
    }

    public lastChild(): Node | null {
        this._currentIndex = this._nodes.length - 1;
        return this.currentNode;
    }

    public nextNode(): Node | null {
        const nextIndex = this._currentIndex + 1;
        if (nextIndex >= this._nodes.length) {
            return null;
        }

        this._currentIndex = nextIndex;
        return this.currentNode;
    }

    public nextSibling(): Node | null {
        let next = this.currentNode.nextSibling;
        while (next && this._nodesToIndex.get(next) === undefined) {
            next = next.nextSibling;
        }

        if (!next) {
            return null;
        }

        this._currentIndex = this._nodesToIndex.get(next) as number;
        return this.currentNode;
    }

    public parentNode(): Node | null {
        return this.root;
    }

    public previousNode(): Node | null {
        const prev = this._currentIndex - 1;
        if (prev < 0) {
            return null;
        }

        this._currentIndex = prev;
        return this.currentNode;
    }

    public previousSibling(): Node | null {
        let prev: Node | null = this.currentNode.previousSibling;

        while (prev && this._nodesToIndex.get(prev) === undefined) {
            prev = prev.previousSibling;
        }

        if (!prev) {
            return null;
        }

        this._currentIndex = this._nodesToIndex.get(prev) as number;
        return this.currentNode;
    }

    private _allowed(node: Node): boolean {
        if (
            (this.whatToShow & NodeFilter.SHOW_ELEMENT) ===
            NodeFilter.SHOW_ELEMENT
        ) {
            if (node.nodeType === 1) {
                // ELEMENT_NODE
                return this._filterFn(node) === NodeFilter.FILTER_ACCEPT;
            }
        }

        return false;
    }
}
