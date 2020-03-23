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

function getAH() {
    return getAbilityHelpersAttribute({
        groupper: {
            isLimited: AHTypes.GroupperFocusLimit.LimitedTrapFocus
        }
    });
}

ReactDOM.render(
    <div { ...getAbilityHelpersAttribute({ root: true }) }>
        <div aria-label='Modal 1' { ...getAbilityHelpersAttribute({ modalizer: { id: 'momo1'}, deloser: true }) }>
            <button>Hello</button>
            <button>Hello</button>
        </div>
        <div aria-label='Modal 2' { ...getAbilityHelpersAttribute({ modalizer: { id: 'momo2'}, deloser: true }) }>
            <h1>Hello world</h1>

            <p><button>Hello</button></p>

            <div style={ { overflow: 'scroll', height: '600px' } }>
                <div tabIndex={0} className='li' { ...getAH() }>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                </div>

                <div tabIndex={0} className='li' { ...getAH() }>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                </div>

                <div tabIndex={0} className='li' { ...getAH() }>
                    <div>
                        <div tabIndex={0} className='li' { ...getAH() }>
                            <button onClick={() => { alert(3737); }}>Hello</button>
                            <button onClick={() => { alert(3737); }}>Hello</button>
                        </div>

                        <div tabIndex={0} className='li' { ...getAH() }>
                            <div>
                            <div tabIndex={0} className='li' { ...getAH() }>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                            </div>

                            <div tabIndex={0} className='li' { ...getAH() }>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                            </div>

                            <div tabIndex={0} className='li' { ...getAH() }>
                                <div>
                                <div tabIndex={0} className='li' { ...getAH() }>
                                    <button onClick={() => { alert(3737); }}>Hello</button>
                                    <button onClick={() => { alert(3737); }}>Hello</button>
                                </div>

                                <div tabIndex={0} className='li' { ...getAH() }>
                                    <button onClick={() => { alert(3737); }}>Hello</button>
                                    <button onClick={() => { alert(3737); }}>Hello</button>
                                </div>

                                <div tabIndex={0} className='li' { ...getAH() }>
                                    <button onClick={() => { alert(3737); }}>Hello</button>
                                    <button onClick={() => { alert(3737); }}>Hello</button>
                                </div>
                                </div>
                            </div>

                            <div tabIndex={0} className='li' { ...getAH() }>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                            </div>

                            <div tabIndex={0} className='li' { ...getAH() }>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                                <button onClick={() => { alert(3737); }}>Hello</button>
                            </div>
                            </div>
                        </div>

                        <div tabIndex={0} className='li' { ...getAH() }>
                            <button onClick={() => { alert(3737); }}>Hello</button>
                            <button onClick={() => { alert(3737); }}>Hello</button>
                        </div>
                    </div>
                </div>

                <div tabIndex={0} className='li' { ...getAH() }>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                </div>

                <div tabIndex={0} className='li' { ...getAH() }>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                    <button onClick={() => { alert(3737); }}>Hello</button>
                </div>
            </div>

            <p><button>Hello</button></p>
        </div>
    </div>,

    document.getElementById('demo')
);
