/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { augmentAttribute, getTabsterOnElement, setTabsterOnElement } from './Instance';
import { dispatchMutationEvent, MutationEvent, MUTATION_EVENT_NAME} from './MutationEvent';
import { RootAPI } from './Root';
import * as Types from './Types';
import { createElementTreeWalker, WeakHTMLElement } from './Utils';

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

export class Modalizer implements Types.Modalizer {
    readonly internalId: string;
    userId: string;

    /* private */ _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _basic: Types.ModalizerBasicProps;
    private _extended: Types.ModalizerExtendedProps;
    private _isActive: boolean | undefined;
    private _isFocused = false;
    /**
     * Root element of the modal
     */
    private _modalizerRoot: WeakHTMLElement;
    /**
     * Parent of modalizer Root, can be used for DOM cleanup if the modalizerRoot is no longer present
     */
    private _modalizerParent: WeakHTMLElement | null;

    constructor(
        element: HTMLElement,
        tabster: Types.TabsterCore,
        win: Types.GetWindow,
        basic: Types.ModalizerBasicProps,
        extended?: Types.ModalizerExtendedProps
    ) {
        this._tabster = tabster;
        this._win = win;

        this.internalId = 'ml' + ++_lastInternalId;
        this.userId = basic.id;

        this._modalizerRoot = new WeakHTMLElement(win, element);
        if (element.parentElement) {
            this._modalizerParent = new WeakHTMLElement(win, element.parentElement);
        } else {
            this._modalizerParent = null;
        }

        this._basic = basic;
        this._extended = extended || {};
        this._setAccessibilityProps();

        if (__DEV__) {
            _setInformativeStyle(
                this._modalizerRoot,
                false,
                this.internalId,
                this.userId,
                this._isActive,
                this._isFocused,
            );
        }
    }

    setProps(basic?: Partial<Types.ModalizerBasicProps> | null, extended?: Partial<Types.ModalizerExtendedProps> | null): void {
        if (basic) {
            if (basic.id) {
                this.userId = basic.id;
            }

            this._basic = { ...this._basic, ...basic };
        } else if (basic === null) {
            this._basic = { id: this.userId };
        }

        if (extended) {
            this._extended = { ...this._extended, ...extended };
        } else if (extended === null) {
            this._extended = {};
        }

        this._setAccessibilityProps();
    }

    dispose(): void {
        if (this._isFocused) {
            this.setFocused(false);
        }

        this._remove();

        this._extended = {};
    }

    move(newElement: HTMLElement): void {
        this._remove();
        this._modalizerRoot = new WeakHTMLElement(this._win, newElement);
        if (newElement.parentElement) {
            this._modalizerParent = new WeakHTMLElement(this._win, newElement.parentElement);
        }

        this._setAccessibilityProps();

        this._isActive = !this._isActive;
        this.setActive(!this._isActive);
    }

    setActive(active: boolean): void {
        if (active === this._isActive) {
            return;
        }

        this._isActive = active;

        if (__DEV__) {
            _setInformativeStyle(
                this._modalizerRoot, false, this.internalId, this.userId, this._isActive, this._isFocused
            );
        }

        let targetDocument = this._modalizerRoot.get()?.ownerDocument || this._modalizerParent?.get()?.ownerDocument;
        // Document can't be determined frm the modalizer root or its parent, fallback to window
        if (!targetDocument) {
            targetDocument = this._win().document;
        }
        const root = targetDocument.body;

        // Sets or restores aria-hidden value based on `active` flag
        const ariaHiddenWalker = createElementTreeWalker(targetDocument, root, (el: HTMLElement) => {
            // if other content should be accessible no need to do walk the tree
            if (this._basic.isOthersAccessible) {
                return NodeFilter.FILTER_REJECT;
            }

            const modalizerRoot = this._modalizerRoot.get();
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

    getModalizerRoot(): HTMLElement | undefined  {
        return this._modalizerRoot.get();
    }

    contains(element: HTMLElement) {
        return !!this.getModalizerRoot()?.contains(element);
    }

    setFocused(focused: boolean): void {
        if (this._isFocused === focused) {
            return;
        }

        this._isFocused = focused;

        if (focused) {
            if (this._extended.onFocusIn) {
                this._extended.onFocusIn();
            }
        } else {
            if (this._extended.onFocusOut) {
                this._extended.onFocusOut(false);
            }
        }

        if (__DEV__) {
            _setInformativeStyle(
                this._modalizerRoot, false, this.internalId, this.userId, this._isActive, this._isFocused
            );
        }
    }

    onBeforeFocusOut(): boolean {
        if (this._extended.onFocusOut) {
            return this._extended.onFocusOut(true);
        }

        return false;
    }

    getBasicProps(): Types.ModalizerBasicProps {
        return this._basic;
    }

    getExtendedProps(): Types.ModalizerExtendedProps {
        return this._extended;
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._modalizerRoot, true);
        }
    }

    private _setAccessibilityProps(): void {
        if (__DEV__) {
            if (!this._modalizerRoot.get()?.getAttribute('aria-label')) {
                console.error('Modalizer element must have aria-label', this._modalizerRoot.get());
            }
        }
    }
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
    /**
     * Modalizers managed by this API, stored by id
     */
    private _modalizers: Record<string, Types.Modalizer>;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
        this._win = (tabster as unknown as Types.TabsterInternal).getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
        this._modalizers = {};
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._tabster.focusedElement.subscribe(this._onFocus);
        this._win().document.addEventListener(MUTATION_EVENT_NAME, this._onMutation);
    }

