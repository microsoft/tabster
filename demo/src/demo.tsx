/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { abilityHelpersExists, createAbilityHelpers, getAbilityHelpersAttribute, getDeloser, getModalizer, getOutline, Types as AHTypes } from 'ability-helpers';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

const ah = createAbilityHelpers(window);
const ahModalizer = getModalizer(ah);
const ahDeloser = getDeloser(ah);
const ahOutline = getOutline(ah);
ahOutline.setup();

class App extends React.PureComponent {
    private _modal: Modal | undefined;

    render() {
        return (
            <div { ...getAbilityHelpersAttribute({ root: {} }) }>
                <AHExistsExample />
                <div aria-label='Main' { ...getAbilityHelpersAttribute({ modalizer: { id: 'main' }, deloser: {} }) }>
                    <h1>Hello world</h1>

                    <div { ...getAbilityHelpersAttribute({ focusable: { mover: { navigationType: AHTypes.MoverKeys.Arrows } } }) }>
                        <button>A</button>
                        <button>bunch</button>
                        <button>of</button>
                        <button>buttons</button>
                        <button>which</button>
                        <button>are</button>
                        <button>navigable</button>
                        <button>using</button>
                        <button>arrows</button>
                        <button>instead</button>
                        <button>of</button>
                        <button>tabs</button>
                    </div>

                    <div { ...getAbilityHelpersAttribute({ focusable: { mover: { navigationType: AHTypes.MoverKeys.Arrows, cyclic: true } } }) }>
                        <button>The</button>
                        <button>same</button>
                        <button>arrow</button>
                        <button>navigation</button>
                        <button>but</button>
                        <button>is</button>
                        <button>cyclic</button>
                    </div>

                    <div>
                        <Item onClick={ this._onClick } />
                        <Item onClick={ this._onClick } />

                        <Item onClick={ this._onClick }>
                            <div>
                                <Item onClick={ this._onClick } />

                                <Item onClick={ this._onClick }>
                                    <div>
                                        <Item onClick={ this._onClick } />
                                        <Item onClick={ this._onClick } />

                                        <Item onClick={ this._onClick }>
                                            <div>
                                                <Item onClick={ this._onClick } />
                                                <Item onClick={ this._onClick } />
                                                <Item onClick={ this._onClick } />
                                            </div>
                                        </Item>

                                        <Item onClick={ this._onClick } />
                                        <Item onClick={ this._onClick } />
                                    </div>
                                </Item>

                                <Item onClick={ this._onClick } />
                            </div>
                        </Item>

                        <Item onClick={ this._onClick } />
                        <Item onClick={ this._onClick } />
                    </div>
                </div>

                <Modal ref={ this._onModalRef } />
            </div>
        );
    }

    private _onModalRef = (ref: Modal | null) => {
        this._modal = ref || undefined;
    }

    private _onClick = () => {
        if (this._modal) {
            this._modal.show();
        }
    }
}

class Item extends React.PureComponent<{ onClick: () => void }> {
    render() {
        return (
            <div
                tabIndex={0}
                className='item'
                { ...getAbilityHelpersAttribute({ groupper: {
                    isLimited: AHTypes.GroupperFocusLimits.LimitedTrapFocus
                }})}
            >
                { this.props.children
                    ? this.props.children
                    : (<>
                        <button onClick={ this.props.onClick }>Hello</button>
                        <button onClick={ this.props.onClick }>World</button>
                    </>)
                }
            </div>
        );
    }
}

const AHExistsExample: React.FC = () => (<div>Ability Helpers instance exists on window: {abilityHelpersExists(window).toString()}</div>);

class Modal extends React.PureComponent<{}, { isVisible: boolean }> {
    private _div: HTMLDivElement | undefined;

    constructor(props: {}) {
        super(props);
        this.state = { isVisible: false };
    }

    render() {
        if (!this.state.isVisible) {
            return null;
        }

        return (
            <div>
                <div className='lightbox'></div>
                <div ref={ this._onRef } aria-label='Modal' role='region' className='modal'>
                    <h3>Piu piu</h3>
                    <button onClick={ this._onBtnClick }>Close</button>
                    &nbsp;or&nbsp;
                    <button onClick={ this._onBtnClick }>Dismiss</button>
                </div>
            </div>
        );
    }

    show() {
        this.setState({ isVisible: true });
    }

    private _onRef = (el: HTMLDivElement | null) => {
        if (el) {
            this._div = el;
            ahModalizer.add(el, { id: 'modal' });
            ahDeloser.add(el);
            ahModalizer.focus(el);
        } else if (this._div) {
            ahModalizer.remove(this._div);
            ahDeloser.remove(this._div);
            this._div = undefined;
        }
    }

    private _onBtnClick = () => {
        this.setState({ isVisible: false });
    }
}

ReactDOM.render(<App />, document.getElementById('demo'));
