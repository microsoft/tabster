/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from "@storybook/html";
import { MoverDirections } from "tabster";
import { createBasicMover, createTableMover, createTestTableMover, MoverProps } from "./Mover";

export default {
    title: "Mover",
    argTypes: {
        cyclic: { control: "boolean" },
        direction: { control: "select", options: MoverDirections },
        memorizeCurrent: { control: "boolean" },
        tabbable: { control: "boolean" },
        trackState: { control: "boolean" },
        visibilityAware: { control: "boolean" },
    },
} as Meta;

const SimpleFocusableCollection: Story<MoverProps> = (args) => {
    return createBasicMover(args);
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

const TableWithFocusableCells: Story<MoverProps> = (args) =>
    createTableMover(args);

export const TableWithMoverGrid = TableWithFocusableCells.bind({});

const TestTableWithFocusableCells: Story<MoverProps> = () =>
    createTestTableMover();

export const TestTableWithMoverGrid = TestTableWithFocusableCells.bind({});
