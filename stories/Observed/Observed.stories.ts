/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from "@storybook/html";
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

const Observed: Story<ObservedElementProps> = (args) => {
    return createObservedWrapper(args);
};

export const MultipleNames = Observed.bind({});
MultipleNames.args = {
    names: ["observed-0", "observed-1"],
};

const ObservedInIframe: Story<ObservedElementProps> = (args) => {
    return createObservedWrapperWithIframe(args);
};

export const MultipleNamesIframe = ObservedInIframe.bind({});
MultipleNamesIframe.args = {
    names: ["observed-0", "observed-1"],
};
