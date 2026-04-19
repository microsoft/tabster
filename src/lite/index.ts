/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export {
    FOCUSABLE_SELECTOR,
    isVisible,
    isFocusable,
    isAccessible,
    findFirst,
    findLast,
    findNext,
    findPrev,
    findDefault,
    findAll,
} from "./focusable";
export type { FindOptions } from "./focusable";

export { GroupperTabbabilities, createGroupper } from "./groupper";
export type {
    GroupperTabbability,
    GroupperOptions,
    GroupperInstance,
} from "./groupper";

export { MoverDirections, createMover } from "./mover";
export type { MoverDirection, MoverOptions, MoverInstance } from "./mover";

export { createDeloser } from "./deloser";
export type { DeloserOptions, DeloserInstance } from "./deloser";

export { createModalizer } from "./modalizer";
export type { ModalizerOptions, ModalizerInstance } from "./modalizer";

export { RestorerTypes, createRestorer } from "./restorer";
export type {
    RestorerType,
    RestorerOptions,
    RestorerInstance,
} from "./restorer";

export {
    findObservedElement,
    observeElement,
    waitForObservedElement,
    requestFocusObservedElement,
    disposeObservedModule,
} from "./observed";
export type { ObservedElementRequest } from "./observed";

export { createLiteObserver } from "./observer";
export type { LiteObserverOptions } from "./observer";

export {
    getTabsterAttribute,
    setTabsterAttribute,
    mergeTabsterProps,
} from "../AttributeHelpers";
export { TABSTER_ATTRIBUTE_NAME } from "../Consts";

// Public custom event names + classes are also shared so that listeners
// written against full Tabster (e.g. `el.addEventListener(MoverStateEventName, …)`)
// keep working with lite. Lite currently emits a subset; the constants
// themselves are stable contract.
export * from "../Events";
export * as EventsTypes from "../EventsTypes";
