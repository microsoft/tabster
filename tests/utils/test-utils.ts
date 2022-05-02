/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TabsterCore } from "../../src/Types";

export const runIfControlled = !process.env.STORYBOOK_UNCONTROLLED
    ? describe
    : xdescribe;
export const runIfUnControlled =
    process.env.STORYBOOK_UNCONTROLLED &&
    !process.env.STORYBOOK_ROOT_DUMMY_INPUTS
        ? describe
        : xdescribe;

export interface WindowWithTabsterCore extends Window {
    __tabsterInstance: TabsterCore;
}
