/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { getCurrentTabster, getTabsterAttribute } from 'tabster';

export class Modal extends React.PureComponent<{}, { isVisible: boolean }> {
    private portalNode: HTMLDivElement | undefined;

    constructor(props: {}) {
        super(props);
        this.state = { isVisible: false };
    }

    componentDidMount() {
        this.portalNode = document.createElement('div');
        document.body.appendChild(this.portalNode);
    }

    componentWillUnmount() {
        if (this.portalNode) {
            this.portalNode.remove();
        }
    }

    render() {
        if (!this.state.isVisible) {
            return null;
        }

        const modal = (
            <div className='lightbox'>
                <div ref={ this._onRef } aria-label='Modal' role='dialog' className='modal' {...getTabsterAttribute({ modalizer: { id: 'modal' }})}>
                    <header>
                        <h3>Modal dialog</h3>
                    </header>
                    <section>
                        This modal dialog should trap focus, but let the user tab into the browser.
                    </section>
                    <footer>
                        <button onClick={ this._onBtnClick }>Close</button>
                        <button onClick={ this._onBtnClick }>Dismiss</button>
                    </footer>
                </div>
            </div>
        );

        return ReactDOM.createPortal(modal, this.portalNode);
    }

    show() {
        this.setState({ isVisible: true });
    }

    private _onRef = (el: HTMLDivElement | null) => {
        const tabster = getCurrentTabster(window);
        if (el && tabster) {
            tabster.focusable.findFirst(el)?.focus();
        }
    }

    private _onBtnClick = () => {
        this.setState({ isVisible: false });
    }
}
