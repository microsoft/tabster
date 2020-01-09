/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Group, GroupState } from 'ability-helpers-react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

ReactDOM.render(
    <>
        <h1>Hello world</h1>

        <button>Lalala</button>

        <Group label='Hello' onChange={ onGroupChange }>
            <button>Button1</button>
            <button>Button2</button>
        </Group>
        <Group label={ (state) => 'World ' + JSON.stringify(state) } onChange={ onGroupChange }>
            <button>Button3</button>
            <button>Button4</button>
        </Group>

        <button>Piu-piu</button>
    </>,

    document.getElementById('demo')
);

function onGroupChange(this: Group, state: GroupState) {
    const div = ReactDOM.findDOMNode(this) as HTMLDivElement | null;

    if (div) {
        div.style.border = state.isCurrent ? '3px solid blue' : 'none';
    }
}
