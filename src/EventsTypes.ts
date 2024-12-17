/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

export interface TabsterMoveFocusEventDetail {
    by: "mover" | "groupper" | "modalizer" | "root" | "deloser";
    owner: HTMLElement; // Mover, Groupper, Modalizer or Root, the initiator.
    next: HTMLElement | null; // Next element to focus or null if Tabster wants to go outside of Root (i.e. to the address bar of the browser).
    relatedEvent?: KeyboardEvent; // The original keyboard event that triggered the move.
}

export interface MoverMoveFocusEventDetail {
    key: Types.MoverKey;
}

export interface MoverMemorizedElementEventDetail {
    memorizedElement: HTMLElement | undefined;
}

export interface GroupperMoveFocusEventDetail {
    action: Types.GroupperMoveFocusAction;
}

export interface ModalizerEventDetail {
    id: string;
    element: HTMLElement;
}

export interface RootFocusEventDetail {
    element: HTMLElement;
}
