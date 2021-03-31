/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from 'react';
import { getTabsterAttribute, Types as TabsterTypes } from 'tabster';

export class Item extends React.PureComponent<{ onClick?: () => void}> {
    render() {
        return (
            <div
                tabIndex={0}
                className='item'
                { ...getTabsterAttribute({ groupper: {
                    isLimited: TabsterTypes.GroupperFocusLimits.LimitedTrapFocus
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
