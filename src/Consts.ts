/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

export const TabsterAttributeName = "data-tabster" as const;
export const TabsterDummyInputAttributeName = "data-tabster-dummy" as const;

export const FocusableSelector = [
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

export const AsyncFocusSources: Types.AsyncFocusSources = {
    EscapeGroupper: 1,
    Restorer: 2,
    Deloser: 3,
} as const;

export const ObservedElementAccesibilities: Types.ObservedElementAccesibilities =
    {
        Any: 0,
        Accessible: 1,
        Focusable: 2,
    } as const;

export const RestoreFocusOrders: Types.RestoreFocusOrders = {
    History: 0,
    DeloserDefault: 1,
    RootDefault: 2,
    DeloserFirst: 3,
    RootFirst: 4,
} as const;

export const DeloserStrategies: Types.DeloserStrategies = {
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

export const Visibilities: Types.Visibilities = {
    Invisible: 0,
    PartiallyVisible: 1,
    Visible: 2,
} as const;

export const RestorerTypes: Types.RestorerTypes = {
    Source: 0,
    Target: 1,
} as const;

export const MoverDirections: Types.MoverDirections = {
    Both: 0,
    Vertical: 1,
    Horizontal: 2,
    Grid: 3,
    GridLinear: 4,
} as const;

export const MoverKeys: Types.MoverKeys = {
    ArrowUp: 1,
    ArrowDown: 2,
    ArrowLeft: 3,
    ArrowRight: 4,
    PageUp: 5,
    PageDown: 6,
    Home: 7,
    End: 8,
} as const;

export const GroupperTabbabilities: Types.GroupperTabbabilities = {
    Unlimited: 0,
    Limited: 1, // The tabbability is limited to the container and explicit Enter is needed to go inside.
    LimitedTrapFocus: 2, // The focus is limited as above, plus trapped when inside.
} as const;

export const GroupperMoveFocusActions: Types.GroupperMoveFocusActions = {
    Enter: 1,
    Escape: 2,
} as const;

export const SysDummyInputsPositions: Types.SysDummyInputsPositions = {
    Auto: 0, // Tabster will place dummy inputs depending on the container tag name and on the default behaviour.
    Inside: 1, // Tabster will always place dummy inputs inside the container.
    Outside: 2, // Tabster will always place dummy inputs outside of the container.
} as const;
