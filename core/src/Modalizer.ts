/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { augmentAttribute } from './Instance';
import { RootAPI } from './Root';
import * as Types from './Types';
import { createElementTreeWalker, TabsterPart, triggerEvent, WeakHTMLElement } from './Utils';

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
                element.style.removeProperty('--tabster-modalizer');
            } else {
                element.style.setProperty(
                    '--tabster-modalizer',
                    internalId + ',' + userId +
                        ',' +
                            (isActive ? 'active' : 'inactive') +
                                ',' +
                                    ',' +
                                        (isFocused ? 'focused' : 'not-focused')
                );
            }
        }
    }
}

export class Modalizer extends TabsterPart<Types.ModalizerProps> implements Types.Modalizer {
    readonly internalId: string;
    userId: string;

    private _isActive: boolean | undefined;
    private _isFocused = false;
    /**
     * Parent of modalizer Root, can be used for DOM cleanup if the modalizerRoot is no longer present
     */
    private _modalizerParent: WeakHTMLElement | null;
    private _onDispose: (modalizer: Modalizer) => void;

    constructor(
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        onDispose: (modalizer: Modalizer) => void,
        props: Types.ModalizerProps
    ) {
        super(tabster, element, props);

        this.internalId = 'ml' + ++_lastInternalId;
        this.userId = props.id;
        this._onDispose = onDispose;

        const parentElement = element.parentElement;
        if (parentElement) {
            this._modalizerParent = new WeakHTMLElement(tabster.getWindow, parentElement);
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
                this._isFocused,
            );
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

    setActive(active: boolean): void {
        if (active === this._isActive) {
            return;
        }

        this._isActive = active;

        if (__DEV__) {
            _setInformativeStyle(
                this._element, false, this.internalId, this.userId, this._isActive, this._isFocused
            );
        }

        let targetDocument = this._element.get()?.ownerDocument || this._modalizerParent?.get()?.ownerDocument;
        // Document can't be determined frm the modalizer root or its parent, fallback to window
        if (!targetDocument) {
            targetDocument = this._tabster.getWindow().document;
        }
        const root = targetDocument.body;

        // Sets or restores aria-hidden value based on `active` flag
        const ariaHiddenWalker = createElementTreeWalker(targetDocument, root, (el: HTMLElement) => {
            // if other content should be accessible no need to do walk the tree
            if (this._props.isOthersAccessible) {
                return NodeFilter.FILTER_REJECT;
            }

            const modalizerRoot = this._element.get();
            const modalizerParent = this._modalizerParent?.get();
            const isModalizerElement = modalizerRoot === el;
            const containsModalizerRoot = !!el.contains(modalizerRoot || null);
            const containsModalizerParent = !!el.contains(modalizerParent || null);

            if (isModalizerElement) {
                return NodeFilter.FILTER_REJECT;
            }

            if (containsModalizerRoot || containsModalizerParent) {
                return NodeFilter.FILTER_SKIP;
            }

            // Add `aria-hidden` when modalizer is active
            // Restore `aria-hidden` when modalizer is inactive
            augmentAttribute(this._tabster, el, 'aria-hidden', active ? 'true' : undefined);

            const modalizerRootOnPage = (modalizerRoot === modalizerRoot?.ownerDocument.body)
                ? false
                : modalizerRoot?.ownerDocument.body.contains(modalizerRoot);

            const modalizerParentOnPage = (modalizerParent === modalizerParent?.ownerDocument.body)
                ? false
                : modalizerParent?.ownerDocument.body.contains(modalizerParent);

            // if the modalizer root or its parent is not on the page, all nodes need to be visited
            if (!modalizerParentOnPage && !modalizerRootOnPage) {
                return NodeFilter.FILTER_SKIP;
            }

            return NodeFilter.FILTER_REJECT;
        });

        if (ariaHiddenWalker) {
            while (ariaHiddenWalker.nextNode()) { /** Iterate to update the tree */ }
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
            ? !triggerEvent<Types.ModalizerEventDetails>(element, Types.ModalizerEventName, { eventName: 'beforefocusout' })
            : false;
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, true);
        }
    }

    private _setAccessibilityProps(): void {
        if (__DEV__) {
            if (!this._element.get()?.getAttribute('aria-label')) {
                console.error('Modalizer element must have aria-label', this._element.get());
            }
        }
    }
}

function validateModalizerProps(props: Types.ModalizerProps): void {
    // TODO: Implement validation.
}

