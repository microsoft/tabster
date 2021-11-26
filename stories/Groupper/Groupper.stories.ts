/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from "@storybook/html";
import { Types as TabsterTypes } from "tabster";
import { createFocusableContainer, FocusableContainerProps } from "./Groupper";

export default {
    title: "Groupper",
    argTypes: {
        tabbability: {
            control: "select",
            options: TabsterTypes.GroupperTabbabilities,
        },
    },
} as Meta;

const FocusableContainer: Story<FocusableContainerProps> = (args) => {
    return createFocusableContainer(args);
};

export const WithFocusTrap = FocusableContainer.bind({});
WithFocusTrap.args = {
    tabbability: TabsterTypes.GroupperTabbabilities.LimitedTrapFocus,
};

export const OnlyTabOut = FocusableContainer.bind({});
OnlyTabOut.args = { tabbability: TabsterTypes.GroupperTabbabilities.Limited };

export const TabInAndOut = FocusableContainer.bind({});
TabInAndOut.args = {
    tabbability: TabsterTypes.GroupperTabbabilities.Unlimited,
};
