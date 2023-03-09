/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";
import { getTabsterOnElement } from "./Instance";
import { RootAPI } from "./Root";
import { FocusedElementState } from "./State/FocusedElement";
import { Keys } from "./Keys";
import * as Types from "./Types";
import {
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    HTMLElementWithDummyContainer,
    TabsterPart,
    WeakHTMLElement,
    triggerEvent,
    augmentAttribute,
} from "./Utils";

let _wasFocusedCounter = 0;

const _ariaHidden = "aria-hidden";

function _setInformativeStyle(
    weakElement: WeakHTMLElement,
    remove: boolean,
    internalId?: string,
    userId?: string,
    isActive?: boolean,
    wasFocused?: number
): void {
    if (__DEV__) {
        const element = weakElement.get();

        if (element) {
            if (remove) {
                element.style.removeProperty("--tabster-modalizer");
            } else {
                element.style.setProperty(
                    "--tabster-modalizer",
                    internalId +
                        "," +
                        userId +
                        "," +
                        (isActive ? "active" : "inactive") +
                        "," +
                        "," +
                        (wasFocused ? `focused(${wasFocused})` : "not-focused")
                );
            }
        }
    }
}

/**
 * Manages the dummy inputs for the Modalizer.
 */
class ModalizerDummyManager extends DummyInputManager {
    constructor(
        element: WeakHTMLElement,
        tabster: Types.TabsterCore,
        sys: Types.SysProps | undefined
    ) {
        super(tabster, element, DummyInputManagerPriorities.Modalizer, sys);

        this._setHandlers((dummyInput: DummyInput, isBackward: boolean) => {
            const el = element.get();
            const container = el && RootAPI.getRoot(tabster, el)?.getElement();
            const input = dummyInput.input;
            let toFocus: HTMLElement | null | undefined;

            if (container && input) {
                const dummyContainer = (
                    input as HTMLElementWithDummyContainer
                ).__tabsterDummyContainer?.get();

                const ctx = RootAPI.getTabsterContext(
                    tabster,
                    dummyContainer || input
                );

                if (ctx) {
                    toFocus = FocusedElementState.findNextTabbable(
                        tabster,
                        ctx,
                        container,
                        input,
                        isBackward,
                        true,
                        true
                    )?.element;
                }

                if (toFocus) {
                    nativeFocus(toFocus);
                }
            }
        });
    }
}

