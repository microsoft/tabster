/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";
import { augmentAttribute } from "./Instance";
import { Keys } from "./Keys";
import { RootAPI } from "./Root";
import * as Types from "./Types";
import {
    createElementTreeWalker,
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    TabsterPart,
    triggerEvent,
    WeakHTMLElement,
} from "./Utils";

let _lastInternalId = 0;

function _setInformativeStyle(
    weakElement: WeakHTMLElement,
    remove: boolean,
    internalId?: string,
    userId?: string,
    isActive?: boolean,
    isFocused?: boolean
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
                        (isFocused ? "focused" : "not-focused")
                );
            }
        }
    }
}

export class Modalizer
    extends TabsterPart<Types.ModalizerProps>
    implements Types.Modalizer
{
    readonly internalId: string;
    userId: string;

    private _isActive: boolean | undefined;
    private _isFocused = false;
    /**
     * Parent of modalizer Root, can be used for DOM cleanup if the modalizerRoot is no longer present
     */
    private _modalizerParent: WeakHTMLElement | null;
    private _onDispose: (modalizer: Modalizer) => void;
    private _moveOutWithDefault: (backwards: boolean) => void;
    private _onActiveChange: (active: boolean) => void;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (modalizer: Modalizer) => void,
        moveOutWithDefault: (backwards: boolean) => void,
        onActiveChange: (active: boolean) => void,
        props: Types.ModalizerProps
    ) {
        super(tabster, element, props);

        this.internalId = "ml" + ++_lastInternalId;
        this.userId = props.id;
        this._onDispose = onDispose;
        this._moveOutWithDefault = moveOutWithDefault;
        this._onActiveChange = onActiveChange;
        if (!tabster.controlTab) {
            element.addEventListener("keydown", this._onKeyDown);
        }

        const parentElement = element.parentElement;
        if (parentElement) {
            this._modalizerParent = new WeakHTMLElement(
                tabster.getWindow,
                parentElement
            );
        } else {
            this._modalizerParent = null;
        }

        this._setAccessibilityProps();

        if (__DEV__) {
            _setInformativeStyle(
                this._element,
                false,
                this.internalId,
                this.userId,
                this._isActive,
                this._isFocused
            );
        }
    }

    private _onKeyDown = (e: KeyboardEvent) => {
        const keyCode = e.keyCode;
        const isPrev = e.shiftKey;
        if (keyCode !== Keys.Tab) {
            return;
        }

        const focusedElement = this._tabster.focusedElement.getFocusedElement();
        const modalizerElement = this.getElement();
        let findFn: "findPrev" | "findNext" | "findFirst" | "findLast" = isPrev
            ? "findPrev"
            : "findNext";
        let next: HTMLElement | null | undefined;
        if (focusedElement && modalizerElement?.contains(focusedElement)) {
            next = this._tabster.focusable[findFn]({
                container: this.getElement(),
                currentElement: focusedElement,
            });
        }

        // circular focus trap for modalizer
        if (!next && this._props.isTrapped) {
            findFn = isPrev ? "findLast" : "findFirst";
            next = this._tabster.focusable[findFn]({
                container: this.getElement(),
            });
        }

        if (next) {
            e.preventDefault();
            e.stopImmediatePropagation();

            nativeFocus(next);
        } else if (!this._props.isOthersAccessible) {
            this._moveOutWithDefault(isPrev);
        }
    };

    setProps(props: Types.ModalizerProps): void {
        if (props.id) {
            this.userId = props.id;
        }

        this._props = { ...props };

        this._setAccessibilityProps();
    }

    dispose(): void {
        this._onDispose(this);
        this._remove();
    }

    setActive(active: boolean): void {
        if (active === this._isActive) {
            return;
        }

        this._isActive = active;
        this._onActiveChange(active);

        if (__DEV__) {
            _setInformativeStyle(
                this._element,
                false,
                this.internalId,
                this.userId,
                this._isActive,
                this._isFocused
            );
        }

        let targetDocument =
            this._element.get()?.ownerDocument ||
            this._modalizerParent?.get()?.ownerDocument;
        // Document can't be determined frm the modalizer root or its parent, fallback to window
        if (!targetDocument) {
            targetDocument = this._tabster.getWindow().document;
        }
        const root = targetDocument.body;

        // Sets or restores aria-hidden value based on `active` flag
        const ariaHiddenWalker = createElementTreeWalker(
            targetDocument,
            root,
            (el: HTMLElement) => {
                // if other content should be accessible no need to do walk the tree
                if (this._props.isOthersAccessible) {
                    return NodeFilter.FILTER_REJECT;
                }

                const modalizerRoot = this._element.get();
                const modalizerParent = this._modalizerParent?.get();
                const isModalizerElement = modalizerRoot === el;
                const containsModalizerRoot = !!el.contains(
                    modalizerRoot || null
                );
                const containsModalizerParent = !!el.contains(
                    modalizerParent || null
                );

                if (isModalizerElement) {
                    return NodeFilter.FILTER_REJECT;
                }

                if (containsModalizerRoot || containsModalizerParent) {
                    return NodeFilter.FILTER_SKIP;
                }

                // Add `aria-hidden` when modalizer is active
                // Restore `aria-hidden` when modalizer is inactive
                augmentAttribute(
                    this._tabster,
                    el,
                    "aria-hidden",
                    active ? "true" : undefined
                );

                const modalizerRootOnPage =
                    modalizerRoot === modalizerRoot?.ownerDocument.body
                        ? false
                        : modalizerRoot?.ownerDocument.body.contains(
                              modalizerRoot
                          );

                const modalizerParentOnPage =
                    modalizerParent === modalizerParent?.ownerDocument.body
                        ? false
                        : modalizerParent?.ownerDocument.body.contains(
                              modalizerParent
                          );

                // if the modalizer root or its parent is not on the page, all nodes need to be visited
                if (!modalizerParentOnPage && !modalizerRootOnPage) {
                    return NodeFilter.FILTER_SKIP;
                }

                return NodeFilter.FILTER_REJECT;
            }
        );

        if (ariaHiddenWalker) {
            while (ariaHiddenWalker.nextNode()) {
                /** Iterate to update the tree */
            }
        }
    }

    isActive(): boolean {
        return !!this._isActive;
    }

    contains(element: HTMLElement) {
        return !!this.getElement()?.contains(element);
    }

    onBeforeFocusOut(): boolean {
        const element = this.getElement();

        return element
            ? !triggerEvent<Types.ModalizerEventDetails>(
                  element,
                  Types.ModalizerEventName,
                  { eventName: "beforefocusout" }
              )
            : false;
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, true);
        }
    }

    private _setAccessibilityProps(): void {
        if (__DEV__) {
            const element = this._element.get()
            if (element && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby")) {
                console.error(
                    "Modalizer element must have either aria-label or aria-labelledby",
                    element
                );
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateModalizerProps(props: Types.ModalizerProps): void {
    // TODO: Implement validation.
}

/**
 * Manages the dummy inputs for the Modalizer API
 */
class ModalizerAPIDummyManager extends DummyInputManager {
    private _modalizerAPI: ModalizerAPI;
    private _tabster: Types.TabsterCore;

    constructor(
        modalizerAPI: ModalizerAPI,
        tabster: Types.TabsterCore,
        element: WeakHTMLElement
    ) {
        super(tabster, element, DummyInputManagerPriorities.Modalizer);

        this._modalizerAPI = modalizerAPI;
        this._tabster = tabster;
        this.setTabbable(false);

        this._setHandlers(this._onFocusDummyInput);
    }

    private _onFocusDummyInput = (dummyInput: DummyInput) => {
        const activeModalizer = this._modalizerAPI.activeModalizer;
        if (!activeModalizer) {
            return;
        }

        if (dummyInput.shouldMoveOut) {
            return;
        }

        const findFn = dummyInput.isFirst ? "findFirst" : "findLast";
        const next = this._tabster.focusable[findFn]({
            container: activeModalizer.getElement(),
        });
        if (next) {
            this._tabster.focusedElement.focus(next);
        }
    };
}

export class ModalizerAPI implements Types.ModalizerAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _dummyManager?: ModalizerAPIDummyManager;
    /** The currently active modalizer */
    activeModalizer: Types.Modalizer | undefined;
    private _focusOutTimer: number | undefined;
    private _restoreModalizerFocusTimer: number | undefined;
    /**
     * Modalizers managed by this API, stored by id
     */
    private _modalizers: Record<string, Types.Modalizer>;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
        this._modalizers = {};
        const documentBody = this._win().document.body;
        if (!tabster.controlTab) {
            this._dummyManager = new ModalizerAPIDummyManager(
                this,
                tabster,
                new WeakHTMLElement(this._win, documentBody)
            );
        }
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._tabster.focusedElement.subscribe(this._onFocus);
    };

    dispose(): void {
        const win = this._win();
        this._dummyManager?.dispose();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.clearTimeout(this._restoreModalizerFocusTimer);
        win.clearTimeout(this._focusOutTimer);

        // Dispose all modalizers managed by the API
        Object.keys(this._modalizers).forEach((modalizerId) => {
            if (this._modalizers[modalizerId]) {
                this._modalizers[modalizerId].dispose();
                delete this._modalizers[modalizerId];
            }
        });

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        delete this.activeModalizer;
    }

    createModalizer(
        element: HTMLElement,
        props: Types.ModalizerProps
    ): Types.Modalizer {
        if (__DEV__) {
            validateModalizerProps(props);
        }

        const modalizer = new Modalizer(
            this._tabster,
            element,
            this._onModalizerDispose,
            this._dummyManager?.moveOutWithDefaultAction ?? (() => null),
            this._dummyManager?.setTabbable ?? (() => null),
            props
        );

        this._modalizers[props.id] = modalizer;

        // Adding a modalizer which is already focused, activate it
        if (
            element.contains(
                this._tabster.focusedElement.getFocusedElement() ?? null
            )
        ) {
            const prevModalizer = this.activeModalizer;
            if (prevModalizer) {
                prevModalizer.setActive(false);
            }
            this.activeModalizer = modalizer;
            this.activeModalizer.setActive(true);
        }

        return modalizer;
    }

    private _onModalizerDispose = (modalizer: Modalizer) => {
        modalizer.setActive(false);

        if (this.activeModalizer === modalizer) {
            this.activeModalizer = undefined;
        }

        delete this._modalizers[modalizer.userId];
    };

    focus(
        elementFromModalizer: HTMLElement,
        noFocusFirst?: boolean,
        noFocusDefault?: boolean
    ): boolean {
        const ctx = RootAPI.getTabsterContext(
            this._tabster,
            elementFromModalizer
        );

        if (ctx && ctx.modalizer) {
            this.activeModalizer = ctx.modalizer;
            this.activeModalizer.setActive(true);

            const props = this.activeModalizer.getProps();
            const modalizerRoot = this.activeModalizer.getElement();

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

    updateModalizer(modalizer: Types.Modalizer, removed?: boolean): void {
        if (removed) {
            if (modalizer.isActive()) {
                modalizer.setActive(false);
            }

            delete this._modalizers[modalizer.userId];

            if (this.activeModalizer === modalizer) {
                this.activeModalizer = undefined;
            }
        }
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

        if (this._focusOutTimer) {
            this._win().clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        const modalizer = ctx?.modalizer;
        if (modalizer === this.activeModalizer) {
            return;
        }

        // Developers calling `element.focus()` should change/deactivate active modalizer
        if (
            details.isFocusedProgrammatically &&
            !this.activeModalizer?.contains(focusedElement)
        ) {
            this.activeModalizer?.setActive(false);
            this.activeModalizer = undefined;

            if (modalizer) {
                this.activeModalizer = modalizer;
                this.activeModalizer.setActive(true);
            }
        } else if (!this.activeModalizer?.getProps().isOthersAccessible) {
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
        if (!outsideElement?.ownerDocument || !this.activeModalizer) {
            return;
        }

        let toFocus = this._tabster.focusable.findFirst({
            container: this.activeModalizer.getElement(),
        });
        if (toFocus) {
            if (
                outsideElement.compareDocumentPosition(toFocus) &
                document.DOCUMENT_POSITION_PRECEDING
            ) {
                toFocus = this._tabster.focusable.findLast({
                    container: outsideElement.ownerDocument.body,
                });

                if (!toFocus) {
                    // This only might mean that findFirst/findLast are buggy and inconsistent.
                    throw new Error("Something went wrong.");
                }
            }

            this._tabster.focusedElement.focus(toFocus);
        } else {
            // Current Modalizer doesn't seem to have focusable elements.
            // Blurring the currently focused element which is outside of the current Modalizer.
            outsideElement.blur();
        }
    }
}
