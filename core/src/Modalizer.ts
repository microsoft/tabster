/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { augmentAttribute, getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { dispatchMutationEvent } from './MutationEvent';
import { RootAPI } from './Root';
import * as Types from './Types';

let _lastInternalId = 0;

function _setInformativeStyle(
    element: HTMLElement,
    remove: boolean,
    internalId?: string,
    userId?: string,
    isActive?: boolean,
    isAccessible?: boolean,
    isFocused?: boolean
): void {
    if (__DEV__) {
        if (remove) {
            element.style.removeProperty('--ah-modalizer');
        } else {
            element.style.setProperty(
                '--ah-modalizer',
                internalId + ',' + userId +
                    ',' +
                        (isActive ? 'active' : 'inactive') +
                            ',' +
                                (isAccessible ? 'accessible' : 'inaccessible') +
                                    ',' +
                                        (isFocused ? 'focused' : 'not-focused')
            );
        }
    }
}

export class Modalizer implements Types.Modalizer {
    readonly internalId: string;
    userId: string;

    /* private */ _ah: Types.AbilityHelpers;
    private _element: HTMLElement;
    private _basic: Types.ModalizerBasicProps;
    private _extended: Types.ModalizerExtendedProps;
    private _isActive: boolean | undefined;
    private _isAccessible = true;
    private _setAccessibleTimer: number | undefined;
    private _isFocused = false;

    constructor(
        element: HTMLElement,
        ah: Types.AbilityHelpers,
        basic: Types.ModalizerBasicProps,
        extended?: Types.ModalizerExtendedProps
    ) {
        this._ah = ah;

        this.internalId = 'ml' + ++_lastInternalId;
        this.userId = basic.id;

        this._element = element;
        this._basic = basic;
        this._extended = extended || {};
        this._setAccessibilityProps();

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this.internalId, this.userId, this._isActive, this._isAccessible, this._isFocused);
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
        this._remove();
    }

    move(newElement: HTMLElement): void {
        this._remove();

        this._element = newElement;

        this._setAccessibilityProps();

        this._isAccessible = !this._isAccessible;
        this._isActive = !this._isActive;

        this.setAccessible(!this._isAccessible);
        this.setActive(!this._isActive);
    }

    setAccessible(accessible: boolean): void {
        if (accessible === this._isAccessible) {
            return;
        }

        this._isAccessible = accessible;

        if (this._setAccessibleTimer) {
            window.clearTimeout(this._setAccessibleTimer);

            this._setAccessibleTimer = undefined;
        }

        if (accessible) {
            augmentAttribute(this._element, 'aria-hidden');
        } else {
            this._setAccessibleTimer = window.setTimeout(() => {
                this._setAccessibleTimer = undefined;

                augmentAttribute(this._element, 'aria-hidden', 'true');
            }, 0);
        }

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this.internalId, this.userId, this._isActive, this._isAccessible, this._isFocused);
        }
    }

    setActive(active: boolean): void {
        if (active === this._isActive) {
            return;
        }

        this._isActive = active;

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this.internalId, this.userId, this._isActive, this._isAccessible, this._isFocused);
        }
    }

    isActive(): boolean {
        return !!this._isActive;
    }

    getElement(): HTMLElement {
        return this._element;
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
            _setInformativeStyle(this._element, false, this.internalId, this.userId, this._isActive, this._isAccessible, this._isFocused);
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
            _setInformativeStyle(this._element, true);
        }
    }

    private _setAccessibilityProps(): void {
        if (__DEV__ && !this._element.getAttribute('aria-label')) {
            console.error('Modalizer must have aria-label', this._element);

            return;
        }
    }
}

export class ModalizerAPI implements Types.ModalizerAPI {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _initTimer: number | undefined;
    private _curModalizer: Types.Modalizer | undefined;
    private _focusOutTimer: number | undefined;

    constructor(ah: Types.AbilityHelpers, mainWindow: Window) {
        this._ah = ah;
        this._mainWindow = mainWindow;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._ah.focusedElement.subscribe(this._onElementFocused);
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._focusOutTimer) {
            this._mainWindow.clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        this._ah.focusedElement.unsubscribe(this._onElementFocused);
    }

    add(element: HTMLElement, basic: Types.ModalizerBasicProps, extended?: Types.ModalizerExtendedProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.modalizer) {
            if (__DEV__ && (ah.modalizer.userId !== basic.id)) {
                console.error('Element already has Modalizer with different id.', element);
            }

            return;
        }

        const modalizer = new Modalizer(element, this._ah, basic, extended);

        setAbilityHelpersOnElement(element, { modalizer });

        dispatchMutationEvent(element, { modalizer });
    }

    setProps(
        element: HTMLElement,
        basic?: Partial<Types.ModalizerBasicProps> | null,
        extended?: Partial<Types.ModalizerExtendedProps> | null
    ): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.modalizer) {
            ah.modalizer.setProps(basic, extended);
        }
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        const modalizer = ah && ah.modalizer;

        if (!modalizer) {
            if (__DEV__) {
                console.error('No Modalizer to remove.', element);
            }

            return;
        }

        setAbilityHelpersOnElement(element, {
            modalizer: undefined
        });

        dispatchMutationEvent(element, { modalizer, removed: true });

        modalizer.dispose();
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);

        const modalizer = ahFrom && ahFrom.modalizer;

        if (modalizer) {
            modalizer.move(to);

            setAbilityHelpersOnElement(to, { modalizer: modalizer });
            setAbilityHelpersOnElement(from, { modalizer: undefined });

            dispatchMutationEvent(from, { modalizer, removed: true });
            dispatchMutationEvent(to, { modalizer });
        }
    }

    focus(elementFromModalizer: HTMLElement, noFocusFirst?: boolean, noFocusDefault?: boolean): boolean {
        const m = RootAPI.findRootAndModalizer(elementFromModalizer);

        if (m && m.modalizer) {
            const basic = m.modalizer.getBasicProps();
            const modalizerElement = m.modalizer.getElement();

            if (noFocusFirst === undefined) {
                noFocusFirst = basic.isNoFocusFirst;
            }

            if (
                !noFocusFirst &&
                this._ah.keyboardNavigation.isNavigatingWithKeyboard() &&
                this._ah.focusedElement.focusFirst(modalizerElement)
            ) {
                return true;
            }

            if (noFocusDefault === undefined) {
                noFocusDefault = basic.isNoFocusDefault;
            }

            if (!noFocusDefault && this._ah.focusedElement.focusDefault(modalizerElement)) {
                return true;
            }

            this._ah.focusedElement.resetFocus(modalizerElement);
        } else if (__DEV__) {
            console.error('Element is not in Modalizer.', elementFromModalizer);
        }

        return false;
    }

    private _onElementFocused = (e: HTMLElement): void => {
        if (this._focusOutTimer) {
            this._mainWindow.clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        let modalizer: Types.Modalizer | undefined;

        if (e) {
            const l = RootAPI.findRootAndModalizer(e);

            if (l) {
                modalizer = l.modalizer;
            }
        }

        if (modalizer) {
            if (this._curModalizer && (modalizer !== this._curModalizer)) {
                this._curModalizer.setFocused(false);
            }

            this._curModalizer = modalizer;

            this._curModalizer.setFocused(true);
        } else if (this._curModalizer) {
            this._focusOutTimer = this._mainWindow.setTimeout(() => {
                this._focusOutTimer = undefined;

                if (this._curModalizer) {
                    this._curModalizer.setFocused(false);

                    this._curModalizer = undefined;
                }
            }, 0);
        }
    }
}
