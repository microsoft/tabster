/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, StoryFn } from "@storybook/html";
import { GroupperTabbabilities, Types } from "tabster";
import { createFocusableContainer, FocusableContainerProps } from "./Groupper";

export default {
    title: "Groupper",
    argTypes: {
        tabbability: {
            control: "select",
            options: GroupperTabbabilities,
        },
    },
} as Meta<{
    title: "Groupper";
    argTypes: {
        tabbability: {
            control: "select";
            options: Types.GroupperTabbabilities;
        };
    };
}>;

const FocusableContainer: StoryFn<FocusableContainerProps> = (args) => {
    return createFocusableContainer(args);
};

export const WithFocusTrap = FocusableContainer.bind({});
WithFocusTrap.args = {
    tabbability: GroupperTabbabilities.LimitedTrapFocus,
};

export const OnlyTabOut = FocusableContainer.bind({});
OnlyTabOut.args = { tabbability: GroupperTabbabilities.Limited };

export const TabInAndOut = FocusableContainer.bind({});
TabInAndOut.args = {
    tabbability: GroupperTabbabilities.Unlimited,
};
