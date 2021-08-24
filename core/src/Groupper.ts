/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from 'keyborg';

import { FocusedElementState } from './State/FocusedElement';
import { getTabsterOnElement } from './Instance';
import { Keys } from './Keys';
import { RootAPI } from './Root';
import * as Types from './Types';
import { TabsterPart, WeakHTMLElement } from './Utils';

export class Groupper extends TabsterPart<Types.GroupperProps> implements Types.Groupper {
    private _shouldTabInside = false;
    private _first: WeakHTMLElement | undefined;

    constructor(
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        props: Types.GroupperProps
    ) {
        super(tabster, element, props);
        this.makeTabbable(false);
    }

    dispose(): void {
        const element = this._element.get();

        if (element) {
            if (__DEV__) {
                _setInformativeStyle(this._element, true);
            }
        }

        delete this._first;
    }

    findNextTabbable(current: HTMLElement, prev?: boolean): Types.NextTabbable | null {
        const container = this.getElement();

        if (!container || !container.contains(current)) {
            return null;
        }

        const tabster = this._tabster;
        let next: HTMLElement | null | undefined = null;
        let uncontrolled: HTMLElement | undefined;
        const onUncontrolled = (el: HTMLElement) => { uncontrolled = el; };

        if (this._shouldTabInside) {
            next = prev
                ? tabster.focusable.findPrev({ container, currentElement: current, onUncontrolled })
                : tabster.focusable.findNext({ container, currentElement: current, onUncontrolled });

            if (!uncontrolled && !next && (this._props.tabbability === Types.GroupperTabbabilities.LimitedTrapFocus)) {
                next = prev
                    ? tabster.focusable.findLast({ container })
                    : tabster.focusable.findFirst({ container });
            }
        }

        if (next === null) {
            const parentElement = container.parentElement;

            if (parentElement) {
                const parentCtx = RootAPI.getTabsterContext(tabster, parentElement);

                if (parentCtx) {
                    return FocusedElementState.findNextTabbable(tabster, parentCtx, current, prev);
                }
            }
        }

        return {
            element: next,
            uncontrolled,
        };
    }

    makeTabbable(isTabbable: boolean): void {
        this._shouldTabInside = isTabbable;

        if (__DEV__) {
            _setInformativeStyle(this._element, !this._shouldTabInside);
        }
    }

    shouldTabInside(): boolean {
        return this._shouldTabInside;
    }

    isActive(): boolean | undefined {
        const element = this.getElement() || null;
        let isParentActive = true;

        for (let e = element?.parentElement; e; e = e.parentElement) {
            const g = getTabsterOnElement(this._tabster, e)?.groupper as (Groupper | undefined);

            if (g) {
                if (!g._shouldTabInside) {
                    isParentActive = false;
                }
            }
        }

        return isParentActive ? (this._props.tabbability ? this._shouldTabInside : false) : undefined;
    }

    getFirst(): HTMLElement | undefined {
        const groupperElement = this.getElement();
        let first: HTMLElement | undefined;

        if (groupperElement) {
            first = this._first?.get();

            if (!first) {
                first = (this._tabster.focusable.isFocusable(groupperElement)
                    ? groupperElement
                    : this._tabster.focusable.findFirst({ container: groupperElement, ignoreUncontrolled: true })) || undefined;
            }
        }

        return first;
    }

    setFirst(element: HTMLElement | undefined): void {
        if (element) {
            this._first = new WeakHTMLElement(this._tabster.getWindow, element);
        } else {
            delete this._first;
        }
    }

