/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TabsterInternal } from "../../src/Types";

export const runIfControlled = !process.env.STORYBOOK_UNCONTROLLED
    ? describe
    : xdescribe;
export const runIfUnControlled =
    process.env.STORYBOOK_UNCONTROLLED &&
    !process.env.STORYBOOK_ROOT_DUMMY_INPUTS
        ? describe
        : xdescribe;

export interface WindowWithTabsterInternal extends Window {
    __tabsterInstance: TabsterInternal;
}