export class Modalizer
    extends TabsterPart<Types.ModalizerProps>
    implements Types.Modalizer
{
    userId: string;

    private _isActive: boolean | undefined;
    private _wasFocused = 0;
    private _onDispose: (modalizer: Modalizer) => void;
    private _activeElements: WeakRef<HTMLElement>[];

    dummyManager: ModalizerDummyManager | undefined;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (modalizer: Modalizer) => void,
        props: Types.ModalizerProps,
        sys: Types.SysProps | undefined,
        activeElements: WeakRef<HTMLElement>[]
    ) {
        super(tabster, element, props);

        this.userId = props.id;
        this._onDispose = onDispose;
        this._activeElements = activeElements;

        if (!tabster.controlTab) {
            this.dummyManager = new ModalizerDummyManager(
                this._element,
                tabster,
                sys
            );
        }

        if (__DEV__) {
            _setInformativeStyle(
                this._element,
                false,
                this.id,
                this.userId,
                this._isActive,
                this._wasFocused
            );
        }
    }

    makeActive(isActive: boolean): void {
        if (this._isActive !== isActive) {
            this._isActive = isActive;

            const element = this.getElement();

            if (element) {
                const activeElements = this._activeElements;
                const index = activeElements
                    .map((e) => e.deref())
                    .indexOf(element);

                if (isActive) {
                    if (index < 0) {
                        activeElements.push(new WeakRef(element));
                    }
                } else {
                    if (index >= 0) {
                        activeElements.splice(index, 1);
                    }
                }
            }

            if (__DEV__) {
                _setInformativeStyle(
                    this._element,
                    false,
                    this.id,
                    this.userId,
                    this._isActive,
                    this._wasFocused
                );
            }

            this.triggerFocusEvent(
                isActive
                    ? Types.ModalizerActiveEventName
                    : Types.ModalizerInactiveEventName
            );
        }
    }

    focused(noIncrement?: boolean): number {
        if (!noIncrement) {
            this._wasFocused = ++_wasFocusedCounter;
        }

        return this._wasFocused;
    }

    setProps(props: Types.ModalizerProps): void {
        if (props.id) {
            this.userId = props.id;
        }

        this._props = { ...props };
    }

    dispose(): void {
        this.makeActive(false);
        this._onDispose(this);
        this.dummyManager?.dispose();
        this._activeElements = [];
        this._remove();
    }

    isActive(): boolean {
        return !!this._isActive;
    }

    contains(element: HTMLElement) {
        return !!this.getElement()?.contains(element);
    }

    findNextTabbable(
        currentElement?: HTMLElement,
        isBackward?: boolean,
        ignoreUncontrolled?: boolean,
        ignoreAccessibility?: boolean
    ): Types.NextTabbable | null {
        const modalizerElement = this.getElement();

        if (!modalizerElement) {
            return null;
        }

        const tabster = this._tabster;
        let next: HTMLElement | null | undefined = null;
        let uncontrolled: HTMLElement | undefined;
        const onUncontrolled = (el: HTMLElement) => {
            uncontrolled = el;
        };

        const container =
            currentElement &&
            RootAPI.getRoot(tabster, currentElement)?.getElement();

        if (container) {
            next = tabster.focusable[isBackward ? "findPrev" : "findNext"]({
                container,
                currentElement,
                onUncontrolled,
                ignoreUncontrolled,
                ignoreAccessibility,
                useActiveModalizer: true,
            });

            if (
                !uncontrolled &&
                !next &&
                this._props.isTrapped &&
                tabster.modalizer?.activeId
            ) {
                next = tabster.focusable[isBackward ? "findLast" : "findFirst"](
                    {
                        container,
                        ignoreUncontrolled: true,
                        ignoreAccessibility,
                        useActiveModalizer: true,
                    }
                );
            }
        }

        return {
            element: next,
            uncontrolled,
        };
    }

    triggerFocusEvent(
        eventName: Types.ModalizerEventName,
        allElements?: boolean
    ): boolean {
        const element = this.getElement();
        let defaultPrevented = false;

        if (element) {
            const elements = allElements
                ? this._activeElements.map((e) => e.deref())
                : [element];

            for (const el of elements) {
                if (
                    el &&
                    !triggerEvent<Types.ModalizerEventDetails>(el, eventName, {
                        id: this.userId,
                        element,
                        eventName,
                    })
                ) {
                    defaultPrevented = true;
                }
            }
        }

        return defaultPrevented;
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, true);
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateModalizerProps(props: Types.ModalizerProps): void {
    // TODO: Implement validation.
}

