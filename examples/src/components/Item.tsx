import { getAbilityHelpersAttribute, Types as AHTypes } from 'ability-helpers';
import * as React from 'react';

export class Item extends React.PureComponent<{ onClick?: () => void}> {
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