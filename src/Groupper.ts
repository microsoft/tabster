/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";

import { getTabsterOnElement } from "./Instance";
import { Keys } from "./Keys";
import { RootAPI } from "./Root";
import * as Types from "./Types";
import {
    AsyncFocusSources,
    GroupperMoveFocusActions,
    GroupperTabbabilities,
} from "./Consts";
import {
    GroupperMoveFocusEvent,
    GroupperMoveFocusEventName,
    TabsterMoveFocusEvent,
} from "./Events";
import { FocusedElementState } from "./State/FocusedElement";
import {
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    getAdjacentElement,
    getDummyInputContainer,
    TabsterPart,
    WeakHTMLElement,
} from "./Utils";
import { dom } from "./DOMAPI";

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
        delete this.dummyManager;

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
        ignoreAccessibility?: boolean
    ): Types.NextTabbable | null {
        const groupperElement = this.getElement();

        if (!groupperElement) {
            return null;
        }

        const currentIsDummy =
            getDummyInputContainer(currentElement) === groupperElement;

        if (
            !this._shouldTabInside &&
            currentElement &&
            dom.nodeContains(groupperElement, currentElement) &&
            !currentIsDummy
        ) {
            return { element: undefined, outOfDOMOrder: true };
        }

        const groupperFirstFocusable = this.getFirst(true);

        if (
            !currentElement ||
            !dom.nodeContains(groupperElement, currentElement) ||
            currentIsDummy
        ) {
            return {
                element: groupperFirstFocusable,
                outOfDOMOrder: true,
            };
        }

        const tabster = this._tabster;
        let next: HTMLElement | null | undefined = null;
        let outOfDOMOrder = false;
        let uncontrolled: HTMLElement | null | undefined;

        if (this._shouldTabInside && groupperFirstFocusable) {
            const findProps: Types.FindNextProps = {
                container: groupperElement,
                currentElement,
                referenceElement,
                ignoreAccessibility,
                useActiveModalizer: true,
            };

            const findPropsOut: Types.FindFocusableOutputProps = {};

            next = tabster.focusable[isBackward ? "findPrev" : "findNext"](
                findProps,
                findPropsOut
            );

            outOfDOMOrder = !!findPropsOut.outOfDOMOrder;

            if (
                !next &&
                this._props.tabbability ===
                    GroupperTabbabilities.LimitedTrapFocus
            ) {
                next = tabster.focusable[isBackward ? "findLast" : "findFirst"](
                    {
                        container: groupperElement,
                        ignoreAccessibility,
                        useActiveModalizer: true,
                    },
                    findPropsOut
                );

                outOfDOMOrder = true;
            }

            uncontrolled = findPropsOut.uncontrolled;
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

        for (
            let e = dom.getParentElement(element);
            e;
            e = dom.getParentElement(e)
        ) {
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

        const parentElement = dom.getParentElement(this.getElement());
        const parentCtx =
            parentElement &&
            RootAPI.getTabsterContext(this._tabster, parentElement);
        const parentCtxGroupper = parentCtx?.groupper;
        const parentGroupper = parentCtx?.groupperBeforeMover
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
                dom.nodeContains(state.container, parentGroupperElement)
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
                        dom.nodeContains(
                            state.container,
                            parentGroupperElement
                        ) &&
                        parentGroupperElement !== state.container
                    ) {
                        state.skippedFocusable = true;
                        return NodeFilter.FILTER_REJECT;
                    }
                }

                if (
                    groupperElement !== element &&
                    dom.nodeContains(groupperElement, element)
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
                    state.rejectElementsFrom = groupperElement;
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

        const doc = win.document;

        const activeElement = dom.getActiveElement(doc);

        if (activeElement) {
            this._onFocus(activeElement as HTMLElement);
        }

        doc.addEventListener("mousedown", this._onMouseDown, true);
        win.addEventListener("keydown", this._onKeyDown, true);
        win.addEventListener(GroupperMoveFocusEventName, this._onMoveFocus);
    };

    dispose(): void {
        const win = this._win();

        this._tabster.focusedElement.cancelAsyncFocus(
            AsyncFocusSources.EscapeGroupper
        );

        this._current = {};

        if (this._updateTimer) {
            win.clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        win.document.removeEventListener("mousedown", this._onMouseDown, true);
        win.removeEventListener("keydown", this._onKeyDown, true);
        win.removeEventListener(GroupperMoveFocusEventName, this._onMoveFocus);

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

        const tabster = this._tabster;
        const newGroupper = new Groupper(
            tabster,
            element,
            this._onGroupperDispose,
            props,
            sys
        );

        this._grouppers[newGroupper.id] = newGroupper;

        const focusedElement = tabster.focusedElement.getFocusedElement();

        // Newly created groupper contains currently focused element, update the state on the next tick (to
        // make sure all grouppers are processed).
        if (
            focusedElement &&
            dom.nodeContains(element, focusedElement) &&
            !this._updateTimer
        ) {
            this._updateTimer = this._win().setTimeout(() => {
                delete this._updateTimer;
                // Making sure the focused element hasn't changed.
                if (
                    focusedElement ===
                    tabster.focusedElement.getFocusedElement()
                ) {
                    this._updateCurrent(focusedElement);
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
            this._updateCurrent(element);
        }
    };

    private _onMouseDown = (e: MouseEvent): void => {
        let target = e.target as HTMLElement | null;

        while (target && !this._tabster.focusable.isFocusable(target)) {
            target = this._tabster.getParent(target) as HTMLElement | null;
        }

        if (target) {
            this._updateCurrent(target);
        }
    };

    private _updateCurrent(element: HTMLElement): void {
        if (this._updateTimer) {
            this._win().clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }

        const tabster = this._tabster;
        const newIds: Record<string, true> = {};

        for (
            let el = tabster.getParent(element);
            el;
            el = tabster.getParent(el)
        ) {
            const groupper = getTabsterOnElement(
                tabster,
                el as HTMLElement
            )?.groupper;

            if (groupper) {
                newIds[groupper.id] = true;

                this._current[groupper.id] = groupper;
                const isTabbable =
                    groupper.isActive() ||
                    (element !== el &&
                        (!groupper.getProps().delegated ||
                            groupper.getFirst(false) !== element));

                groupper.makeTabbable(isTabbable);
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
        if (event.key !== Keys.Enter && event.key !== Keys.Escape) {
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

    private _onMoveFocus = (e: GroupperMoveFocusEvent): void => {
        const element = e.composedPath()[0] as HTMLElement | null | undefined;
        const action = e.detail?.action;

        if (element && action !== undefined && !e.defaultPrevented) {
            if (action === GroupperMoveFocusActions.Enter) {
                this._enterGroupper(element);
            } else {
                this._escapeGroupper(element);
            }

            e.stopImmediatePropagation();
        }
    };

    private _enterGroupper(
        element: HTMLElement,
        relatedEvent?: KeyboardEvent
    ): HTMLElement | null {
        const tabster = this._tabster;
        const ctx = RootAPI.getTabsterContext(tabster, element);
        const groupper = ctx?.groupper || ctx?.modalizerInGroupper;
        const groupperElement = groupper?.getElement();

        if (
            groupper &&
            groupperElement &&
            (element === groupperElement ||
                (groupper.getProps().delegated &&
                    element === groupper.getFirst(false)))
        ) {
            const next = tabster.focusable.findNext({
                container: groupperElement,
                currentElement: element,
                useActiveModalizer: true,
            });

            if (
                next &&
                (!relatedEvent ||
                    (relatedEvent &&
                        groupperElement.dispatchEvent(
                            new TabsterMoveFocusEvent({
                                by: "groupper",
                                owner: groupperElement,
                                next,
                                relatedEvent,
                            })
                        )))
            ) {
                if (relatedEvent) {
                    // When the application hasn't prevented default,
                    // we consider the event completely handled, hence we
                    // prevent the initial event's default action and stop
                    // propagation.
                    relatedEvent.preventDefault();
                    relatedEvent.stopImmediatePropagation();
                }

                next.focus();

                return next;
            }
        }

        return null;
    }

    private _escapeGroupper(
        element: HTMLElement,
        relatedEvent?: KeyboardEvent,
        fromModalizer?: boolean
    ): HTMLElement | null {
        const tabster = this._tabster;
        const ctx = RootAPI.getTabsterContext(tabster, element);
        let groupper = ctx?.groupper || ctx?.modalizerInGroupper;
        const groupperElement = groupper?.getElement();

        if (
            groupper &&
            groupperElement &&
            dom.nodeContains(groupperElement, element)
        ) {
            let next: HTMLElement | null | undefined;

            if (element !== groupperElement || fromModalizer) {
                next = groupper.getFirst(true);
            } else {
                const parentElement = dom.getParentElement(groupperElement);
                const parentCtx = parentElement
                    ? RootAPI.getTabsterContext(tabster, parentElement)
                    : undefined;

                groupper = parentCtx?.groupper;
                next = groupper?.getFirst(true);
            }

            if (
                next &&
                (!relatedEvent ||
                    (relatedEvent &&
                        groupperElement.dispatchEvent(
                            new TabsterMoveFocusEvent({
                                by: "groupper",
                                owner: groupperElement,
                                next,
                                relatedEvent,
                            })
                        )))
            ) {
                if (groupper) {
                    groupper.makeTabbable(false);
                }

                // This part happens asynchronously inside setTimeout,
                // so no need to prevent default or stop propagation.
                next.focus();

                return next;
            }
        }

        return null;
    }

    moveFocus(
        element: HTMLElement,
        action: Types.GroupperMoveFocusAction
    ): HTMLElement | null {
        return action === GroupperMoveFocusActions.Enter
            ? this._enterGroupper(element)
            : this._escapeGroupper(element);
    }

    handleKeyPress(
        element: HTMLElement,
        event: KeyboardEvent,
        fromModalizer?: boolean
    ): void {
        const tabster = this._tabster;
        const ctx = RootAPI.getTabsterContext(tabster, element);

        if (ctx && (ctx?.groupper || ctx?.modalizerInGroupper)) {
            tabster.focusedElement.cancelAsyncFocus(
                AsyncFocusSources.EscapeGroupper
            );

            if (ctx.ignoreKeydown(event)) {
                return;
            }

            if (event.key === Keys.Enter) {
                this._enterGroupper(element, event);
            } else if (event.key === Keys.Escape) {
                // We will handle Esc asynchronously, if something in the application will
                // move focus during the keypress handling, we will not interfere.
                const focusedElement =
                    tabster.focusedElement.getFocusedElement();

                tabster.focusedElement.requestAsyncFocus(
                    AsyncFocusSources.EscapeGroupper,
                    () => {
                        if (
                            focusedElement !==
                                tabster.focusedElement.getFocusedElement() &&
                            // A part of Modalizer that has called this handler to escape the active groupper
                            // might have been removed from DOM, if the focus is on body, we still want to handle Esc.
                            ((fromModalizer && !focusedElement) ||
                                !fromModalizer)
                        ) {
                            // Something else in the application has moved focus, we will not handle Esc.
                            return;
                        }

                        this._escapeGroupper(element, event, fromModalizer);
                    },
                    0
                );
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
