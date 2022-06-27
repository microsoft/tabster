/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from "@storybook/html";
import {
    createAsyncObservedWrapper,
    createObservedWrapper,
    ObservedElementProps,
} from "./Observed";

export default {
    title: "Observed",
    argTypes: {
        name: {
            control: "object",
        },
    },
} as Meta;

const Observed: Story<ObservedElementProps> = (args) => {
    return createObservedWrapper(args);
};
export const ElementInDOM = Observed.bind({});
ElementInDOM.args = {
    name: "observed-0",
};

const AsyncObserved: Story<ObservedElementProps> = (args) => {
    return createAsyncObservedWrapper(args);
};
export const ElementNotInDOM = AsyncObserved.bind({});
ElementNotInDOM.args = {
    name: "observed-0",
};
