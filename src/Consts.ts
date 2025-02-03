/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const TABSTER_ATTRIBUTE_NAME = "data-tabster" as const;
export const TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME = "data-tabster-dummy" as const;

export const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "*[tabindex]",
    "*[contenteditable]",
    "details > summary",
    "audio[controls]",
    "video[controls]",
].join(", ");

export const AsyncFocusSources = {
    EscapeGroupper: 1,
    Restorer: 2,
    Deloser: 3,
} as const;

export const ObservedElementAccessibilities = {
    Any: 0,
    Accessible: 1,
    Focusable: 2,
} as const;

export const ObservedElementRequestStatuses = {
    Waiting: 0,
    Succeeded: 1,
    Canceled: 2,
    TimedOut: 3,
} as const;

export const RestoreFocusOrders = {
    History: 0,
    DeloserDefault: 1,
    RootDefault: 2,
    DeloserFirst: 3,
    RootFirst: 4,
} as const;

export const DeloserStrategies = {
    /**
     * If the focus is lost, the focus will be restored automatically using all available focus history.
     * This is the default strategy.
     */
    Auto: 0,
    /**
     * If the focus is lost from this Deloser instance, the focus will not be restored automatically.
     * The application might listen to the event and restore the focus manually.
     * But if it is lost from another Deloser instance, the history of this Deloser could be used finding
     * the element to focus.
     */
    Manual: 1,
} as const;

export const Visibilities = {
    Invisible: 0,
    PartiallyVisible: 1,
    Visible: 2,
} as const;

export const RestorerTypes = {
    Source: 0,
    Target: 1,
} as const;

export const MoverDirections = {
    Both: 0, // Default, both left/up keys move to the previous, right/down move to the next.
    Vertical: 1, // Only up/down arrows move to the next/previous.
    Horizontal: 2, // Only left/right arrows move to the next/previous.
    Grid: 3, // Two-dimentional movement depending on the visual placement.
    GridLinear: 4, // Two-dimentional movement depending on the visual placement. Allows linear movement.
} as const;

export const MoverKeys = {
    ArrowUp: 1,
    ArrowDown: 2,
    ArrowLeft: 3,
    ArrowRight: 4,
    PageUp: 5,
    PageDown: 6,
    Home: 7,
    End: 8,
} as const;

export const GroupperTabbabilities = {
    Unlimited: 0,
    Limited: 1, // The tabbability is limited to the container and explicit Enter is needed to go inside.
    LimitedTrapFocus: 2, // The focus is limited as above, plus trapped when inside.
} as const;

export const GroupperMoveFocusActions = {
    Enter: 1,
    Escape: 2,
} as const;

export const SysDummyInputsPositions = {
    Auto: 0, // Tabster will place dummy inputs depending on the container tag name and on the default behaviour.
    Inside: 1, // Tabster will always place dummy inputs inside the container.
    Outside: 2, // Tabster will always place dummy inputs outside of the container.
} as const;
