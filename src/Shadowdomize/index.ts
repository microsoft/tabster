/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

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
    insertBefore,
    nodeContains,
} from "./DOMFunctions";
export {
    getElementById,
    querySelector,
    querySelectorAll,
} from "./querySelector";
