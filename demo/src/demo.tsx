/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
    createTabster,
    getCurrentTabster,
    getDeloser,
    getGroupper,
    getModalizer,
    getMover,
    getOutline,
    getTabsterAttribute,
    Types as TabsterTypes,
} from 'tabster';

const tabster = createTabster(window);
getGroupper(tabster);
getMover(tabster);
const tabsterModalizer = getModalizer(tabster);
const tabsterDeloser = getDeloser(tabster);
const tabsterOutline = getOutline(tabster);
tabsterOutline.setup();

class App extends React.PureComponent {
    private _modal: Modal | undefined;

    render() {
        return (
            <div { ...getTabsterAttribute({ root: {} }) }>
                <TabsterExistsExample />
                <div { ...getTabsterAttribute({ deloser: {} }) }>
                    <h1>Hello world</h1>

                    <div { ...getTabsterAttribute({
                        mover:
                            {
                                direction: TabsterTypes.MoverDirections.Horizontal,
                                tabbable: true
                            }
                        }) }>
                        <button>A</button>
                        <button>bunch</button>
                        <button>of</button>
                        <button>buttons</button>
                        <button>which</button>
                        <button>are</button>
                        <button>navigable</button>
                        <button>using</button>
                        <button>left/right</button>
                        <button>arrows</button>
                        <button>and</button>
                        <button>tabs</button>
                    </div>

                    <div { ...getTabsterAttribute({ mover: {
                        direction: TabsterTypes.MoverDirections.Grid
                    } }) }>
                        <br/><br/>
                        <button>A</button>
                        <button>bunch</button>
                        <button>of</button>
                        <button>buttons</button>
                        <button>which</button>
                        <button>are</button>
                        <button>navigable</button>
                        <button>using</button>
                        <button>arrows</button>
                        <button>as</button>
                        <button>a</button>
                        <button>gird</button>
                        <button>A</button>
                        <button>bunch</button>
                        <button>of</button>
                        <button>buttons</button>
                        <button>which</button>
                        <button>are</button>
                        <button>navigable</button>
                        <button>using</button>
                        <button>arrows</button>
                        <button>as</button>
                        <button>a</button>
                        <button>gird</button>
                        <button>A</button>
                        <button>bunch</button>
                        <button>of</button>
                        <button>buttons</button>
                        <button>which</button>
                        <button>are</button>
                        <button>navigable</button>
                        <button>using</button>
                        <button>arrows</button>
                        <button>as</button>
                        <button>a</button>
                        <button>gird</button>
                        <button>A</button>
                        <button>bunch</button>
                        <button>of</button>
                        <button>buttons</button>
                        <button>which</button>
                        <button>are</button>
                        <button>navigable</button>
                        <button>using</button>
                        <button>arrows</button>
                        <button>as</button>
                        <button>a</button>
                        <button>gird</button>
                        <br/><br/>
                    </div>

                    <div { ...getTabsterAttribute({ mover: {
                        tabbable: false,
                        cyclic: true,
                        direction: TabsterTypes.MoverDirections.Vertical,
                        memorizeCurrent: true
                    } }) }>
                        <button>The</button>
                        <button>same</button>
                        <button>arrow</button>
                        <button>navigation</button>
                        <button>but</button>
                        <button>using</button>
                        <button>up/down</button>
                        <button>arrows</button>
                        <button>and</button>
                        <button>cyclic</button>
                    </div>

                    <div { ...getTabsterAttribute({ mover: {
                        tabbable: false,
                        cyclic: true,
                        trackState: true,
                        visibilityAware: TabsterTypes.Visibilities.Visible
                    } }) } style={{height: 300, overflow: 'scroll'}}>
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

                    <FindAllExample />
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
                { ...getTabsterAttribute({ groupper: {
                    tabbability: TabsterTypes.GroupperTabbabilities.LimitedTrapFocus
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

const TabsterExistsExample: React.FC = () => (<div>Tabster instance exists on window: {getCurrentTabster(window) ? 'true' : 'false'}</div>);

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
            tabsterModalizer.add(el, { id: 'modal' });
            tabsterDeloser.add(el);
            tabsterModalizer.focus(el);
        } else if (this._div) {
            tabsterModalizer.remove(this._div);
            tabsterDeloser.remove(this._div);
            this._div = undefined;
        }
    }

    private _onBtnClick = () => {
        this.setState({ isVisible: false });
    }
}

const FindAllExample: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const [filtered, setFiltered] = React.useState<HTMLElement[]>([]);
    React.useEffect(() => {
        if (ref.current) {
            const ducks = tabster.focusable.findAll({
                container: ref?.current,
                acceptCondition: (el: HTMLElement) => !!el.textContent?.includes('Duck')
            });
            setFiltered(ducks);
        }
    }, []);

    return (
        <div>
            <div>Filtered ducks: {filtered.map(item => item.textContent + ', ')} </div>
            <div ref={ref}>
                <button>Duck 1</button>
                <button>Goose 1</button>
                <button>Goose 2</button>
                <button>Duck 2</button>
                <button>Duck 3</button>
                <button>Goose 3</button>
            </div>
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('demo'));
