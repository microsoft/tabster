/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, StoryFn } from "@storybook/html-vite";
import {
    createObservedWrapper,
    ObservedElementProps,
    createObservedWrapperWithIframe,
    createObservedWrapperWithAPIDemo,
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

const ObservedAPIDemo: StoryFn<ObservedElementProps> = (args) => {
    return createObservedWrapperWithAPIDemo(args);
};

export const APIDemonstration = ObservedAPIDemo.bind({});
APIDemonstration.args = {
    names: ["observed-0", "observed-1"],
};
APIDemonstration.parameters = {
    docs: {
        description: {
            story:
                "Demonstrates the `getAllObservedElements()` and `onObservedElementChange` APIs. " +
                "Use the buttons to add/remove elements and watch the event log and element list update in real-time.",
        },
    },
};
