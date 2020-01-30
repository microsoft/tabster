/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbilityHelpers, Types } from 'ability-helpers';
import * as React from 'react';

const ListItemContext = React.createContext<((group: HTMLElement, removed?: boolean) => void) | undefined>(undefined);

export type ListItemState = Types.FocusableGroupState;

export import NextListItemDirection = Types.FocusableGroupNextDirection;

type ListItemHTMLProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-label'>;

export interface ListItemProps extends ListItemHTMLProps {
    as?: React.ReactType;
    label?: string | ((state: ListItemState) => string);
    isLimited?: boolean;
    isRowingRegion?: boolean;
    nextGroupDirection?: NextListItemDirection;
    onStateChange?: (state: ListItemState) => void;
    showDebug?: boolean;
}

export class ListItem extends React.Component<ListItemProps> {
    static contextType = ListItemContext;
    context: ((group: HTMLElement, removed?: boolean) => void) | undefined;

    private _div: HTMLDivElement | undefined;
    private _childGroups: { [id: string]: Types.FocusableGroup } = {};

    render() {
        const {
            as: _as,
            role,
            label,
            isLimited,
            isRowingRegion,
            nextGroupDirection,
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
            AbilityHelpers.focusable.setGroupProps(this._div, this._buildGroupProps());
        }
    }

    private _onRef = (div: HTMLDivElement | null) => {
        if (div) {
            this._addGroup(div);
        } else if (this._div) {
            this._removeGroup();
        }
    }

    private _addChildGroup = (group: HTMLElement, removed?: boolean) => {
        const ah = ((group as any).__abilityHelpers) as (Types.AbilityHelpersOnElement | undefined);
        const g = ah && ah.focusableGroup;

        if (g) {
            if (removed) {
                delete this._childGroups[g.id];
            } else {
                this._childGroups[g.id] = g;
            }
        }
    }

    private _buildGroupProps(): Types.FocusableGroupProps {
        return {
            onChange: this._onChange,
            isLimited: this.props.isLimited ? Types.FocusableGroupFocusLimit.LimitedTrapFocus : undefined,
            nextDirection: this.props.nextGroupDirection
        };
    }

    private _addGroup(div: HTMLDivElement | null) {
        if (this._div === div) {
            return;
        }

        if (div) {
            if (this._div) {
                if (this.context) {
                    this.context(this._div, true);
                }

                AbilityHelpers.focusable.moveGroup(this._div, div);
            } else {
                AbilityHelpers.focusable.addGroup(div, this._buildGroupProps());
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

            AbilityHelpers.focusable.removeGroup(this._div);

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
                : ((state.isVisible === 2) ? 'rgba(0,255,0,.2)' : 'rgba(0,0,255,.2)');
        }

        if ((state.isVisible === 2) || (state.isCurrent !== undefined)) {
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
        const ah = ((this._div as any).__abilityHelpers) as (Types.AbilityHelpersOnElement | undefined);
        const g = ah && ah.focusableGroup;

        if (g) {
            return g.getState();
        } else {
            throw new Error('Inconsistent element state');
        }
    }
}
