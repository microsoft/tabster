/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AbilityHelpers, Types } from 'ability-helpers';
import * as React from 'react';

const GroupContext = React.createContext<((group: HTMLElement, removed?: boolean) => void) | undefined>(undefined);

export type GroupState = Types.FocusableGroupState;

export interface GroupProperties {
    label?: string | ((state: GroupState) => string);
    isFocusable?: boolean;
    role?: string;
    isRowingRegion?: boolean;
    onChange?: (state: GroupState) => void;
}

export class Group extends React.Component<GroupProperties> {
    static contextType = GroupContext;
    context: ((group: HTMLElement, removed?: boolean) => void) | undefined;

    private _div: HTMLDivElement | undefined;
    private _childGroups: { [id: string]: Types.FocusableGroup } = {};

    render() {
        return (
            <div ref={ this._onRef } tabIndex={ this.props.isFocusable ? 0 : undefined }>
                <GroupContext.Provider value={ this._addChildGroup }>
                    { this.props.children }
                </GroupContext.Provider>
            </div>
        );
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
                AbilityHelpers.focusable.addGroup(div, { onChange: this._onChange });
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

    private _onChange = (state: GroupState) => {
        if (!this._div) {
            return;
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

        if (this.props.onChange) {
            this.props.onChange.call(this, state);
        }
    }

    private _setLabel(state: GroupState): boolean {
        const label = (typeof this.props.label === 'function')
            ? this.props.label.call(this, state)
            : (this.props.label !== undefined ? this.props.label : undefined);

        if (this._div && (label !== undefined)) {
            this._div.setAttribute('aria-label', label);

            return true;
        }

        return false;
    }

    private _getState(): GroupState {
        const ah = ((this._div as any).__abilityHelpers) as (Types.AbilityHelpersOnElement | undefined);
        const g = ah && ah.focusableGroup;

        if (g) {
            return g.getState();
        } else {
            throw new Error('Inconsistent element state');
        }
    }
}
