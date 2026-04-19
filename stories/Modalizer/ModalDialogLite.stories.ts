/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, StoryFn } from "@storybook/html-vite";
import { createModalDialogLite, ModalDialogLiteProps } from "./ModalDialogLite";

export default {
    title: "Modalizer/Lite",
    argTypes: {
        isAlwaysAccessible: { control: "boolean" },
        isNoFocusDefault: { control: "boolean" },
        isNoFocusFirst: { control: "boolean" },
        isOthersAccessible: { control: "boolean" },
    },
} as Meta;

const SimpleFocusableCollection: StoryFn<ModalDialogLiteProps> = (args) => {
    return createModalDialogLite(args);
};

export const Basic = SimpleFocusableCollection.bind({});

export const Trapped = SimpleFocusableCollection.bind({});
Trapped.args = { isTrapped: true };
