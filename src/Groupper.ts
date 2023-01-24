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
    TabsterPart,
    WeakHTMLElement,
    getAdjacentElement,
} from "./Utils";

class GroupperDummyManager extends DummyInputManager {
    constructor(
        element: WeakHTMLElement,
        groupper: Groupper,
        tabster: Types.TabsterCore
    ) {
        super(tabster, element, DummyInputManagerPriorities.Groupper, true);

        this._setHandlers(
            (
                dummyInput: DummyInput,
                isBackward: boolean,
                relatedTarget: HTMLElement | null
            ) => {
                const container = element.get();

                if (container && !dummyInput.shouldMoveOut) {
                    const input = dummyInput.input;

                    if (input) {
                        const ctx = RootAPI.getTabsterContext(tabster, input);

                        if (ctx) {
                            let next: HTMLElement | null | undefined;

                            if (
                                relatedTarget &&
                                relatedTarget.contentEditable === "true" &&
                                groupper.getProps().tabbability ===
                                    Types.GroupperTabbabilities
                                        .LimitedTrapFocus &&
                                container.contains(relatedTarget)
                            ) {
                                next = groupper.findNextTabbable(
                                    relatedTarget,
                                    isBackward
                                )?.element;
                            }

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
                                    isBackward
                                )?.element;
                            }

                            if (next) {
                                tabster.focusedElement.focus(next);
                            }
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
        props: Types.GroupperProps
    ) {
        super(tabster, element, props);
        this.makeTabbable(false);

        this._onDispose = onDispose;

        if (!tabster.controlTab) {
            this.dummyManager = new GroupperDummyManager(
                this._element,
                this,
                tabster
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
        isBackward?: boolean
    ): Types.NextTabbable | null {
        const groupperElement = this.getElement();

        if (!groupperElement) {
            return null;
        }

        const groupperFirstFocusable = this.getFirst(true);

        if (!currentElement || !groupperElement.contains(currentElement)) {
            return {
                element: groupperFirstFocusable,
                lastMoverOrGroupper: groupperFirstFocusable ? undefined : this,
            };
        }

        const tabster = this._tabster;
        let next: HTMLElement | null | undefined = null;
        let uncontrolled: HTMLElement | undefined;
        const onUncontrolled = (el: HTMLElement) => {
            uncontrolled = el;
        };

        if (this._shouldTabInside && groupperFirstFocusable) {
            next = isBackward
                ? tabster.focusable.findPrev({
                      container: groupperElement,
                      currentElement,
                      onUncontrolled,
                  })
                : tabster.focusable.findNext({
                      container: groupperElement,
                      currentElement,
                      onUncontrolled,
                  });

            if (
                !uncontrolled &&
                !next &&
                this._props.tabbability ===
                    Types.GroupperTabbabilities.LimitedTrapFocus
            ) {
                next = isBackward
                    ? tabster.focusable.findLast({
                          container: groupperElement,
                      })
                    : tabster.focusable.findFirst({
                          container: groupperElement,
                      });
            }
        }

        return {
            element: next,
            uncontrolled,
            lastMoverOrGroupper: next || uncontrolled ? undefined : this,
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

        let cached = cachedGrouppers[this.id];
        let isActive: boolean | undefined;

        if (cached) {
            isActive = cached.isActive;
        } else {
            isActive = this.isActive(true);

            cached = cachedGrouppers[this.id] = {
                isActive,
            };
        }

        const groupperElement = this.getElement();

        if (groupperElement) {
            if (isActive !== true) {
                if (groupperElement.contains(state.from)) {
                    return NodeFilter.FILTER_REJECT;
                }

                let first: HTMLElement | null | undefined;

                if ("first" in cached) {
                    first = cached.first;
                } else {
                    first = cached.first = this.getFirst(true);
                }

                if (first && state.acceptCondition(first)) {
                    state.lastToIgnore = groupperElement;

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
    private _initTimer: number | undefined;
    private _win: Types.GetWindow;
    private _current: Record<string, Types.Groupper> = {};
    private _grouppers: Record<string, Types.Groupper> = {};

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        this._tabster = tabster;
        this._win = getWindow;
        this._initTimer = getWindow().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        const win = this._win();

        this._tabster.focusedElement.subscribe(this._onFocus);

        win.document.addEventListener("mousedown", this._onMouseDown, true);
        win.addEventListener("keydown", this._onKeyDown, true);
    };

    dispose(): void {
        const win = this._win();

        this._current = {};

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
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

    createGroupper(element: HTMLElement, props: Types.GroupperProps) {
        if (__DEV__) {
            validateGroupperProps(props);
        }

        const newGroupper = new Groupper(
            this._tabster,
            element,
            this._onGroupperDispose,
            props
        );

        this._grouppers[newGroupper.id] = newGroupper;

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

    private _onKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode !== Keys.Enter && e.keyCode !== Keys.Esc) {
            return;
        }

        const element = this._tabster.focusedElement.getFocusedElement();

        if (element) {
            const ctx = RootAPI.getTabsterContext(this._tabster, element);
            let groupper = ctx?.groupper;

            if (ctx && groupper) {
                if (ctx.ignoreKeydown(e)) {
                    return;
                }

                let next: HTMLElement | null | undefined;

                const groupperElement = groupper.getElement();

                if (e.keyCode === Keys.Enter) {
                    if (
                        element === groupperElement ||
                        (groupper.getProps().delegated &&
                            element === groupper.getFirst(false))
                    ) {
                        next = this._tabster.focusable.findNext({
                            container: groupperElement,
                            currentElement: element,
                        });
                    }
                } else if (e.keyCode === Keys.Esc) {
                    if (groupperElement && groupperElement.contains(element)) {
                        if (element !== groupperElement) {
                            next = groupper.getFirst(true);
                        } else {
                            const parentElement = groupperElement.parentElement;
                            const parentCtx = parentElement
                                ? RootAPI.getTabsterContext(
                                      this._tabster,
                                      parentElement
                                  )
                                : undefined;

                            groupper = parentCtx?.groupper;
                            next = groupper?.getFirst(true);
                        }
                    }

                    if (groupper) {
                        groupper.makeTabbable(false);
                    }
                }

                if (next) {
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    nativeFocus(next);
                }
            }
        }
    };
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
