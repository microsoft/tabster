/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, StoryFn } from "@storybook/html-vite";
import { MoverDirections } from "tabster/lite";
import {
    createBasicMoverLite,
    createTableMoverLite,
    MoverLiteProps,
} from "./MoverLite";

export default {
    title: "Mover/Lite",
    argTypes: {
        cyclic: { control: "boolean" },
        direction: { control: "select", options: MoverDirections },
        memorizeCurrent: { control: "boolean" },
        tabbable: { control: "boolean" },
        visibilityAware: { control: "boolean" },
    },
} as Meta<{
    title: "Mover/Lite";
    argTypes: {
        cyclic: { control: "boolean" };
        direction: { control: "select"; options: MoverLiteProps["direction"] };
        memorizeCurrent: { control: "boolean" };
        tabbable: { control: "boolean" };
        visibilityAware: { control: "boolean" };
    };
}>;

const SimpleFocusableCollection: StoryFn<MoverLiteProps> = (args) => {
    return createBasicMoverLite(args);
};

export const HorizontalAndVertical = SimpleFocusableCollection.bind({});

export const Circular = SimpleFocusableCollection.bind({});
Circular.args = { cyclic: true };

export const VerticalOnly = SimpleFocusableCollection.bind({});
VerticalOnly.args = { direction: MoverDirections.Vertical };

export const HorizontalOnly = SimpleFocusableCollection.bind({});
HorizontalOnly.args = { direction: MoverDirections.Horizontal };

export const Tabbable = SimpleFocusableCollection.bind({});
Tabbable.args = { tabbable: true };

const TableWithFocusableCells: StoryFn<MoverLiteProps> = (args) =>
    createTableMoverLite(args);

export const TableWithMoverGrid = TableWithFocusableCells.bind({});
