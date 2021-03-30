import * as React from 'react';
import { getCurrentTabster, getDeloser, getModalizer, Types as TabsterTypes } from 'tabster';

export class Modal extends React.PureComponent<{}, { isVisible: boolean }> {
    private _div: HTMLDivElement | undefined;
    private tabsterModalizer: TabsterTypes.ModalizerAPI | undefined = undefined;
    private tabsterDeloser: TabsterTypes.DeloserAPI | undefined = undefined;

    constructor(props: {}) {
        super(props);
        this.state = { isVisible: false };
        const tabsterInstance = getCurrentTabster(window);
        if (tabsterInstance) {
            this.tabsterModalizer = getModalizer(tabsterInstance);
            this.tabsterDeloser = getDeloser(tabsterInstance);
        }
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
        if (!this.tabsterModalizer || !this.tabsterDeloser) {
            return;
        }

        if (el) {
            this._div = el;
            this.tabsterModalizer.add(el, { id: 'modal' });
            this.tabsterDeloser.add(el);
            this.tabsterModalizer.focus(el);
        } else if (this._div) {
            this.tabsterModalizer.remove(this._div);
            this.tabsterDeloser.remove(this._div);
            this._div = undefined;
        }
    }

    private _onBtnClick = () => {
        this.setState({ isVisible: false });
    }
}