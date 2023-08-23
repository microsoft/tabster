/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import { getTabsterOnElement } from "./Instance";
import { Keys } from "./Keys";
import { RootAPI } from "./Root";
import * as Types from "./Types";
import { FocusedElementState } from "./State/FocusedElement";
import {
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    HTMLElementWithDummyContainer,
    TabsterPart,
    WeakHTMLElement,
    getAdjacentElement,
} from "./Utils";

class GroupperDummyManager extends DummyInputManager {
    constructor(
        element: WeakHTMLElement,
        groupper: Groupper,
        tabster: Types.TabsterCore,
        sys: Types.SysProps | undefined
    ) {
        super(
            tabster,
            element,
            DummyInputManagerPriorities.Groupper,
            sys,
            true
        );

        this._setHandlers(
            (
                dummyInput: DummyInput,
                isBackward: boolean,
                relatedTarget: HTMLElement | null
            ) => {
                const container = element.get();
                const input = dummyInput.input;

                if (container && input) {
                    const ctx = RootAPI.getTabsterContext(tabster, input);

                    if (ctx) {
                        let next: HTMLElement | null | undefined;

                        next = groupper.findNextTabbable(
                            relatedTarget || undefined,
                            undefined,
                            isBackward,
                            true,
                            true
                        )?.element;

                        if (!next) {
                            next = FocusedElementState.findNextTabbable(
                                tabster,
                                ctx,
                                undefined,
                                dummyInput.isOutside
                                    ? input
                                    : getAdjacentElement(
                                          container,
                                          !isBackward
                                      ),
                                undefined,
                                isBackward,
                                true,
                                true
                            )?.element;
                        }

                        if (next) {
                            nativeFocus(next);
                        }
                    }
                }
            }
        );
    }
}

