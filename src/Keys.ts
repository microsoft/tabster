/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const Keys: {
    Tab: "Tab";
    Enter: "Enter";
    Escape: "Escape";
    Space: " ";
    PageUp: "PageUp";
    PageDown: "PageDown";
    End: "End";
    Home: "Home";
    ArrowLeft: "ArrowLeft";
    ArrowUp: "ArrowUp";
    ArrowRight: "ArrowRight";
    ArrowDown: "ArrowDown";
} = {
    Tab: "Tab",
    Enter: "Enter",
    Escape: "Escape",
    Space: " ",
    PageUp: "PageUp",
    PageDown: "PageDown",
    End: "End",
    Home: "Home",
    ArrowLeft: "ArrowLeft",
    ArrowUp: "ArrowUp",
    ArrowRight: "ArrowRight",
    ArrowDown: "ArrowDown",
};

export type Key = (typeof Keys)[keyof typeof Keys];
