/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { nativeFocus } from "keyborg";
// import { augmentAttribute } from "./Instance";
import { RootAPI } from "./Root";
import { FocusedElementState } from "./State/FocusedElement";
import * as Types from "./Types";
import {
    // createElementTreeWalker,
    DummyInput,
    DummyInputManager,
    DummyInputManagerPriorities,
    TabsterPart,
    WeakHTMLElement,
} from "./Utils";

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

/**
 * Manages the dummy inputs for the Modalizer.
 */
class ModalizerDummyManager extends DummyInputManager {
    constructor(
        element: WeakHTMLElement,
        modalizer: Modalizer,
        tabster: Types.TabsterCore
    ) {
        super(tabster, element, DummyInputManagerPriorities.Modalizer);

        this._setHandlers((dummyInput: DummyInput) => {
            const container = element.get();
            const input = dummyInput.input;

            if (container && !dummyInput.shouldMoveOut && input) {
                const ctx = RootAPI.getTabsterContext(tabster, input);

                let toFocus: HTMLElement | null | undefined;

                if (ctx) {
                    toFocus = FocusedElementState.findNextTabbable(
                        tabster,
                        ctx,
                        undefined,
                        input,
                        !dummyInput.isFirst
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
    private _isFocused = false;
    private _onDispose: (modalizer: Modalizer) => void;

    dummyManager: ModalizerDummyManager | undefined;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (modalizer: Modalizer) => void,
        props: Types.ModalizerProps
    ) {
        super(tabster, element, props);

        this.userId = props.id;
        this._onDispose = onDispose;
        this._setAccessibilityProps();

        if (!tabster.controlTab) {
            this.dummyManager = new ModalizerDummyManager(
                this._element,
                this,
                tabster
            );
        }

        if (__DEV__) {
            _setInformativeStyle(
                this._element,
                false,
                this.id,
                this.userId,
                this._isActive,
                this._isFocused
            );
        }
    }

    makeActive(isActive: boolean): void {
        if (this._isActive !== isActive) {
            this._isActive = isActive;

            if (__DEV__) {
                _setInformativeStyle(
                    this._element,
                    false,
                    this.id,
                    this.userId,
                    this._isActive,
                    this._isFocused
                );
            }
        }
    }

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

    isActive(): boolean {
        return !!this._isActive;
    }

    contains(element: HTMLElement) {
        return !!this.getElement()?.contains(element);
    }

    findNextTabbable(
        currentElement?: HTMLElement,
        isBackward?: boolean
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
            });

            if (!uncontrolled && !next && this._props.isTrapped) {
                next = tabster.focusable[isBackward ? "findLast" : "findFirst"](
                    { container }
                );
            }
        }

        return {
            element: next,
            uncontrolled,
        };
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, true);
        }
    }

