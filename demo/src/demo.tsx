/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ListItem, ListItemState, NextListItemDirection } from 'ability-helpers-react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

ReactDOM.render(
    <>
        <h1>Hello world</h1>

        <button>Lalala</button>

        <div
            data-ah='{"nextItemDirection": 1, "isLimited": true}'
            //onStateChange={() => {}}
        >

        </div>

        <ListItem
            label='Hello'
            onStateChange={ onStateChange }
            tabIndex={ 0 }
            isLimited={ true }
            nextItemDirection={ NextListItemDirection.Grid }
        >
            <button>Button1</button>
            <button>Button2</button>
        </ListItem>
        <ListItem
            tabIndex={ 0 }
            nextItemDirection={ NextListItemDirection.Grid }
            isLimited={ true }
            label={ (state) => 'World ' + JSON.stringify(state) }
            onStateChange={ onStateChange }
        >
            <button>Button3</button>
            <button>Button4</button>
        </ListItem>

        <button>Piu-piu</button>
    </>,

    document.getElementById('demo')
);

function onStateChange(this: ListItem, state: ListItemState) {
    const div = ReactDOM.findDOMNode(this) as HTMLDivElement | null;

    if (div) {
        div.style.border = state.isCurrent ? '3px solid blue' : 'none';
    }
}
