/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { elementContains } from "../elementContains";

interface OverridenAttachShadow {
    __origAttachShadow?: typeof Element.prototype.attachShadow;
}

export class ShadowMutationObserver implements MutationObserver {
    private static _shadowObservers: Set<ShadowMutationObserver> = new Set();

    private _root?: Node;
    private _options?: MutationObserverInit;
    private _callback: MutationCallback;
    private _observer: MutationObserver;
    private _subObservers: Map<Node, MutationObserver>;
    private _isObserving = false;

    private static _overrideAttachShadow(
        win: Window & typeof globalThis
    ): void {
        const origAttachShadow = win.Element.prototype.attachShadow;

        if ((origAttachShadow as OverridenAttachShadow).__origAttachShadow) {
            return;
        }

        Element.prototype.attachShadow = function (
            this: Element,
            options?: ShadowRootInit
        ): ShadowRoot {
            const shadowRoot = origAttachShadow.call(this, options);

            for (const shadowObserver of ShadowMutationObserver._shadowObservers) {
                shadowObserver._addSubObserver(shadowRoot);
            }

            return shadowRoot;
        };

        (
            Element.prototype.attachShadow as OverridenAttachShadow
        ).__origAttachShadow = origAttachShadow;
    }

    constructor(callback: MutationCallback) {
        this._callback = callback;
        this._observer = new MutationObserver(this._callbackWrapper);
        this._subObservers = new Map();
    }

    private _callbackWrapper = (
        mutations: MutationRecord[],
        observer: MutationObserver
    ): void => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                const removed = mutation.removedNodes;
                const added = mutation.addedNodes;

                for (let i = 0; i < removed.length; i++) {
                    this._walkShadows(removed[i], true);
                }

                for (let i = 0; i < added.length; i++) {
                    this._walkShadows(added[i]);
                }
            }
        }

        this._callback(mutations, observer);
    };

    private _addSubObserver(shadowRoot: ShadowRoot): void {
        if (
            !this._options ||
            !this._callback ||
            this._subObservers.has(shadowRoot)
        ) {
            return;
        }

        if (this._options.subtree && elementContains(this._root, shadowRoot)) {
            const subObserver = new MutationObserver(this._callbackWrapper);

            this._subObservers.set(shadowRoot, subObserver);

            if (this._isObserving) {
                subObserver.observe(shadowRoot, this._options);
            }

            this._walkShadows(shadowRoot);
        }
    }

    public disconnect(): void {
        this._isObserving = false;

        delete this._options;

        ShadowMutationObserver._shadowObservers.delete(this);

        for (const subObserver of this._subObservers.values()) {
            subObserver.disconnect();
        }

        this._subObservers.clear();

        this._observer.disconnect();
    }

    public observe(target: Node, options?: MutationObserverInit): void {
        const doc =
            target.nodeType === Node.DOCUMENT_NODE
                ? (target as Document)
                : target.ownerDocument;
        const win = doc?.defaultView as Window & typeof globalThis;

        if (!doc || !win) {
            return;
        }

        ShadowMutationObserver._overrideAttachShadow(win);
        ShadowMutationObserver._shadowObservers.add(this);

        this._root = target;
        this._options = options;

        this._isObserving = true;

        this._observer.observe(target, options);

        this._walkShadows(target);
    }

    private _walkShadows(target: Node, remove?: boolean): void {
        const doc =
            target.nodeType === Node.DOCUMENT_NODE
                ? (target as Document)
                : target.ownerDocument;

        if (!doc) {
            return;
        }

        if (target === doc) {
            target = doc.body;
        } else {
            const shadowRoot = (target as Element).shadowRoot;

            if (shadowRoot) {
                this._addSubObserver(shadowRoot);
                return;
            }
        }

        const walker = doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (remove) {
                        const subObserver = this._subObservers.get(node);

                        if (subObserver) {
                            subObserver.disconnect();
                            this._subObservers.delete(node);
                        }
                    } else {
                        const shadowRoot = (node as Element).shadowRoot;

                        if (shadowRoot) {
                            this._addSubObserver(shadowRoot);
                        }
                    }
                }

                return NodeFilter.FILTER_SKIP;
            },
        });

        walker.nextNode();
    }

    public takeRecords(): MutationRecord[] {
        const records = this._observer.takeRecords();

        for (const subObserver of this._subObservers.values()) {
            records.push(...subObserver.takeRecords());
        }

        return records;
    }
}
