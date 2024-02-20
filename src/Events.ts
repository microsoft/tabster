/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as Types from "./Types";

/**
 * Events sent by Tabster.
 */

export const TabsterFocusInEventName = "tabster:focusin";
export const TabsterFocusOutEventName = "tabster:focusout";

// Event is dispatched when Tabster wants to move focus as the result of
// handling keyboard event. This allows to preventDefault() if you want to have
// some custom logic.
export const TabsterMoveFocusEventName = "tabster:movefocus";

/**
 * Events sent by Deloser.
 */

export const DeloserFocusLostEventName = "tabster:deloser:focus-lost";

/**
 * Events sent by Modalizer.
 */
export const ModalizerActiveEventName = "tabster:modalizer:active";
export const ModalizerInactiveEventName = "tabster:modalizer:inactive";
// export const ModalizerFocusInEventName = "tabster:modalizer:focusin";
// export const ModalizerFocusOutEventName = "tabster:modalizer:focusout";
// export const ModalizerBeforeFocusOutEventName =
//     "tabster:modalizer:beforefocusout";

/**
 * Events sent by Mover.
 */
export const MoverStateEventName = "tabster:mover:state";

/**
 * Events to be sent to Mover by the application.
 */

// Event that can be dispatched by the application to programmatically move
// focus inside Mover.
export const MoverMoveFocusEventName = "tabster:mover:movefocus";
// Event that can be dispatched by the application to forget or modify
// memorized element in Mover with memorizeCurrent property.
export const MoverMemorizedElementEventName = "tabster:mover:memorized-element";

/**
 * Events sent by Groupper.
 */

/**
 * Events to be sent to Groupper by the application.
 */

// Event that can be dispatched by the application to programmatically enter
// or escape Groupper.
export const GroupperMoveFocusEventName = "tabster:groupper:movefocus";

/**
 * Events sent by Restorer.
 */

export const RestorerRestoreFocusEventName = "tabster:restorer:restore-focus";

/**
 * Events sent by Root.
 */
export const RootFocusEventName = "tabster:root:focus";
export const RootBlurEventName = "tabster:root:blur";

export abstract class TabsterCustomEvent<D> extends CustomEvent<D> {
    /**
     * @deprecated use `detail`.
     */
    details?: D;

    constructor(type: string, detail?: D) {
        super(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail,
        });

        this.details = detail;
    }
}

export interface TabsterMoveFocusEventDetail {
    by: "mover" | "groupper" | "modalizer" | "root";
    owner: HTMLElement; // Mover, Groupper, Modalizer or Root, the initiator.
    next: HTMLElement | null; // Next element to focus or null if Tabster wants to go outside of Root (i.e. to the address bar of the browser).
    relatedEvent?: KeyboardEvent; // The original keyboard event that triggered the move.
}

export class TabsterFocusInEvent extends TabsterCustomEvent<Types.FocusedElementDetail> {
    constructor(detail: Types.FocusedElementDetail) {
        super(TabsterFocusInEventName, detail);
    }
}

export class TabsterFocusOutEvent extends TabsterCustomEvent<Types.FocusedElementDetail> {
    constructor(detail: Types.FocusedElementDetail) {
        super(TabsterFocusOutEventName, detail);
    }
}

export class TabsterMoveFocusEvent extends TabsterCustomEvent<TabsterMoveFocusEventDetail> {
    constructor(detail: TabsterMoveFocusEventDetail) {
        super(TabsterMoveFocusEventName, detail);
    }
}

export class MoverStateEvent extends TabsterCustomEvent<Types.MoverElementState> {
    constructor(detail: Types.MoverElementState) {
        super(MoverStateEventName, detail);
    }
}

export type MoverMoveFocusEventDetail = { key: Types.MoverKey };

export class MoverMoveFocusEvent extends TabsterCustomEvent<MoverMoveFocusEventDetail> {
    constructor(detail: MoverMoveFocusEventDetail) {
        super(MoverMoveFocusEventName, detail);
    }
}

export interface MoverMemorizedElementEventDetail {
    memorizedElement: HTMLElement | undefined;
}

export class MoverMemorizedElementEvent extends TabsterCustomEvent<MoverMemorizedElementEventDetail> {
    constructor(detail: MoverMemorizedElementEventDetail) {
        super(MoverMemorizedElementEventName, detail);
    }
}

export type GroupperMoveFocusEventDetail = {
    action: Types.GroupperMoveFocusAction;
};

export class GroupperMoveFocusEvent extends TabsterCustomEvent<GroupperMoveFocusEventDetail> {
    constructor(detail: GroupperMoveFocusEventDetail) {
        super(GroupperMoveFocusEventName, detail);
    }
}

export type ModalizerEventDetail = {
    id: string;
    element: HTMLElement;
};

export class ModalizerActiveEvent extends TabsterCustomEvent<ModalizerEventDetail> {
    constructor(detail: ModalizerEventDetail) {
        super(ModalizerActiveEventName, detail);
    }
}

export class ModalizerInactiveEvent extends TabsterCustomEvent<ModalizerEventDetail> {
    constructor(detail: ModalizerEventDetail) {
        super(ModalizerInactiveEventName, detail);
    }
}

export class DeloserFocusLostEvent extends TabsterCustomEvent<Types.DeloserElementActions> {
    constructor(detail: Types.DeloserElementActions) {
        super(DeloserFocusLostEventName, detail);
    }
}

export class RestorerRestoreFocusEvent extends TabsterCustomEvent<undefined> {
    constructor() {
        super(RestorerRestoreFocusEventName);
    }
}

export interface RootFocusEventDetail {
    element: HTMLElement;
}

export class RootFocusEvent extends TabsterCustomEvent<RootFocusEventDetail> {
    constructor(detail: RootFocusEventDetail) {
        super(RootFocusEventName, detail);
    }
}

export class RootBlurEvent extends TabsterCustomEvent<RootFocusEventDetail> {
    constructor(detail: RootFocusEventDetail) {
        super(RootBlurEventName, detail);
    }
}

// addEventListener() typings augmentation.
declare global {
    interface GlobalEventHandlersEventMap {
        [TabsterFocusInEventName]: TabsterFocusInEvent;
        [TabsterFocusOutEventName]: TabsterFocusOutEvent;
        [TabsterMoveFocusEventName]: TabsterMoveFocusEvent;

        [MoverStateEventName]: MoverStateEvent;
        [MoverMoveFocusEventName]: MoverMoveFocusEvent;
        [MoverMemorizedElementEventName]: MoverMemorizedElementEvent;

        [GroupperMoveFocusEventName]: GroupperMoveFocusEvent;

        [ModalizerActiveEventName]: ModalizerActiveEvent;
        [ModalizerInactiveEventName]: ModalizerInactiveEvent;

        [DeloserFocusLostEventName]: DeloserFocusLostEvent;

        [RestorerRestoreFocusEventName]: RestorerRestoreFocusEvent;

        [RootFocusEventName]: RootFocusEvent;
        [RootBlurEventName]: RootBlurEvent;
    }
}
