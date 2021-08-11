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
import { TabsterPart, DummyInput } from './Utils';

interface DummyInputProps {
    shouldMoveOut?: boolean;
}

export class Groupper extends TabsterPart<Types.GroupperBasicProps, Types.GroupperExtendedProps> implements Types.Groupper {
    private _isUnlimited = false;
    private preDummy: DummyInput<DummyInputProps>;
    private postDummy: DummyInput<DummyInputProps>;

    constructor(
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        basic?: Types.GroupperBasicProps,
        extended?: Types.GroupperExtendedProps
    ) {
        super(tabster, element, basic, extended);
        this.makeUnlimited(false);

        const getWin = tabster.getWindow;
        this.preDummy = new DummyInput(getWin, false, this._onFocusDummyInput, this._onBlurDummyInput, {});
        this.postDummy = new DummyInput(getWin, false, this._onFocusDummyInput, this._onBlurDummyInput, {});
        this._addDummyInputs();
    }

    private _onFocusDummyInput = (input: HTMLDivElement, props: DummyInputProps) => {
        const container = this._element.get();
        if (container && !props.shouldMoveOut) {
            this._tabster.focusedElement.focusFirst({ container });
        }
    }

    private _onBlurDummyInput = (input: HTMLDivElement, props: DummyInputProps) => {
        props.shouldMoveOut = false;
    }

    private _addDummyInputs() {
        const element = this._element.get();
        if (element) {
            if (this.postDummy.input) {
                element.appendChild(this.postDummy.input);
            }

            if (this.preDummy.input) {
                element.prepend(this.preDummy.input);
            }
        }
    }

    dispose(): void {
        const element = this._element.get();

        if (element) {
            if (__DEV__) {
                _setInformativeStyle(this._element, true);
            }
        }

        this.preDummy.dispose();
        this.postDummy.dispose();
    }

    moveOutWithDefaultAction(backwards: boolean): void {
        const first = this.preDummy;
        const last = this.postDummy;

        if (first?.input && last?.input) {
            if (backwards) {
                first.props.shouldMoveOut = true;
                nativeFocus(first.input);
            } else {
                last.props.shouldMoveOut = true;
                nativeFocus(last.input);
            }
        }
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

        if (this._isUnlimited) {
            next = prev
                ? tabster.focusable.findPrev({ container, currentElement: current, onUncontrolled })
                : tabster.focusable.findNext({ container, currentElement: current, onUncontrolled });

            if (!uncontrolled && !next && (this._basic.tabbability === Types.GroupperTabbabilities.LimitedTrapFocus)) {
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

    makeUnlimited(isUnlimited: boolean): void {
        this._isUnlimited = isUnlimited;

        if (__DEV__) {
            _setInformativeStyle(this._element, !this._isUnlimited);
        }
    }

    isUnlimited(): boolean {
        return this._isUnlimited;
    }

    isActive(): boolean | undefined {
        const element = this.getElement() || null;
        let isParentActive = true;

        for (let e = element?.parentElement; e; e = e.parentElement) {
            const g = getTabsterOnElement(this._tabster, e)?.groupper as (Groupper | undefined);

            if (g) {
                if (!g._isUnlimited) {
                    isParentActive = false;
                }
            }
        }

        return isParentActive ? this._isUnlimited : undefined;
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
                    cached.first = state.acceptCondition(groupperElement)
                        ? groupperElement
                        : this._tabster.focusable.findElement({
                            container: groupperElement,
                            includeProgrammaticallyFocusable: state.includeProgrammaticallyFocusable,
                            ignoreGroupper: state.ignoreGroupper,
                            acceptCondition: state.acceptCondition,
                        });
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

export class GroupperAPI implements Types.GroupperAPI, Types.GroupperInternalAPI {
    private _tabster: Types.TabsterCore;
    private _initTimer: number | undefined;
    private _win: Types.GetWindow;
    private _unlimited: { [id: string]: Types.Groupper } = {};

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
        basic?: Types.GroupperBasicProps,
        extended?: Types.GroupperExtendedProps
    ): Types.Groupper => {
        return new Groupper(tabster, element, basic, extended);
    }

    forgetUnlimitedGrouppers(): void {
        this._unlimited = {};
    }

    private _onFocus = (element: HTMLElement | undefined): void => {
        if (element) {
            this._updateUnlimited(element, false, true);
        }
    }

    private _onMouseDown = (e: MouseEvent): void => {
        if (e.target) {
            this._updateUnlimited(e.target as HTMLElement, true);
        }
    }

    private _updateUnlimited(element: HTMLElement, includeTarget?: boolean, checkTarget?: boolean): void {
        for (let id of Object.keys(this._unlimited)) {
            const groupper = this._unlimited[id];
            const groupperContainer = groupper.getElement();

            if (!groupperContainer?.contains(element)) {
                groupper.makeUnlimited(false);
                delete this._unlimited[id];
            }
        }

        let isTarget = true;

        for (let el = element as HTMLElement | null; el; el = el.parentElement) {
            const groupper = getTabsterOnElement(this._tabster, el)?.groupper;

            if (groupper) {
                if (
                    isTarget &&
                    checkTarget &&
                    !groupper.isUnlimited() &&
                    (
                        (
                            (groupper.getBasicProps().tabbability || Types.GroupperTabbabilities.Unlimited) ===
                                Types.GroupperTabbabilities.Unlimited
                        ) ||
                        (
                            (el !== element) &&
                            (this._tabster.focusable.isFocusable(el) || (element !== this._tabster.focusable.findFirst({ container: el })))
                        )
                    )
                ) {
                    isTarget = false;
                }

                if (includeTarget || !isTarget) {
                    this._unlimited[groupper.id] = groupper;
                    groupper.makeUnlimited(true);
                }

                isTarget = false;
            }
        }
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        if ((e.keyCode !== Keys.Enter) && (e.keyCode !== Keys.Esc) && (e.keyCode !== Keys.Tab)) {
            return;
        }

        const element = this._tabster.focusedElement.getFocusedElement();

        if (element) {
            let ctx = RootAPI.getTabsterContext(this._tabster, element);
            let groupper = ctx?.groupper;

            if (ctx && groupper) {
                const groupperElement = groupper.getElement();
                let next: HTMLElement | null | undefined;
                let isPrev = e.shiftKey;

                if ((e.keyCode === Keys.Enter)) {
                    if ((groupperElement !== element) || groupper.isActive()) {
                        return;
                    }

                    next = this._tabster.focusable.findFirst({ container: groupperElement, ignoreGroupper: true });

                    if (next) {
                        this._updateUnlimited(next);
                    }
                } else if (e.keyCode === Keys.Esc) {
                    let ge: HTMLElement | undefined;

                    for (let e: HTMLElement | null = element; e; e = e.parentElement) {
                        const g = getTabsterOnElement(this._tabster, e)?.groupper;

                        if (g?.isActive()) {
                            ge = g.getElement();

                            if (ge) {
                                g.makeUnlimited(false);

                                next = this._tabster.focusable.isFocusable(ge) ? ge : this._tabster.focusable.findFirst({ container: ge });

                                if (next) {
                                    break;
                                }
                            }
                        }
                    }

                    if (ge) {
                        this._updateUnlimited(ge);
                    }
                } else if (e.keyCode === Keys.Tab) {
                    next = FocusedElementState.findNextTabbable(this._tabster, ctx, element, isPrev)?.element;
                }

                if (next) {
                    e.preventDefault();

                    nativeFocus(next);
                } else {
                    groupper.moveOutWithDefaultAction(isPrev);
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
