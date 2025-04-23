/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, StoryFn } from "@storybook/html";
import {
    createObservedWrapper,
    ObservedElementProps,
    createObservedWrapperWithIframe,
} from "./Observed";

export default {
    title: "Observed",
    argTypes: {
        names: {
            control: "object",
        },
    },
} as Meta;

const Observed: StoryFn<ObservedElementProps> = (args) => {
    return createObservedWrapper(args);
};

export const TargetNotInDOM = Observed.bind({});
TargetNotInDOM.args = {
    names: ["observed-0", "observed-1"],
};

const ObservedInIframe: StoryFn<ObservedElementProps> = (args) => {
    return createObservedWrapperWithIframe(args);
};

export const TargetInIframe = ObservedInIframe.bind({});
TargetInIframe.args = {
    names: ["observed-0", "observed-1"],
};
