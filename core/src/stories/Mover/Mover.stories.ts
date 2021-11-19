/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from '@storybook/html';
import { createBasicMover, MoverProps } from './Mover';
import { Types as TabsterTypes } from '../..';

export default {
    title: 'Mover',
    argTypes: {
        cyclic: { control: 'boolean' },
        direction: { control: 'select', options: TabsterTypes.MoverDirections },
        memorizeCurrent: { control: 'boolean' },
        tabbable: { control: 'boolean' },
        trackState: { control: 'boolean' },
        visibilityAware: { control: 'boolean' },
    },
} as Meta;

const SimpleFocusableCollection: Story<MoverProps> = (args) => {
    return createBasicMover(args);
};

export const HorizontalAndVertical = SimpleFocusableCollection.bind({});

export const Circular = SimpleFocusableCollection.bind({});
Circular.args = { cyclic: true };

export const VerticalOnly = SimpleFocusableCollection.bind({});
VerticalOnly.args = { direction: TabsterTypes.MoverDirections.Vertical };

export const HorizontalOnly = SimpleFocusableCollection.bind({});
HorizontalOnly.args = { direction: TabsterTypes.MoverDirections.Horizontal };

export const Tabbable = SimpleFocusableCollection.bind({});
Tabbable.args = { tabbable: true };