export class Groupper
    extends TabsterPart<Types.GroupperProps>
    implements Types.Groupper
{
    private _shouldTabInside = false;
    private _first: WeakHTMLElement | undefined;
    private _onDispose: (groupper: Groupper) => void;

    dummyManager: GroupperDummyManager | undefined;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (groupper: Groupper) => void,
        props: Types.GroupperProps,
        sys: Types.SysProps | undefined
    ) {
        super(tabster, element, props);
        this.makeTabbable(false);

        this._onDispose = onDispose;

        if (!tabster.controlTab) {
            this.dummyManager = new GroupperDummyManager(
                this._element,
                this,
                tabster,
                sys
            );
        }
    }

    dispose(): void {
        this._onDispose(this);

        const element = this._element.get();
        this.dummyManager?.dispose();

        if (element) {
            if (__DEV__) {
                _setInformativeStyle(this._element, true);
            }
        }

        delete this._first;
    }

    findNextTabbable(
        currentElement?: HTMLElement,
        referenceElement?: HTMLElement,
        isBackward?: boolean,
        ignoreUncontrolled?: boolean,
        ignoreAccessibility?: boolean
    ): Types.NextTabbable | null {
        const groupperElement = this.getElement();

        if (!groupperElement) {
            return null;
        }

        const currentIsDummy =
            (
                currentElement as HTMLElementWithDummyContainer
            )?.__tabsterDummyContainer?.get() === groupperElement;

        if (
            !this._shouldTabInside &&
            currentElement &&
            groupperElement.contains(currentElement) &&
            !currentIsDummy
        ) {
            return { element: undefined, outOfDOMOrder: true };
        }

        const groupperFirstFocusable = this.getFirst(true);

        if (
            !currentElement ||
            !groupperElement.contains(currentElement) ||
            currentIsDummy
        ) {
            return {
                element: groupperFirstFocusable,
                outOfDOMOrder: true,
            };
        }

        const tabster = this._tabster;
        let next: HTMLElement | null | undefined = null;
        let uncontrolled: HTMLElement | undefined;
        let outOfDOMOrder = false;
        const onUncontrolled = (el: HTMLElement) => {
            uncontrolled = el;
        };

        if (this._shouldTabInside && groupperFirstFocusable) {
            const findProps: Types.FindNextProps = {
                container: groupperElement,
                currentElement,
                referenceElement,
                onUncontrolled,
                ignoreUncontrolled,
                ignoreAccessibility,
                useActiveModalizer: true,
            };

            next = isBackward
                ? tabster.focusable.findPrev(findProps)
                : tabster.focusable.findNext(findProps);

            outOfDOMOrder = !!findProps.outOfDOMOrderResult;

            if (
                !uncontrolled &&
                !next &&
                this._props.tabbability ===
                    Types.GroupperTabbabilities.LimitedTrapFocus
            ) {
                next = isBackward
                    ? tabster.focusable.findLast({
                          container: groupperElement,
                          ignoreUncontrolled: true,
                          ignoreAccessibility,
                          useActiveModalizer: true,
                      })
                    : tabster.focusable.findFirst({
                          container: groupperElement,
                          ignoreUncontrolled: true,
                          ignoreAccessibility,
                          useActiveModalizer: true,
                      });

                outOfDOMOrder = true;
            }
        }

        return {
            element: next,
            uncontrolled,
            outOfDOMOrder,
        };
    }

    makeTabbable(isTabbable: boolean): void {
        this._shouldTabInside = isTabbable || !this._props.tabbability;

        if (__DEV__) {
            _setInformativeStyle(this._element, !this._shouldTabInside);
        }
    }

    isActive(noIfFirstIsFocused?: boolean): boolean | undefined {
        const element = this.getElement() || null;
        let isParentActive = true;

        for (let e = element?.parentElement; e; e = e.parentElement) {
            const g = getTabsterOnElement(this._tabster, e)?.groupper as
                | Groupper
                | undefined;

            if (g) {
                if (!g._shouldTabInside) {
                    isParentActive = false;
                }
            }
        }

        let ret = isParentActive
            ? this._props.tabbability
                ? this._shouldTabInside
                : false
            : undefined;

        if (ret && noIfFirstIsFocused) {
            const focused = this._tabster.focusedElement.getFocusedElement();

            if (focused) {
                ret = focused !== this.getFirst(true);
            }
        }

        return ret;
    }

    getFirst(orContainer: boolean): HTMLElement | undefined {
        const groupperElement = this.getElement();
        let first: HTMLElement | undefined;

        if (groupperElement) {
            if (
                orContainer &&
                this._tabster.focusable.isFocusable(groupperElement)
            ) {
                return groupperElement;
            }

            first = this._first?.get();

            if (!first) {
                first =
                    this._tabster.focusable.findFirst({
                        container: groupperElement,
                        ignoreUncontrolled: true,
                        useActiveModalizer: true,
                    }) || undefined;

                if (first) {
                    this.setFirst(first);
                }
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

    acceptElement(
        element: HTMLElement,
        state: Types.FocusableAcceptElementState
    ): number | undefined {
        const cachedGrouppers = state.cachedGrouppers;

        const parentElement = this.getElement()?.parentElement;
        const parentCtx =
            parentElement &&
            RootAPI.getTabsterContext(this._tabster, parentElement);
        const parentCtxGroupper = parentCtx?.groupper;
        const parentGroupper = parentCtx?.isGroupperFirst
            ? parentCtxGroupper
            : undefined;
        let parentGroupperElement: HTMLElement | undefined;

        const getIsActive = (groupper: Types.Groupper) => {
            let cached = cachedGrouppers[groupper.id];
            let isActive: boolean | undefined;

            if (cached) {
                isActive = cached.isActive;
            } else {
                isActive = this.isActive(true);

                cached = cachedGrouppers[groupper.id] = {
                    isActive,
                };
            }

            return isActive;
        };

        if (parentGroupper) {
            parentGroupperElement = parentGroupper.getElement();

            if (
                !getIsActive(parentGroupper) &&
                parentGroupperElement &&
                state.container !== parentGroupperElement &&
                state.container.contains(parentGroupperElement)
            ) {
                // Do not fall into a child groupper of inactive parent groupper if it's in the scope of the search.
                state.skippedFocusable = true;
                return NodeFilter.FILTER_REJECT;
            }
        }

        const isActive = getIsActive(this);
        const groupperElement = this.getElement();

        if (groupperElement) {
            if (isActive !== true) {
                if (groupperElement === element && parentCtxGroupper) {
                    if (!parentGroupperElement) {
                        parentGroupperElement = parentCtxGroupper.getElement();
                    }

                    if (
                        parentGroupperElement &&
                        !getIsActive(parentCtxGroupper) &&
                        state.container.contains(parentGroupperElement) &&
                        parentGroupperElement !== state.container
                    ) {
                        state.skippedFocusable = true;
                        return NodeFilter.FILTER_REJECT;
                    }
                }

                if (
                    groupperElement !== element &&
                    groupperElement.contains(element)
                ) {
                    state.skippedFocusable = true;
                    return NodeFilter.FILTER_REJECT;
                }

                const cached = cachedGrouppers[this.id];
                let first: HTMLElement | null | undefined;

                if ("first" in cached) {
                    first = cached.first;
                } else {
                    first = cached.first = this.getFirst(true);
                }

                if (first && state.acceptCondition(first)) {
                    state.lastToIgnore = groupperElement;
                    state.skippedFocusable = true;

                    if (first !== state.from) {
                        state.found = true;
                        state.foundElement = first;
                        return NodeFilter.FILTER_ACCEPT;
                    } else {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
            }
        }

        return undefined;
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateGroupperProps(props: Types.GroupperProps): void {
    // TODO: Implement validation.
}

export class GroupperAPI implements Types.GroupperAPI {
    private _tabster: Types.TabsterCore;
    private _updateTimer: number | undefined;
    private _win: Types.GetWindow;
    private _current: Record<string, Types.Groupper> = {};
    private _grouppers: Record<string, Types.Groupper> = {};

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
        tabster.queueInit(this._init);
    }

    private _init = (): void => {
        const win = this._win();

        // Making sure groupper's onFocus is called before modalizer's onFocus.
        this._tabster.focusedElement.subscribeFirst(this._onFocus);

        win.document.addEventListener("mousedown", this._onMouseDown, true);
        win.addEventListener("keydown", this._onKeyDown, true);
    };

    dispose(): void {
        const win = this._win();

        this._current = {};

        if (this._updateTimer) {
            win.clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        win.document.removeEventListener("mousedown", this._onMouseDown, true);
        win.removeEventListener("keydown", this._onKeyDown, true);

        Object.keys(this._grouppers).forEach((groupperId) => {
            if (this._grouppers[groupperId]) {
                this._grouppers[groupperId].dispose();
                delete this._grouppers[groupperId];
            }
        });
    }

    createGroupper(
        element: HTMLElement,
        props: Types.GroupperProps,
        sys: Types.SysProps | undefined
    ) {
        if (__DEV__) {
            validateGroupperProps(props);
        }

        const newGroupper = new Groupper(
            this._tabster,
            element,
            this._onGroupperDispose,
            props,
            sys
        );

        this._grouppers[newGroupper.id] = newGroupper;

        const focusedElement = this._tabster.focusedElement.getFocusedElement();

        // Newly created groupper contains currently focused element, update the state on the next tick (to
        // make sure all grouppers are processed).
        if (
            focusedElement &&
            element.contains(focusedElement) &&
            !this._updateTimer
        ) {
            this._updateTimer = this._win().setTimeout(() => {
                delete this._updateTimer;
                // Making sure the focused element hasn't changed.
                if (
                    focusedElement ===
                    this._tabster.focusedElement.getFocusedElement()
                ) {
                    this._updateCurrent(focusedElement, true, true);
                }
            }, 0);
        }

        return newGroupper;
    }

    forgetCurrentGrouppers(): void {
        this._current = {};
    }

    private _onGroupperDispose = (groupper: Groupper) => {
        delete this._grouppers[groupper.id];
    };

    private _onFocus = (element: HTMLElement | undefined): void => {
        if (element) {
            this._updateCurrent(element, true, true);
        }
    };

    private _onMouseDown = (e: MouseEvent): void => {
        if (e.target) {
            this._updateCurrent(e.target as HTMLElement, true);
        }
    };

    private _updateCurrent(
        element: HTMLElement,
        includeTarget?: boolean,
        checkTarget?: boolean
    ): void {
        if (this._updateTimer) {
            this._win().clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }

        const newIds: Record<string, true> = {};

        let isTarget = true;

        for (
            let el = element as HTMLElement | null;
            el;
            el = el.parentElement
        ) {
            const groupper = getTabsterOnElement(this._tabster, el)?.groupper;

            if (groupper) {
                newIds[groupper.id] = true;

                if (isTarget && checkTarget && el !== element) {
                    isTarget = false;
                }

                if (includeTarget || !isTarget) {
                    this._current[groupper.id] = groupper;
                    const isTabbable =
                        groupper.isActive() ||
                        (element !== el &&
                            (!groupper.getProps().delegated ||
                                groupper.getFirst(false) !== element));

                    groupper.makeTabbable(isTabbable);
                }

                isTarget = false;
            }
        }

        for (const id of Object.keys(this._current)) {
            const groupper = this._current[id];

            if (!(groupper.id in newIds)) {
                groupper.makeTabbable(false);
                groupper.setFirst(undefined);
                delete this._current[id];
            }
        }
    }

    private _onKeyDown = (event: KeyboardEvent): void => {
        if (event.keyCode !== Keys.Enter && event.keyCode !== Keys.Esc) {
            return;
        }

        // Give a chance to other listeners to handle the event.
        if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
            return;
        }

        const element = this._tabster.focusedElement.getFocusedElement();

        if (element) {
            this.handleKeyPress(element, event);
        }
    };

    handleKeyPress(
        element: HTMLElement,
        event: KeyboardEvent,
        noGoUp?: boolean
    ): void {
        const tabster = this._tabster;
        const ctx = RootAPI.getTabsterContext(tabster, element);
        const modalizerInGroupper = ctx?.modalizerInGroupper;
        let groupper = ctx?.groupper || modalizerInGroupper;

        if (ctx && groupper) {
            if (ctx.ignoreKeydown(event)) {
                return;
            }

            let next: HTMLElement | null | undefined;

            const groupperElement = groupper.getElement();

            if (event.keyCode === Keys.Enter) {
                if (
                    groupperElement &&
                    (element === groupperElement ||
                        (groupper.getProps().delegated &&
                            element === groupper.getFirst(false)))
                ) {
                    next = tabster.focusable.findNext({
                        container: groupperElement,
                        currentElement: element,
                        useActiveModalizer: true,
                    });
                }
            } else if (event.keyCode === Keys.Esc) {
                if (groupperElement && groupperElement.contains(element)) {
                    if (element !== groupperElement || noGoUp) {
                        next = groupper.getFirst(true);
                    } else {
                        const parentElement = groupperElement.parentElement;
                        const parentCtx = parentElement
                            ? RootAPI.getTabsterContext(tabster, parentElement)
                            : undefined;

                        groupper = parentCtx?.groupper;
                        next = groupper?.getFirst(true);
                    }
                }

                if (groupper) {
                    groupper.makeTabbable(false);

                    if (modalizerInGroupper) {
                        tabster.modalizer?.setActive(undefined);
                    }
                }
            }

            if (next) {
                event.preventDefault();
                event.stopImmediatePropagation();

                next.focus();
            }
        }
    }
}

function _setInformativeStyle(
    weakElement: Types.WeakHTMLElement,
    remove: boolean
): void {
    if (__DEV__) {
        const element = weakElement.get();

        if (element) {
            if (remove) {
                element.style.removeProperty("--tabster-groupper");
            } else {
                element.style.setProperty("--tabster-groupper", "unlimited");
            }
        }
    }
}
