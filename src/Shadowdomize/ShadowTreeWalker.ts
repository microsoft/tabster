/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getLastElementChild, nodeContains } from "./DOMFunctions";

function getLastChild(container: HTMLElement): HTMLElement | undefined {
    let lastChild: HTMLElement | null = null;

    for (
        let i = getLastElementChild(container);
        i;
        i = getLastElementChild(i)
    ) {
        lastChild = i as HTMLElement;
    }

    return lastChild || undefined;
}

export class ShadowTreeWalker implements TreeWalker {
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
        if (!nodeContains(this.root, node)) {
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
        if (__DEV__) {
            throw new Error("Method not implemented.");
        }

        return null;
    }

    public lastChild(): Node | null {
        if (__DEV__) {
            throw new Error("Method not implemented.");
        }

        return null;
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
        if (__DEV__) {
            throw new Error("Method not implemented.");
        }

        return null;
    }

    public previousSibling(): Node | null {
        if (__DEV__) {
            throw new Error("Method not implemented.");
        }

        return null;
    }

    public parentNode(): Node | null {
        if (__DEV__) {
            throw new Error("Method not implemented.");
        }

        return null;
    }
}

export function createShadowTreeWalker(
    doc: Document,
    root: Node,
    whatToShow?: number,
    filter?: NodeFilter | null
) {
    return new ShadowTreeWalker(doc, root, whatToShow, filter);
}