    private _setAccessibilityProps(): void {
        if (__DEV__) {
            const element = this._element.get();
            if (
                element &&
                !element.getAttribute("aria-label") &&
                !element.getAttribute("aria-labelledby")
            ) {
                console.warn(
                    `Modalizer ${this.id} must have either aria-label or aria-labelledby`
                );
            }
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
    private _focusOutTimer: number | undefined;
    private _restoreModalizerFocusTimer: number | undefined;
    private _modalizers: Record<string, Types.Modalizer>;
    private _layers: Record<string, Record<string, Types.Modalizer>>;

    activeLayer: string | undefined;
    currentIsOthersAccessible: boolean | undefined;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
        this._modalizers = {};
        this._layers = {};
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

        win.clearTimeout(this._restoreModalizerFocusTimer);
        win.clearTimeout(this._focusOutTimer);

        // Dispose all modalizers managed by the API
        Object.keys(this._modalizers).forEach((modalizerId) => {
            if (this._modalizers[modalizerId]) {
                this._modalizers[modalizerId].dispose();
                delete this._modalizers[modalizerId];
            }
        });

        this._layers = {};
        delete this.activeLayer;

        this._tabster.focusedElement.unsubscribe(this._onFocus);
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
            props
        );

        const id = modalizer.id;
        const userId = props.id;

        this._modalizers[id] = modalizer;

        let layer = this._layers[userId];
        if (!layer) {
            layer = this._layers[userId] = {};
        }
        layer[id] = modalizer;

        // Adding a modalizer which is already focused, activate it
        if (
            element.contains(
                this._tabster.focusedElement.getFocusedElement() ?? null
            )
        ) {
            if (userId !== this.activeLayer) {
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
        const layer = this._layers[userId];

        delete this._modalizers[id];

        if (layer) {
            delete layer[id];

            if (Object.keys(layer).length === 0) {
                delete this._layers[userId];

                if (this.activeLayer === userId) {
                    this.setActive(undefined);
                }
            }
        }
    };

    setActive(modalizer: Types.Modalizer | undefined): void {
        const userId = modalizer?.userId;
        const activeLayer = this.activeLayer;

        if (activeLayer === userId) {
            return;
        }

        this.activeLayer = userId;

        if (activeLayer) {
            const layer = this._layers[activeLayer];

            if (layer) {
                for (const id of Object.keys(layer)) {
                    layer[id].makeActive(false);
                }
            }
        }

        if (userId) {
            const layer = this._layers[userId];

            if (layer) {
                for (const id of Object.keys(layer)) {
                    layer[id].makeActive(true);
                }
            }
        }

        this.currentIsOthersAccessible =
            modalizer?.getProps().isOthersAccessible;

        //     let targetDocument =
        //         this._element.get()?.ownerDocument ||
        //         this._modalizerParent?.get()?.ownerDocument;
        //     // Document can't be determined frm the modalizer root or its parent, fallback to window
        //     if (!targetDocument) {
        //         targetDocument = this._tabster.getWindow().document;
        //     }
        //     const root = targetDocument.body;

        //     // Sets or restores aria-hidden value based on `active` flag
        //     const ariaHiddenWalker = createElementTreeWalker(
        //         targetDocument,
        //         root,
        //         (el: HTMLElement) => {
        //             // if other content should be accessible no need to do walk the tree
        //             if (this._props.isOthersAccessible) {
        //                 return NodeFilter.FILTER_REJECT;
        //             }

        //             const modalizerRoot = this._element.get();
        //             const modalizerParent = this._modalizerParent?.get();
        //             const isModalizerElement = modalizerRoot === el;
        //             const containsModalizerRoot = !!el.contains(
        //                 modalizerRoot || null
        //             );
        //             const containsModalizerParent = !!el.contains(
        //                 modalizerParent || null
        //             );

        //             if (isModalizerElement) {
        //                 return NodeFilter.FILTER_REJECT;
        //             }

        //             if (containsModalizerRoot || containsModalizerParent) {
        //                 return NodeFilter.FILTER_SKIP;
        //             }

        //             // Add `aria-hidden` when modalizer is active
        //             // Restore `aria-hidden` when modalizer is inactive
        //             augmentAttribute(
        //                 this._tabster,
        //                 el,
        //                 "aria-hidden",
        //                 active ? "true" : undefined
        //             );

        //             const modalizerRootOnPage =
        //                 modalizerRoot === modalizerRoot?.ownerDocument.body
        //                     ? false
        //                     : modalizerRoot?.ownerDocument.body.contains(
        //                           modalizerRoot
        //                       );

        //             const modalizerParentOnPage =
        //                 modalizerParent === modalizerParent?.ownerDocument.body
        //                     ? false
        //                     : modalizerParent?.ownerDocument.body.contains(
        //                           modalizerParent
        //                       );

        //             // if the modalizer root or its parent is not on the page, all nodes need to be visited
        //             if (!modalizerParentOnPage && !modalizerRootOnPage) {
        //                 return NodeFilter.FILTER_SKIP;
        //             }

        //             return NodeFilter.FILTER_REJECT;
        //         }
        //     );

        //     if (ariaHiddenWalker) {
        //         while (ariaHiddenWalker.nextNode()) {
        //             /** Iterate to update the tree */
        //         }
        //     }
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
        if (this.currentIsOthersAccessible) {
            // Current modalizer doesn't restrict availability of outside elements.
            return undefined;
        }

        const modalizerUserId = state.modalizerUserId;
        const currentModalizer = state.currentCtx?.modalizer;

        return modalizerUserId === currentModalizer?.userId ||
            currentModalizer?.getProps().isAlwaysAccessible
            ? undefined
            : NodeFilter.FILTER_SKIP;
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

        if (modalizer?.userId === this.activeLayer) {
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
        const activeLayer = this.activeLayer;

        if (
            (!modalizer && !activeLayer) ||
            (modalizer && activeLayer === modalizer.userId)
        ) {
            return;
        }

        const container = ctx?.root.getElement();

        if (container) {
            let toFocus = this._tabster.focusable.findFirst({ container });

            if (toFocus) {
                if (
                    outsideElement.compareDocumentPosition(toFocus) &
                    document.DOCUMENT_POSITION_PRECEDING
                ) {
                    toFocus = this._tabster.focusable.findLast({
                        container,
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