    acceptElement(element: HTMLElement, state: Types.FocusableAcceptElementState): number | undefined {
        const {
            grouppers,
            container
        } = state;

        let cached = grouppers[this.id];

        if (!cached) {
            const isActive = this.isActive();
            const groupperElement = this.getElement();

            if (groupperElement) {
                const isInside = (groupperElement !== container) && container.contains(groupperElement);

                cached = grouppers[this.id] = {
                    isInside,
                    isActive
                };

                if (isInside && (isActive !== true)) {
                    const first = this.getFirst();

                    if (first && state.acceptCondition(first)) {
                        const focused = this._tabster.focusedElement.getFocusedElement();

                        cached.first = first;

                        if (focused) {
                            this.setFirst(groupperElement.contains(focused) ? undefined : first);
                        }
                    }
                }
            }
        }

        if (cached.isInside) {
            if (cached.isActive === undefined) {
                return NodeFilter.FILTER_REJECT;
            } else if (cached.isActive === false) {
                return (cached.first === element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        }

        return undefined;
    }
}

function validateGroupperProps(props: Types.GroupperProps): void {
    // TODO: Implement validation.
}

export class GroupperAPI implements Types.GroupperAPI, Types.GroupperInternalAPI {
    private _tabster: Types.TabsterCore;
    private _initTimer: number | undefined;
    private _win: Types.GetWindow;
    private _current: Record<string, Types.Groupper> = {};

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
        this._initTimer = getWindow().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        const win = this._win();

        this._tabster.focusedElement.subscribe(this._onFocus);

        win.document.addEventListener('mousedown', this._onMouseDown, true);
        win.addEventListener('keydown', this._onKeyDown, true);
    }

    protected dispose(): void {
        const win = this._win();

        this._current = {};

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        win.document.removeEventListener('mousedown', this._onMouseDown, true);
        win.removeEventListener('keydown', this._onKeyDown, true);
    }

    static dispose(instance: Types.GroupperAPI): void {
        (instance as GroupperAPI).dispose();
    }

    static createGroupper: Types.GroupperConstructor = (
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        props: Types.GroupperProps
    ): Types.Groupper => {
        if (__DEV__) {
            validateGroupperProps(props);
        }

        return new Groupper(tabster, element, props);
    }

    forgetCurrentGrouppers(): void {
        this._current = {};
    }

    private _onFocus = (element: HTMLElement | undefined): void => {
        if (element) {
            this._updateCurrent(element, false, true);
        }
    }

    private _onMouseDown = (e: MouseEvent): void => {
        if (e.target) {
            this._updateCurrent(e.target as HTMLElement, true);
        }
    }

    private _updateCurrent(element: HTMLElement, includeTarget?: boolean, checkTarget?: boolean): void {
        const newIds: Record<string, true> = {};

        let isTarget = true;

        for (let el = element as HTMLElement | null; el; el = el.parentElement) {
            const groupper = getTabsterOnElement(this._tabster, el)?.groupper;

            if (groupper) {
                newIds[groupper.id] = true;

                if (
                    isTarget &&
                    checkTarget &&
                    !groupper.shouldTabInside() &&
                    (
                        !groupper.getProps().tabbability ||
                        (
                            (el !== element) &&
                            (this._tabster.focusable.isFocusable(el) || (element !== groupper.getFirst()))
                        )
                    )
                ) {
                    isTarget = false;
                }

                if (includeTarget || !isTarget) {
                    this._current[groupper.id] = groupper;
                    groupper.makeTabbable(true);
                }

                isTarget = false;
            }
        }

        for (let id of Object.keys(this._current)) {
            const groupper = this._current[id];

            if (!(groupper.id in newIds)) {
                groupper.makeTabbable(false);
                groupper.setFirst(undefined);
                delete this._current[id];
            }
        }
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        if ((e.keyCode !== Keys.Enter) && (e.keyCode !== Keys.Esc)) {
            return;
        }

        const element = this._tabster.focusedElement.getFocusedElement();

        if (element) {
            let groupper = RootAPI.getTabsterContext(this._tabster, element)?.groupper;

            if (groupper) {
                let next: HTMLElement | null | undefined;

                if ((e.keyCode === Keys.Enter)) {
                    const groupperFirstFocusable = groupper.getFirst();

                    if ((groupperFirstFocusable !== element) || groupper.isActive()) {
                        return;
                    }

                    next = this._tabster.focusable.findFirst({ container: groupperFirstFocusable, ignoreGroupper: true });

                    if (next) {
                        this._updateCurrent(next);
                    }
                } else if (e.keyCode === Keys.Esc) {
                    let ge: HTMLElement | undefined;

                    for (let e: HTMLElement | null = element; e; e = e.parentElement) {
                        const g = getTabsterOnElement(this._tabster, e)?.groupper;

                        if (g && (g.isActive() || !g.getProps().tabbability)) {
                            ge = g.getElement();

                            if (ge) {
                                g.makeTabbable(false);

                                next = this._tabster.focusable.isFocusable(ge) ? ge : this._tabster.focusable.findFirst({ container: ge });

                                if (next) {
                                    break;
                                }
                            }
                        }
                    }
                }

                if (next) {
                    e.preventDefault();

                    nativeFocus(next);
                }
            }
        }
    }
}

function _setInformativeStyle(weakElement: Types.WeakHTMLElement, remove: boolean): void {
    if (__DEV__) {
        const element = weakElement.get();

        if (element) {
            if (remove) {
                element.style.removeProperty('--tabster-groupper');
            } else {
                element.style.setProperty(
                    '--tabster-groupper',
                    'unlimited'
                );
            }
        }
    }
}
