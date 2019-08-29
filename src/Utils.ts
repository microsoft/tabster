/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

let _isBrokenIE11: boolean;

try {
    // IE11 only accepts `filter` argument as a function (not object with the `acceptNode`
    // property as the docs define). Also `entityReferenceExpansion` argument is not
    // optional. And it throws exception when the above arguments aren't there.
    document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
    _isBrokenIE11 = false;
} catch (e) {
    _isBrokenIE11 = true;
}

export function createElementTreeWalker(doc: Document, root: Node, acceptNode: (node: Node) => number): TreeWalker | undefined {
    // IE11 will throw an exception when the TreeWalker root is not an Element.
    if (root.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
    }

    // TypeScript isn't aware of IE11 behaving badly.
    const filter = (_isBrokenIE11 ? acceptNode : ({ acceptNode } as NodeFilter)) as any as NodeFilter;

    return doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter, false /* Last argument is not optional for IE11! */);
}
