/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from "@storybook/html";
import {
    createObservedWrapperWithIframe,
    ObservedElementProps,
} from "./CrossOrigin";

export default {
    title: "Cross origin",
    argTypes: {
        name: {
            control: "object",
        },
    },
} as Meta;

const Observed: Story<ObservedElementProps> = (args) => {
    return createObservedWrapperWithIframe(args);
};
export const CrossFrameObserved = Observed.bind({});
CrossFrameObserved.args = {
    name: "observed-in-iframe-0",
};
