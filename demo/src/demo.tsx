/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpers, getAbilityHelpersAttribute, setupAbilityHelpers, Types as AHTypes } from 'ability-helpers';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

setupAbilityHelpers(window);

const AH = getAbilityHelpers();
AH.outline.setup();

function Item(props: React.Props<{}>) {
    return (
        <div
            tabIndex={0}
            className='item'
            { ...getAbilityHelpersAttribute({ groupper: {
                isLimited: AHTypes.GroupperFocusLimit.LimitedTrapFocus
            }})}
        >
            { props.children
                ? props.children
                : ([
                    <button onClick={() => { alert('Ololo'); }}>Hello</button>,
                    <button onClick={() => { alert('Piupiu'); }}>World</button>
                ])
            }
        </div>
    );
}

ReactDOM.render(
    <div { ...getAbilityHelpersAttribute({ root: {}, deloser: {} }) }>
        <h1>Hello world</h1>

        <p><button>Hello</button></p>

        <div style={ { overflow: 'scroll', height: '600px' } }>
            <Item />
            <Item />

            <Item>
                <div>
                    <Item />

                    <Item>
                        <div>
                            <Item />
                            <Item />

                            <Item>
                                <div>
                                    <Item />
                                    <Item />
                                    <Item />
                                </div>
                            </Item>

                            <Item />
                            <Item />
                        </div>
                    </Item>

                    <Item />
                </div>
            </Item>

            <Item />
            <Item />
        </div>

        <p><button>Hello</button></p>
    </div>,

    document.getElementById('demo')
);
