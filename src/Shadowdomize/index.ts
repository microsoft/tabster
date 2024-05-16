/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// TODO: The functions below do not consider Shadow DOM slots yet. We will be adding
// support for slots as the need arises.

export { createShadowTreeWalker as createTreeWalker } from "./ShadowTreeWalker";
export { createShadowMutationObserver as createMutationObserver } from "./ShadowMutationObserver";
export {
    appendChild,
    getActiveElement,
    getFirstChild,
    getFirstElementChild,
    getLastChild,
    getLastElementChild,
    getNextElementSibling,
    getNextSibling,
    getParentElement,
    getParentNode,
    getPreviousElementSibling,
    getPreviousSibling,
    getSelection,
    getElementsByName,
    insertBefore,
    nodeContains,
} from "./DOMFunctions";
export {
    getElementById,
    querySelector,
    querySelectorAll,
} from "./querySelector";