    protected dispose(): void {
        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._focusOutTimer) {
            win.clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

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

    add(element: HTMLElement, basic: Types.ModalizerBasicProps, extended?: Types.ModalizerExtendedProps): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (tabsterOnElement && tabsterOnElement.modalizer) {
            if (__DEV__ && (tabsterOnElement.modalizer.userId !== basic.id)) {
                console.error('Element already has Modalizer with different id.', element);
            }

            return;
        }

        if (this._modalizers[basic.id] && __DEV__) {
            const err = new Error(`Attempting to add Modalizer: ${basic.id} which already exists`);
            console.error(err.stack);
        }

        const modalizer = new Modalizer(element, this._tabster, this._win, basic, extended);
        this._modalizers[basic.id] = modalizer;

        // Adding a modalizer which is already focused, activate it
        if (element.contains(this._tabster.focusedElement.getFocusedElement() ?? null)) {
            const prevModalizer = this._curModalizer;
            if (prevModalizer) {
                prevModalizer.setActive(false);
                prevModalizer.setFocused(false);
            }
            this._curModalizer = modalizer;
            this._curModalizer.setActive(true);
        }

        setTabsterOnElement(this._tabster, element, { modalizer: this._modalizers[basic.id] });

        dispatchMutationEvent(element, { modalizer: this._modalizers[basic.id] });
    }

    setProps(
        element: HTMLElement,
        basic?: Partial<Types.ModalizerBasicProps> | null,
        extended?: Partial<Types.ModalizerExtendedProps> | null
    ): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (tabsterOnElement && tabsterOnElement.modalizer) {
            tabsterOnElement.modalizer.setProps(basic, extended);
        }
    }

    remove(element: HTMLElement): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        const modalizer = tabsterOnElement && tabsterOnElement.modalizer;

        if (!modalizer) {
            if (__DEV__) {
                console.error('No Modalizer to remove.', element);
            }

            return;
        }

        setTabsterOnElement(this._tabster, element, {
            modalizer: undefined
        });

        modalizer.setActive(false);
        if (this._curModalizer === modalizer) {
            this._curModalizer = undefined;
        }

        delete this._modalizers[modalizer.userId];
        modalizer.dispose();
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);

        const modalizer = tabsterOnElementFrom && tabsterOnElementFrom.modalizer;

        if (modalizer) {
            modalizer.move(to);

            setTabsterOnElement(this._tabster, to, { modalizer: modalizer });
            setTabsterOnElement(this._tabster, from, { modalizer: undefined });

            dispatchMutationEvent(from, { modalizer, removed: true });
            dispatchMutationEvent(to, { modalizer });
        }
    }

    focus(elementFromModalizer: HTMLElement, noFocusFirst?: boolean, noFocusDefault?: boolean): boolean {
        const ctx = RootAPI.getTabsterContext(this._tabster, elementFromModalizer);

        if (ctx && ctx.modalizer) {
            this._curModalizer = ctx.modalizer;
            this._curModalizer.setActive(true);

            const basic = this._curModalizer.getBasicProps();
            const modalizerRoot = this._curModalizer.getModalizerRoot();

            if (modalizerRoot) {
                if (noFocusFirst === undefined) {
                    noFocusFirst = basic.isNoFocusFirst;
                }

                if (
                    !noFocusFirst &&
                    this._tabster.keyboardNavigation.isNavigatingWithKeyboard() &&
                    this._tabster.focusedElement.focusFirst({ container: modalizerRoot })
                ) {
                    return true;
                }

                if (noFocusDefault === undefined) {
                    noFocusDefault = basic.isNoFocusDefault;
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

    /**
     * Listens to DOM mutation events for removed modalizers
     */
    private _onMutation = (e: MutationEvent) => {
        const details = e.details;
        if (!details.modalizer || !details.removed) {
            return;
        }

        const removedModalizer = details.modalizer;
        // If an active modalizer is no longer on DOM, deactivate it
        if (removedModalizer.isActive()) {
            removedModalizer.setFocused(false);
            removedModalizer.setActive(false);
        }

        removedModalizer.dispose();
        delete this._modalizers[removedModalizer.userId];
        if (this._curModalizer === removedModalizer) {
            this._curModalizer = undefined;
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

        this._curModalizer?.setFocused(false);

        // Developers calling `element.focus()` should change/deactivate active modalizer
        if (details.isFocusedProgrammatically && !this._curModalizer?.contains(focusedElement)) {
            this._curModalizer?.setActive(false);
            this._curModalizer = undefined;

            if (modalizer) {
                this._curModalizer = modalizer;
                this._curModalizer.setActive(true);
                this._curModalizer.setFocused(true);
            }
        } else if (!this._curModalizer?.getBasicProps().isOthersAccessible) {
            // Focused outside of the active modalizer, try pull focus back to current modalizer
            this._restoreModalizerFocus(focusedElement);
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

        let toFocus = this._tabster.focusable.findFirst({ container: this._curModalizer.getModalizerRoot() });
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
