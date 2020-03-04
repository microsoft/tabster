/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpers, setupAbilityHelpers, Types } from 'ability-helpers';
import * as React from 'react';

setupAbilityHelpers(window);
const AbilityHelpers = getAbilityHelpers();

const ListItemContext = React.createContext<((group: HTMLElement, removed?: boolean) => void) | undefined>(undefined);

export type ListItemState = Types.GroupperState;

export import NextListItemDirection = Types.GroupperNextDirection;

type ListItemHTMLProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-label'>;

export interface ListItemProps extends ListItemHTMLProps {
    as?: React.ReactType;
    label?: string | ((state: ListItemState) => string);
    isLimited?: boolean;
    isRowingRegion?: boolean;
    nextItemDirection?: NextListItemDirection;
    onStateChange?: (state: ListItemState) => void;
    showDebug?: boolean;
}

export class ListItem extends React.Component<ListItemProps> {
    static contextType = ListItemContext;
    context: ((group: HTMLElement, removed?: boolean) => void) | undefined;

    private _div: HTMLDivElement | undefined;
    private _childGroups: { [id: string]: Types.Groupper } = {};

    render() {
        const {
            as: _as,
            role,
            label,
            isLimited,
            isRowingRegion,
            nextItemDirection: nextGroupDirection,
            onStateChange: onGroupChange,
            ...restProps
        } = this.props;

        return React.createElement(
            _as || 'div',
            {
                ref: this._onRef,
                ...restProps
            },
            (
                <ListItemContext.Provider value={ this._addChildGroup }>
                    { this.props.children }
                </ListItemContext.Provider>
            )
        );
    }

    componentDidUpdate() {
        if (this._div) {
            const props = this._buildGroupperProps();
            AbilityHelpers.focusable.setGroupperProps(this._div, props.basic, props.extended);
        }
    }

    private _onRef = (div: HTMLDivElement | null) => {
        if (div) {
            this._addGroupper(div);
        } else if (this._div) {
            this._removeGroup();
        }
    }

    private _addChildGroup = (group: HTMLElement, removed?: boolean) => {
        const ah = ((group as any).__ah) as (Types.AbilityHelpersOnElement | undefined);
        const g = ah && ah.groupper;

        if (g) {
            if (removed) {
                delete this._childGroups[g.id];
            } else {
                this._childGroups[g.id] = g;
            }
        }
    }

    private _buildGroupperProps(): { basic: Types.GroupperBasicProps, extended: Types.GroupperExtendedProps } {
        return {
            basic: {
                isLimited: this.props.isLimited ? Types.GroupperFocusLimit.LimitedTrapFocus : undefined,
                nextDirection: this.props.nextItemDirection
            },
            extended: {
                onChange: this._onChange
            }
        };
    }

    private _addGroupper(div: HTMLDivElement | null) {
        if (this._div === div) {
            return;
        }

        if (div) {
            if (this._div) {
                if (this.context) {
                    this.context(this._div, true);
                }

                AbilityHelpers.focusable.moveGroupper(this._div, div);
            } else {
                const props = this._buildGroupperProps();
                AbilityHelpers.focusable.addGroupper(div, props.basic, props.extended);
            }

            if (this.context) {
                this.context(div);
            }

            this._div = div;

            this._onChange(this._getState());
        } else {
            this._removeGroup();
        }
    }

    private _removeGroup() {
        if (this._div) {
            if (this.context) {
                this.context(this._div, true);
            }

            AbilityHelpers.focusable.removeGroupper(this._div);

            this._div.removeAttribute('aria-label');

            this._div = undefined;
        }
    }

    private _onChange = (state: ListItemState) => {
        if (!this._div) {
            return;
        }

        if (this.props.showDebug) {
            this._div.style.backgroundColor = (state.isVisible === 0)
                ? 'rgba(255,0,0,.2)'
                : ((state.isVisible === Types.ElementVisibility.Visible) ? 'rgba(0,255,0,.2)' : 'rgba(0,0,255,.2)');

            this._div.style.borderLeftColor = state.isFirst ? 'red' : (state.isLast ? 'orange' : '#aaa');
            this._div.style.borderTopColor = state.isNext ? 'green' : (state.isPrevious ? 'maroon' : '#aaa');
            this._div.style.borderRightColor = state.hasFocus ? 'yellow' : (state.siblingHasFocus ? 'blue' : '#aaa');
            this._div.style.borderBottomColor = state.isCurrent ? 'black' : '#aaa';
        }

        if (
            (state.isVisible === Types.ElementVisibility.Visible) ||
            (state.isCurrent !== undefined) ||
            (!state.siblingIsVisible && (state.isVisible === Types.ElementVisibility.PartiallyVisible))
        ) {
            this._div.removeAttribute('aria-hidden');
        } else {
            this._div.setAttribute('aria-hidden', 'true');
        }

        const hasLabel = this._setLabel(state);

        let role: string | undefined;

        if (this.props.isRowingRegion) {
            const isRegion = (state.isCurrent || state.isFirst || state.isLast || state.isNext || state.isPrevious);

            role = isRegion ? 'region' : this.props.role;
        }

        if (role === undefined) {
            role = this.props.role || 'group';
        }

        if (hasLabel && ((role === 'none') || (role === 'presentation'))) {
            throw new Error('A presentation only element cannot have a label');
        }

        if (role && (this._div.getAttribute('role') !== role)) {
            this._div.setAttribute('role', role);
        }

        if (this.props.onStateChange) {
            this.props.onStateChange.call(this, state);
        }
    }

    private _setLabel(state: ListItemState): boolean {
        const label = (typeof this.props.label === 'function')
            ? this.props.label.call(this, state)
            : (this.props.label !== undefined ? this.props.label : undefined);

        if (this._div && (label !== undefined)) {
            this._div.setAttribute('aria-label', label);

            return true;
        }

        return false;
    }

    private _getState(): ListItemState {
        const ah = ((this._div as any).__ah) as (Types.AbilityHelpersOnElement | undefined);
        const g = ah && ah.groupper;

        if (g) {
            return g.getState();
        } else {
            throw new Error('Inconsistent element state');
        }
    }
}
