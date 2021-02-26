import * as React from 'react';
import { getCurrentAbilityHelpers, getDeloser, getModalizer, Types as AHTypes } from 'ability-helpers';

export class Modal extends React.PureComponent<{}, { isVisible: boolean }> {
    private _div: HTMLDivElement | undefined;
    private ahModalizer: AHTypes.ModalizerAPI | undefined = undefined;
    private ahDeloser: AHTypes.DeloserAPI | undefined = undefined;

    constructor(props: {}) {
        super(props);
        this.state = { isVisible: false };
        const ahInstance = getCurrentAbilityHelpers(window);
        if (ahInstance) {
            this.ahModalizer = getModalizer(ahInstance);
            this.ahDeloser = getDeloser(ahInstance);
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
        if (!this.ahModalizer || !this.ahDeloser) {
            return;
        }

        if (el) {
            this._div = el;
            this.ahModalizer.add(el, { id: 'modal' });
            this.ahDeloser.add(el);
            this.ahModalizer.focus(el);
        } else if (this._div) {
            this.ahModalizer.remove(this._div);
            this.ahDeloser.remove(this._div);
            this._div = undefined;
        }
    }

    private _onBtnClick = () => {
        this.setState({ isVisible: false });
    }
}