export class ModalizerAPI implements Types.ModalizerAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    /**
     * The current active modalizer
     */
    private _curModalizer: Types.Modalizer | undefined;
    private _focusOutTimer: number | undefined;
    private _restoreModalizerFocusTimer: number | undefined;
    /**
     * Modalizers managed by this API, stored by id
     */
    private _modalizers: Record<string, Types.Modalizer>;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
        this._win = (tabster as Types.TabsterInternal).getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
        this._modalizers = {};
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._tabster.focusedElement.subscribe(this._onFocus);
    }

    protected dispose(): void {
        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.clearTimeout(this._restoreModalizerFocusTimer);
        win.clearTimeout(this._focusOutTimer);

        // Dispose all modalizers managed by the API
        Object.keys(this._modalizers).forEach(modalizerId => {
            if (this._modalizers[modalizerId]) {
                this._modalizers[modalizerId].dispose();
                delete this._modalizers[modalizerId];
            }
        });

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        delete this._curModalizer;
    }

    static dispose(instance: Types.ModalizerAPI): void {
        (instance as ModalizerAPI).dispose();
    }

    static createModalizer: Types.ModalizerConstructor = (
        tabster: Types.TabsterInternal,
        element: HTMLElement,
        props: Types.ModalizerProps
    ): Types.Modalizer => {
        validateModalizerProps(props);

        const self = (tabster as Types.TabsterInternal).modalizer as ModalizerAPI;
        const modalizer = new Modalizer(tabster, element, self._onModalizerDispose, props);

        self._modalizers[props.id] = modalizer;

        // Adding a modalizer which is already focused, activate it
        if (element.contains(tabster.focusedElement.getFocusedElement() ?? null)) {
            const prevModalizer = self._curModalizer;
            if (prevModalizer) {
                prevModalizer.setActive(false);
            }
            self._curModalizer = modalizer;
            self._curModalizer.setActive(true);
        }

        return modalizer;
    }

    private _onModalizerDispose = (modalizer: Modalizer) => {
        modalizer.setActive(false);

        if (this._curModalizer === modalizer) {
            this._curModalizer = undefined;
        }

        delete this._modalizers[modalizer.userId];
    }

    focus(elementFromModalizer: HTMLElement, noFocusFirst?: boolean, noFocusDefault?: boolean): boolean {
        const ctx = RootAPI.getTabsterContext(this._tabster, elementFromModalizer);

        if (ctx && ctx.modalizer) {
            this._curModalizer = ctx.modalizer;
            this._curModalizer.setActive(true);

            const props = this._curModalizer.getProps();
            const modalizerRoot = this._curModalizer.getElement();

            if (modalizerRoot) {
                if (noFocusFirst === undefined) {
                    noFocusFirst = props.isNoFocusFirst;
                }

                if (
                    !noFocusFirst &&
                    this._tabster.keyboardNavigation.isNavigatingWithKeyboard() &&
                    this._tabster.focusedElement.focusFirst({ container: modalizerRoot })
                ) {
                    return true;
                }

                if (noFocusDefault === undefined) {
                    noFocusDefault = props.isNoFocusDefault;
                }

                if (!noFocusDefault && this._tabster.focusedElement.focusDefault(modalizerRoot)) {
                    return true;
                }

                this._tabster.focusedElement.resetFocus(modalizerRoot);
            }
        } else if (__DEV__) {
            console.error('Element is not in Modalizer.', elementFromModalizer);
        }

        return false;
    }

    getActiveModalizer() {
        return this._curModalizer;
    }

    static updateModalizer(
        tabster: Types.TabsterInternal,
        modalizer: Types.Modalizer,
        removed?: boolean
    ): void {
        if (removed && tabster.modalizer) {
            const self = tabster.modalizer as ModalizerAPI;

            if (modalizer.isActive()) {
                modalizer.setActive(false);
            }

            delete self._modalizers[modalizer.userId];

            if (self._curModalizer === modalizer) {
                self._curModalizer = undefined;
            }
        }
    }

    updateModalizer = (modalizer: Modalizer, removed?: boolean) => {
        if (removed) {
            if (modalizer.isActive()) {
                modalizer.setActive(false);
            }

            delete this._modalizers[modalizer.userId];

            if (this._curModalizer === modalizer) {
                this._curModalizer = undefined;
            }
        }
    }

    /**
     * Subscribes to the focus state and handles modalizer related focus events
     * @param e - Element that is focused
     * @param details - Additional data about the focus event
     */
    private _onFocus = (focusedElement: HTMLElement | undefined, details: Types.FocusedElementDetails): void => {
        const ctx = focusedElement && RootAPI.getTabsterContext(this._tabster, focusedElement);
        // Modalizer behaviour is opt in, only apply to elements that have a tabster context
        if (!ctx || !focusedElement) {
            return;
        }

        if (this._focusOutTimer) {
            this._win().clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        const modalizer = ctx?.modalizer;
        if (modalizer === this._curModalizer) {
            return;
        }

        // Developers calling `element.focus()` should change/deactivate active modalizer
        if (details.isFocusedProgrammatically && !this._curModalizer?.contains(focusedElement)) {
            this._curModalizer?.setActive(false);
            this._curModalizer = undefined;

            if (modalizer) {
                this._curModalizer = modalizer;
                this._curModalizer.setActive(true);
            }
        } else if (!this._curModalizer?.getProps().isOthersAccessible) {
            // Focused outside of the active modalizer, try pull focus back to current modalizer
            const win = this._win();
            win.clearTimeout(this._restoreModalizerFocusTimer);
            // TODO some rendering frameworks (i.e. React) might async rerender the DOM so we need to wait for a duration
            // Figure out a better way of doing this rather than a 100ms timeout
            this._restoreModalizerFocusTimer = win.setTimeout(() => this._restoreModalizerFocus(focusedElement), 100);
        }
    }

    /**
     * Called when an element is focused outside of an active modalizer.
     * Attempts to pull focus back into the active modalizer
     * @param outsideElement - An element being focused outside of the modalizer
     */
    private _restoreModalizerFocus(outsideElement: HTMLElement | undefined): void {
        if (!outsideElement?.ownerDocument || !this._curModalizer) {
            return;
        }

        let toFocus = this._tabster.focusable.findFirst({ container: this._curModalizer.getElement() });
        if (toFocus) {
            if (outsideElement.compareDocumentPosition(toFocus) & document.DOCUMENT_POSITION_PRECEDING) {
                toFocus = this._tabster.focusable.findLast({ container: outsideElement.ownerDocument.body });

                if (!toFocus) {
                    // This only might mean that findFirst/findLast are buggy and inconsistent.
                    throw new Error('Something went wrong.');
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
