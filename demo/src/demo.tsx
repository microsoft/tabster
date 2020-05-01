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

class App extends React.PureComponent {
    private _modal: Modal | undefined;

    render() {
        return (
            <div { ...getAbilityHelpersAttribute({ root: {} }) }>
                <div aria-label='Main' { ...getAbilityHelpersAttribute({ modalizer: { id: 'main' }, deloser: {} }) }>
                    <h1>Hello world</h1>

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
                    isLimited: AHTypes.GroupperFocusLimit.LimitedTrapFocus
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
            AH.modalizer.add(el, { id: 'modal' });
            AH.deloser.add(el);
            AH.modalizer.focus(el);
        } else if (this._div) {
            AH.modalizer.remove(this._div);
            AH.deloser.remove(this._div);
            this._div = undefined;
        }
    }

    private _onBtnClick = () => {
        this.setState({ isVisible: false });
    }
}

ReactDOM.render(<App />, document.getElementById('demo'));
