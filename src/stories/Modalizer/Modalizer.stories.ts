/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from "@storybook/html";
import { createModalDialog, ModalDialogProps } from "./ModalDialog";

export default {
    title: "Modalizer",
    argTypes: {
        isAlwaysAccessible: { control: "boolean" },
        isNoFocusDefault: { control: "boolean" },
        isNoFocusFirst: { control: "boolean" },
        isOthersAccessible: { control: "boolean" },
    },
} as Meta;

const SimpleFocusableCollection: Story<ModalDialogProps> = (args) => {
    return createModalDialog(args);
};

export const Basic = SimpleFocusableCollection.bind({});
