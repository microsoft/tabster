/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const runIfControlled = !process.env.STORYBOOK_UNCONTROLLED
    ? describe
    : xdescribe;
export const runIfUnControlled =
    process.env.STORYBOOK_UNCONTROLLED &&
    !process.env.STORYBOOK_ROOT_DUMMY_INPUTS
        ? describe
        : xdescribe;
