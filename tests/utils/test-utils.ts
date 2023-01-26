/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const describeIfControlled = !(
    process.env.STORYBOOK_UNCONTROLLED ||
    process.env.STORYBOOK_ROOT_DUMMY_INPUTS
)
    ? describe
    : xdescribe;
export const describeIfUncontrolled =
    process.env.STORYBOOK_UNCONTROLLED ||
    process.env.STORYBOOK_ROOT_DUMMY_INPUTS
        ? describe
        : xdescribe;

export const itIfControlled = !(
    process.env.STORYBOOK_UNCONTROLLED ||
    process.env.STORYBOOK_ROOT_DUMMY_INPUTS
)
    ? it
    : xit;
export const itIfUncontrolled =
    process.env.STORYBOOK_UNCONTROLLED ||
    process.env.STORYBOOK_ROOT_DUMMY_INPUTS
        ? it
        : xit;
