/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, StoryFn } from "@storybook/html-vite";
import { GroupperTabbabilities, GroupperOptions } from "tabster/lite";
import {
    createFocusableContainerLite,
    FocusableContainerLiteProps,
} from "./GroupperLite";

export default {
    title: "Groupper/Lite",
    argTypes: {
        tabbability: {
            control: "select",
            options: GroupperTabbabilities,
        },
    },
} as Meta<{
    title: "Groupper/Lite";
    argTypes: {
        tabbability: {
            control: "select";
            options: GroupperOptions["tabbability"];
        };
    };
}>;

const FocusableContainer: StoryFn<FocusableContainerLiteProps> = (args) => {
    return createFocusableContainerLite(args);
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