export class ModalizerAPI implements Types.ModalizerAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _restoreModalizerFocusTimer: number | undefined;
    private _modalizers: Record<string, Types.Modalizer>;
    private _parts: Record<string, Record<string, Types.Modalizer>>;
    private _augMap: WeakMap<HTMLElement, true>;
    private _aug: WeakRef<HTMLElement>[];
    private _hiddenUpdateTimer: number | undefined;

    activeId: string | undefined;
    currentIsOthersAccessible: boolean | undefined;
    activeElements: WeakRef<HTMLElement>[];

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
        this._modalizers = {};
        this._parts = {};
        this._augMap = new WeakMap();
        this._aug = [];
        this.activeElements = [];

        if (!tabster.controlTab) {
            tabster.root.addDummyInputs();
        }

        const win = this._win();
        win.addEventListener("keydown", this._onKeyDown, true);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._tabster.focusedElement.subscribe(this._onFocus);
    };

    dispose(): void {
        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.removeEventListener("keydown", this._onKeyDown, true);

        // Dispose all modalizers managed by the API
        Object.keys(this._modalizers).forEach((modalizerId) => {
            if (this._modalizers[modalizerId]) {
                this._modalizers[modalizerId].dispose();
                delete this._modalizers[modalizerId];
            }
        });

        win.clearTimeout(this._restoreModalizerFocusTimer);
        win.clearTimeout(this._hiddenUpdateTimer);

        this._parts = {};
        delete this.activeId;
        this.activeElements = [];

        this._augMap = new WeakMap();
        this._aug = [];

        this._tabster.focusedElement.unsubscribe(this._onFocus);
    }

    createModalizer(
        element: HTMLElement,
        props: Types.ModalizerProps,
        sys: Types.SysProps | undefined
    ): Types.Modalizer {
        if (__DEV__) {
            validateModalizerProps(props);
        }

        const modalizer = new Modalizer(
            this._tabster,
            element,
            this._onModalizerDispose,
            props,
            sys,
            this.activeElements
        );

        const id = modalizer.id;
        const userId = props.id;

        this._modalizers[id] = modalizer;

        let part = this._parts[userId];
        if (!part) {
            part = this._parts[userId] = {};
        }
        part[id] = modalizer;

        // Adding a modalizer which is already focused, activate it
        if (
            element.contains(
                this._tabster.focusedElement.getFocusedElement() ?? null
            )
        ) {
            if (userId !== this.activeId) {
                this.setActive(modalizer);
            } else {
                modalizer.makeActive(true);
            }
        }

        return modalizer;
    }

    private _onModalizerDispose = (modalizer: Modalizer) => {
        const id = modalizer.id;
        const userId = modalizer.userId;
        const part = this._parts[userId];

        delete this._modalizers[id];

        if (part) {
            delete part[id];

            if (Object.keys(part).length === 0) {
                delete this._parts[userId];

                if (this.activeId === userId) {
                    this.setActive(undefined);
                }
            }
        }
    };

    private _onKeyDown = (event: KeyboardEvent): void => {
        if (event.keyCode !== Keys.Esc) {
            return;
        }

        const tabster = this._tabster;
        const element = tabster.focusedElement.getFocusedElement();

        if (element) {
            const ctx = RootAPI.getTabsterContext(tabster, element);
            const modalizer = ctx?.modalizer;

            if (
                ctx &&
                !ctx.groupper &&
                modalizer?.isActive() &&
                !ctx.ignoreKeydown(event)
            ) {
                const activeId = modalizer.userId;

                if (activeId) {
                    const part = this._parts[activeId];

                    if (part) {
                        const focusedSince = Object.keys(part)
                            .map((id) => {
                                const m = part[id];
                                const el = m.getElement();
                                let groupper: Types.Groupper | undefined;

                                if (el) {
                                    groupper = getTabsterOnElement(
                                        this._tabster,
                                        el
                                    )?.groupper;
                                }

                                return m && el && groupper
                                    ? {
                                          el,
                                          focusedSince: m.focused(true),
                                      }
                                    : { focusedSince: 0 };
                            })
                            .filter((f) => f.focusedSince > 0)
                            .sort((a, b) =>
                                a.focusedSince > b.focusedSince
                                    ? -1
                                    : a.focusedSince < b.focusedSince
                                    ? 1
                                    : 0
                            );

                        if (focusedSince.length) {
                            const groupperElement = focusedSince[0].el;

                            if (groupperElement) {
                                tabster.groupper?.handleKeyPress(
                                    groupperElement,
                                    event,
                                    true
                                );
                            }
                        }
                    }
                }
            }
        }
    };

    isAugmented(element: HTMLElement): boolean {
        return this._augMap.has(element);
    }

    hiddenUpdate(): void {
        if (this._hiddenUpdateTimer) {
            return;
        }

        this._hiddenUpdateTimer = this._win().setTimeout(() => {
            delete this._hiddenUpdateTimer;
            this._hiddenUpdate();
        }, 250);
    }

    setActive(modalizer: Types.Modalizer | undefined): void {
        const userId = modalizer?.userId;
        const activeId = this.activeId;

        if (activeId === userId) {
            return;
        }

        this.activeId = userId;

        if (activeId) {
            const part = this._parts[activeId];

            if (part) {
                for (const id of Object.keys(part)) {
                    part[id].makeActive(false);
                }
            }
        }

        if (userId) {
            const part = this._parts[userId];

            if (part) {
                for (const id of Object.keys(part)) {
                    part[id].makeActive(true);
                }
            }
        }

        this.currentIsOthersAccessible =
            modalizer?.getProps().isOthersAccessible;

        this.hiddenUpdate();
    }

    focus(
        elementFromModalizer: HTMLElement,
        noFocusFirst?: boolean,
        noFocusDefault?: boolean
    ): boolean {
        const ctx = RootAPI.getTabsterContext(
            this._tabster,
            elementFromModalizer
        );

        const modalizer = ctx?.modalizer;

        if (modalizer) {
            this.setActive(modalizer);

            const props = modalizer.getProps();
            const modalizerRoot = modalizer.getElement();

            if (modalizerRoot) {
                if (noFocusFirst === undefined) {
                    noFocusFirst = props.isNoFocusFirst;
                }

                if (
                    !noFocusFirst &&
                    this._tabster.keyboardNavigation.isNavigatingWithKeyboard() &&
                    this._tabster.focusedElement.focusFirst({
                        container: modalizerRoot,
                    })
                ) {
                    return true;
                }

                if (noFocusDefault === undefined) {
                    noFocusDefault = props.isNoFocusDefault;
                }

                if (
                    !noFocusDefault &&
                    this._tabster.focusedElement.focusDefault(modalizerRoot)
                ) {
                    return true;
                }

                this._tabster.focusedElement.resetFocus(modalizerRoot);
            }
        } else if (__DEV__) {
            console.error("Element is not in Modalizer.", elementFromModalizer);
        }

        return false;
    }

    acceptElement(
        element: HTMLElement,
        state: Types.FocusableAcceptElementState
    ): number | undefined {
        const modalizerUserId = state.modalizerUserId;
        const currentModalizer = state.currentCtx?.modalizer;

        if (modalizerUserId) {
            for (const e of this.activeElements) {
                const el = e.deref();

                if (el && (element.contains(el) || el === element)) {
                    // We have a part of currently active modalizer somewhere deeper in the DOM,
                    // skipping all other checks.
                    return NodeFilter.FILTER_SKIP;
                }
            }
        }

        return modalizerUserId === currentModalizer?.userId ||
            (!modalizerUserId &&
                currentModalizer?.getProps().isAlwaysAccessible)
            ? undefined
            : NodeFilter.FILTER_SKIP;
    }

    private _hiddenUpdate(): void {
        const tabster = this._tabster;
        const body = tabster.getWindow().document.body;
        const activeId = this.activeId;

        const parts = this._parts;
        const visibleElements: HTMLElement[] = [];
        const hiddenElements: HTMLElement[] = [];
        const alwaysAccessibleElements: HTMLElement[] = [];

        for (const userId of Object.keys(parts)) {
            const mParts = parts[userId];

            for (const id of Object.keys(mParts)) {
                const m = mParts[id];
                const el = m.getElement();
                const props = m.getProps();
                const isAlwaysAccessible = props.isAlwaysAccessible;

                if (el) {
                    if (userId === activeId) {
                        if (!this.currentIsOthersAccessible) {
                            visibleElements.push(el);
                        }
                    } else if (isAlwaysAccessible) {
                        alwaysAccessibleElements.push(el);
                    } else {
                        hiddenElements.push(el);
                    }
                }
            }
        }

        const augmentedMap = this._augMap;
        const allVisibleElements: HTMLElement[] | undefined =
            visibleElements.length > 0
                ? [...visibleElements, ...alwaysAccessibleElements]
                : undefined;

        const newAugmented: WeakRef<HTMLElement>[] = [];
        const newAugmentedMap: WeakMap<HTMLElement, true> = new WeakMap();

        const toggle = (element: HTMLElement, hide: boolean) => {
            const tagName = element.tagName;

            if (tagName === "SCRIPT" || tagName === "STYLE") {
                return;
            }

            let isAugmented = false;

            if (augmentedMap.has(element)) {
                if (hide) {
                    isAugmented = true;
                } else {
                    augmentedMap.delete(element);
                    augmentAttribute(tabster, element, _ariaHidden);
                }
            } else if (
                hide &&
                augmentAttribute(tabster, element, _ariaHidden, "true")
            ) {
                augmentedMap.set(element, true);
                isAugmented = true;
            }

            if (isAugmented) {
                newAugmented.push(new WeakRef(element));
                newAugmentedMap.set(element, true);
            }
        };

        const walk = (element: HTMLElement) => {
            for (
                let el = element.firstElementChild;
                el;
                el = el.nextElementSibling
            ) {
                let skip = false;
                let containsModalizer = false;

                if (allVisibleElements) {
                    for (const c of allVisibleElements) {
                        if (el === c) {
                            skip = true;
                            break;
                        }

                        if (el.contains(c)) {
                            containsModalizer = true;
                            break;
                        }
                    }

                    if (containsModalizer) {
                        walk(el as HTMLElement);
                    } else if (!skip) {
                        toggle(el as HTMLElement, true);
                    }
                } else {
                    toggle(el as HTMLElement, false);
                }
            }
        };

        if (!allVisibleElements) {
            alwaysAccessibleElements.forEach((e) => toggle(e, false));
        }

        hiddenElements.forEach((e) => toggle(e, true));

        if (body) {
            walk(body);
        }

        this._aug
            ?.map((e) => e.deref())
            .forEach((e) => {
                if (e && !newAugmentedMap.get(e)) {
                    toggle(e, false);
                }
            });

        this._aug = newAugmented;
        this._augMap = newAugmentedMap;
    }

    /**
     * Subscribes to the focus state and handles modalizer related focus events
     * @param e - Element that is focused
     * @param details - Additional data about the focus event
     */
    private _onFocus = (
        focusedElement: HTMLElement | undefined,
        details: Types.FocusedElementDetails
    ): void => {
        const ctx =
            focusedElement &&
            RootAPI.getTabsterContext(this._tabster, focusedElement);

        // Modalizer behaviour is opt in, only apply to elements that have a tabster context
        if (!ctx || !focusedElement) {
            return;
        }

        const augmentedMap = this._augMap;

        for (
            let e: HTMLElement | null = focusedElement;
            e;
            e = e.parentElement
        ) {
            // If the newly focused element is inside some of the hidden containers,
            // remove aria-hidden from those synchronously for the screen readers
            // to be able to read the element. The rest of aria-hiddens, will be removed
            // acynchronously for the sake of performance.

            if (augmentedMap.has(e)) {
                augmentedMap.delete(e);
                augmentAttribute(this._tabster, e, _ariaHidden);
            }
        }

        const modalizer = ctx.modalizer;

        // An inactive groupper with the modalizer on the same node will not give the modalizer
        // in the context, yet we still want to track that the modalizer's container was focused.
        (
            modalizer ||
            getTabsterOnElement(this._tabster, focusedElement)?.modalizer
        )?.focused();

        if (modalizer?.userId === this.activeId) {
            this.currentIsOthersAccessible =
                modalizer?.getProps().isOthersAccessible;

            return;
        }

        // Developers calling `element.focus()` should change/deactivate active modalizer
        if (
            details.isFocusedProgrammatically ||
            this.currentIsOthersAccessible ||
            modalizer?.getProps().isAlwaysAccessible
        ) {
            this.setActive(modalizer);
        } else {
            // Focused outside of the active modalizer, try pull focus back to current modalizer
            const win = this._win();
            win.clearTimeout(this._restoreModalizerFocusTimer);
            // TODO some rendering frameworks (i.e. React) might async rerender the DOM so we need to wait for a duration
            // Figure out a better way of doing this rather than a 100ms timeout
            this._restoreModalizerFocusTimer = win.setTimeout(
                () => this._restoreModalizerFocus(focusedElement),
                100
            );
        }
    };

    /**
     * Called when an element is focused outside of an active modalizer.
     * Attempts to pull focus back into the active modalizer
     * @param outsideElement - An element being focused outside of the modalizer
     */
    private _restoreModalizerFocus(
        outsideElement: HTMLElement | undefined
    ): void {
        const ownerDocument = outsideElement?.ownerDocument;

        if (!outsideElement || !ownerDocument) {
            return;
        }

        const ctx = RootAPI.getTabsterContext(this._tabster, outsideElement);
        const modalizer = ctx?.modalizer;
        const activeId = this.activeId;

        if (
            (!modalizer && !activeId) ||
            (modalizer && activeId === modalizer.userId)
        ) {
            return;
        }

        const container = ctx?.root.getElement();

        if (container) {
            let toFocus = this._tabster.focusable.findFirst({
                container,
                ignoreUncontrolled: true,
                useActiveModalizer: true,
            });

            if (toFocus) {
                if (
                    outsideElement.compareDocumentPosition(toFocus) &
                    document.DOCUMENT_POSITION_PRECEDING
                ) {
                    toFocus = this._tabster.focusable.findLast({
                        container,
                        ignoreUncontrolled: true,
                        useActiveModalizer: true,
                    });

                    if (!toFocus) {
                        // This only might mean that findFirst/findLast are buggy and inconsistent.
                        throw new Error("Something went wrong.");
                    }
                }

                this._tabster.focusedElement.focus(toFocus);

                return;
            }
        }

        // Current Modalizer doesn't seem to have focusable elements.
        // Blurring the currently focused element which is outside of the current Modalizer.
        outsideElement.blur();
    }
}
