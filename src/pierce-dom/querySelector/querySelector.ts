/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

function shadowQuerySelector(
    node: ParentNode,
    selector: string,
    all: boolean
): Element[] {
    // TODO: This is probably slow. Optimize to use each shadowRoot's querySelector/querySelectorAll
    //       instead of walking the tree.

    const elements: Element[] = [];

    walk(node, selector);

    return elements;

    function walk(from: Node, selector: string): void {
        let el: Element | null = null;

        const walker = document.createTreeWalker(
            from,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (n) => {
                    if (n.nodeType === Node.ELEMENT_NODE) {
                        if ((n as Element).matches(selector)) {
                            el = n as Element;
                            elements.push(el);
                            return all
                                ? NodeFilter.FILTER_SKIP
                                : NodeFilter.FILTER_ACCEPT;
                        }

                        const shadowRoot = (n as Element).shadowRoot;

                        if (shadowRoot) {
                            walk(shadowRoot, selector);
                            return !all && elements.length
                                ? NodeFilter.FILTER_ACCEPT
                                : NodeFilter.FILTER_SKIP;
                        }
                    }
                    return NodeFilter.FILTER_SKIP;
                },
            }
        );

        walker.nextNode();
    }
}

export function querySelectorAll(
    node: ParentNode,
    selector: string
): Element[] {
    return shadowQuerySelector(node, selector, true);
}

export function querySelector(
    node: ParentNode,
    selector: string
): Element | null {
    return shadowQuerySelector(node, selector, false)[0] || null;
}
