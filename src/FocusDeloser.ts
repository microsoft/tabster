/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { ModalityLayer } from './ModalityLayer';
import * as Types from './Types';

const _containerHistoryLength = 10;

let _lastInternalId = 0;

interface FocusDeloserHistoryItem {
    rootId: string;
    history: Types.FocusDeloserContainer[];
}

export class FocusDeloserContainer implements Types.FocusDeloserContainer {
    static lastResetElement: HTMLElement | undefined;

    readonly id: string;

    private _ah: Types.AbilityHelpers;
    private _props: Types.FocusDeloserProps;
    private _isActive = false;
    private _history: HTMLElement[][] = [[]];
    private _snapshotIndex = 0;
    private _element: HTMLElement;

    constructor(element: HTMLElement, props: Types.FocusDeloserProps, ah: Types.AbilityHelpers) {
        this._ah = ah;

        this.id = 'fd' + ++_lastInternalId;
        this._element = element;
        this._props = props;
        this._setInformativeStyle();
    }

    setup(props: Partial<Types.FocusDeloserProps>): void {
        this._props = { ...this._props, ...props };
    }

    move(newContainer: HTMLElement): void {
        this._remove();
        this._element = newContainer;
        this._setInformativeStyle();
    }

    dispose(): void {
        this._isActive = false;
        this._history = [[]];
        this._snapshotIndex = 0;
        this._remove();
    }

    isActive = (): boolean => {
        return this._isActive;
    }

    setActive(active: boolean): void {
        this._isActive = active;
        this._setInformativeStyle();
    }

    getActions(): Types.FocusDeloserElementActions {
        return {
            focusDefault: this.focusDefault,
            focusFirst: this.focusFirst,
            resetFocus: this.resetFocus,
            clearHistory: this.clearHistory,
            setSnapshot: this.setSnapshot,
            isActive: this.isActive
        };
    }

    setSnapshot = (index: number): void => {
        this._snapshotIndex = index;

        if (this._history.length > index + 1) {
            this._history.splice(index + 1, this._history.length - index - 1);
        }

        if (!this._history[index]) {
            this._history[index] = [];
        }

        this._setInformativeStyle();
    }

    focusFirst = (): boolean => {
        if (!this._element) {
            return false;
        }

        const first = this._ah.focusable.findFirst(this._element, false, true);

        if (first) {
            this.clearHistory(true);

            this._ah.focusedElement.focus(first);

            return true;
        }

        return false;
    }

    unshift(element: HTMLElement): void {
        let cur = this._history[this._snapshotIndex];

        cur = this._history[this._snapshotIndex] = cur.filter(e => e !== element);

        cur.unshift(element);

        while (cur.length > _containerHistoryLength) {
            cur.pop();
        }
    }

    focusDefault = (): boolean => {
        if (!this._element) {
            return false;
        }

        const el = this._ah.focusable.findDefault(this._element);

        if (el) {
            this._ah.focusedElement.focus(el);

            return true;
        }

        return false;
    }

    resetFocus = (): boolean => {
        if (!this._ah.focusable.isVisible(this._element)) {
            return false;
        }

        if (!this._ah.focusable.isFocusable(this._element, true, true)) {
            const prevTabIndex = this._element.getAttribute('tabindex');
            const prevAriaHidden = this._element.getAttribute('aria-hidden');

            this._element.tabIndex = -1;
            this._element.setAttribute('aria-hidden', 'true');

            FocusDeloserContainer.lastResetElement = this._element;

            this._ah.focusedElement.focus(this._element, true, true);

            this._setOrRemoveAttribute(this._element, 'tabindex', prevTabIndex);
            this._setOrRemoveAttribute(this._element, 'aria-hidden', prevAriaHidden);
        } else {
            this._ah.focusedElement.focus(this._element, true);
        }

        return true;
    }

    findAvailable(): HTMLElement | null {
        if (!this._ah.focusable.isVisible(this._element)) {
            return null;
        }

        const cur = this._history[this._snapshotIndex].slice(0);

        this.clearHistory(true);

        for (let i = 0; i < cur.length; i++) {
            const e = cur[i];

            if (this._element.contains(e)) {
                if (this._ah.focusable.isFocusable(e)) {
                    return e;
                }
            } else {
                // Element is not in the DOM, try to locate the node by it's
                // selector. This might return not exactly the right node,
                // but it would be easily fixable by having more detailed selectors.
                const selector: string[] = [];

                if (e.id) {
                    selector.push('#' + e.id);
                }

                if (e.className) {
                    e.className.split(' ').forEach(cls => {
                        cls = cls.trim();

                        if (cls) {
                            selector.push('.' + cls);
                        }
                    });
                }

                if (selector.length) {
                    selector.unshift(e.tagName.toLowerCase());

                    const els = this._element.querySelectorAll(selector.join(''));

                    for (let i = 0; i < els.length; i++) {
                        const el = els[i] as HTMLElement;

                        if (el && this._ah.focusable.isFocusable(el)) {
                            return el;
                        }
                    }
                }
            }
        }

        if (this._ah.keyboardNavigation.isNavigatingWithKeyboard()) {
            const first = this._ah.focusable.findFirst(this._element, false, true);

            if (first) {
                return first;
            }
        }

        return this._ah.focusable.findDefault(this._element);
    }

    clearHistory = (preserveExisting?: boolean): void => {
        const element = this._element;

        if (!element) {
            this._history[this._snapshotIndex] = [];

            return;
        }

        this._history[this._snapshotIndex] =
            this._history[this._snapshotIndex].filter(e => preserveExisting ? element.contains(e) : false);
    }

    customFocus(last: HTMLElement): boolean {
        if (this._props.onFocusLost) {
            return this._props.onFocusLost(last, this.getActions());
        }

        return false;
    }

    private _setOrRemoveAttribute(element: HTMLElement, name: string, value: string | null): void {
        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    }

    private _setInformativeStyle(): void {
        this._element.style.setProperty(
            '--ah-focus-deloser',
            (this._isActive ? 'active' : 'inactive') +
                ',' +
                    ('snapshot-' + this._snapshotIndex)
        );
    }

    private _remove(): void {
        this._element.style.removeProperty('--ah-focus-deloser');
    }
}

export class FocusDeloser implements Types.FocusDeloser {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _initTimer: number | undefined;
    private _isInSomeDeloser = false;
    private _curDeloser: Types.FocusDeloserContainer | undefined;
    private _history: FocusDeloserHistoryItem[] = [];
    private _restoreFocusTimer: number | undefined;
    private _curFocusedElement: HTMLElement | undefined;
    private _lastFocusedElement: HTMLElement | undefined;
    private _isPaused = false;

    constructor(mainWindow: Window, ah: Types.AbilityHelpers) {
        this._mainWindow = mainWindow;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);

        this._ah = ah;
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

        this._ah.focusedElement.unsubscribe(this._onElementFocused);
    }

    getActions(element: HTMLElement): Types.FocusDeloserElementActions | undefined {
        for (let e: (HTMLElement | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.focusDeloser) {
                return ah.focusDeloser.getActions();
            }
        }

        return undefined;
    }

    add(element: HTMLElement, props?: Types.FocusDeloserProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.focusDeloser) {
            return;
        }

        setAbilityHelpersOnElement(element, {
            focusDeloser: new FocusDeloserContainer(element, props || {}, this._ah)
        });
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (!ah) {
            return;
        }

        const deloser = ah.focusDeloser;

        if (!deloser) {
            return;
        }

        this._history.forEach(i => {
            i.history = i.history.filter(c => c !== deloser);
        });

        this._history = this._history.filter(i => i.history.length > 0);

        if (deloser.isActive()) {
            this._scheduleRestoreFocus();
        }

        deloser.dispose();

        setAbilityHelpersOnElement(element, {
            focusDeloser: undefined
        });
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);

        if (ahFrom && ahFrom.focusDeloser) {
            ahFrom.focusDeloser.move(to);

            setAbilityHelpersOnElement(to, {
                focusDeloser: ahFrom.focusDeloser
            });

            setAbilityHelpersOnElement(from, {
                focusDeloser: undefined
            });
        }
    }

    pause(): void {
        this._isPaused = true;

        if (this._restoreFocusTimer) {
            this._mainWindow.clearTimeout(this._restoreFocusTimer);
            this._restoreFocusTimer = undefined;
        }
    }

    resume(restore?: boolean): void {
        this._isPaused = false;

        if (restore) {
            this._scheduleRestoreFocus();
        }
    }

    private _getFocusDeloser(element: HTMLElement): Types.FocusDeloserContainer | undefined {
        for (let e: (HTMLElement | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.focusDeloser) {
                return ah.focusDeloser;
            }
        }

        return undefined;
    }

    private _onElementFocused = (e: HTMLElement | undefined): void => {
        if (this._restoreFocusTimer) {
            this._mainWindow.clearTimeout(this._restoreFocusTimer);
            this._restoreFocusTimer = undefined;
        }

        const prev = this._curFocusedElement;

        this._curFocusedElement = e;

        if (e) {
            this._lastFocusedElement = e;
        }

        if (!e) {
            if (!prev || (prev !== FocusDeloserContainer.lastResetElement)) {
                // Avoiding infinite loop which might be caused by resetFocus().
                this._scheduleRestoreFocus();
            }

            FocusDeloserContainer.lastResetElement = undefined;

            return;
        }

        const deloser = this._getFocusDeloser(e);

        if (deloser) {
            this._isInSomeDeloser = true;

            const rootId = ModalityLayer.getRootId(e);

            if (deloser !== this._curDeloser) {
                if (this._curDeloser) {
                    this._curDeloser.setActive(false);
                }

                this._curDeloser = deloser;

                deloser.setActive(true);
            }

            let historyItem: FocusDeloserHistoryItem | undefined;
            let historyItemIndex = -1;

            for (let i = 0; i < this._history.length; i++) {
                const hi = this._history[i];

                if (hi.rootId === rootId) {
                    historyItem = hi;
                    historyItemIndex = i;
                    break;
                }
            }

            if (historyItem) {
                this._history.splice(historyItemIndex, 1);

                const deloserIndex = historyItem.history.indexOf(deloser);

                if (deloserIndex > -1) {
                    historyItem.history.splice(deloserIndex, 1);
                }
            } else {
                historyItem = {
                    rootId,
                    history: []
                };
            }

            historyItem.history.unshift(deloser);
            this._history.unshift(historyItem);

            const ml = ModalityLayer.getLayerFor(e);

            if (!ml || (ml.root.getCurrentLayerId() === ml.layer.userId)) {
                deloser.unshift(e);
            }

            historyItem.history.splice(_containerHistoryLength, this._history.length - _containerHistoryLength);
            this._history.splice(_containerHistoryLength, this._history.length - _containerHistoryLength);
        } else {
            this._isInSomeDeloser = false;

            this._curDeloser = undefined;
        }
    }

    private _isLastFocusedAvailable(): boolean {
        return !!(this._lastFocusedElement && this._lastFocusedElement.offsetParent);
    }

    private _scheduleRestoreFocus(): void {
        if (this._isPaused) {
            return;
        }

        this._restoreFocusTimer = this._mainWindow.setTimeout(() => {
            this._restoreFocusTimer = undefined;

            if (!this._isInSomeDeloser || this._isLastFocusedAvailable()) {
                return;
            }

            if (this._curDeloser) {
                if (this._lastFocusedElement && this._curDeloser.customFocus(this._lastFocusedElement)) {
                    return;
                }

                const el = this._curDeloser.findAvailable();

                if (el && this._ah.focusedElement.focus(el)) {
                    return;
                }
            }

            if (!this._focusAvailable()) {
                this._isInSomeDeloser = false;

                if (this._curDeloser) {
                    this._curDeloser.setActive(false);
                    this._curDeloser = undefined;
                }
            }
        }, 100);
    }

    private _focusAvailable(): boolean {
        const ah = this._ah;

        for (let i = 0; i < this._history.length; i++) {
            const hi = this._history[i];
            const resetQueue: { [id: string]: Types.FocusDeloserContainer } = {};

            for (let j = 0; j < hi.history.length; j++) {
                if (checkDeloser(hi.history[j], resetQueue)) {
                    return true;
                }
            }

            const root = ModalityLayer.getRootById(hi.rootId);
            const layers = root && root.getLayers();

            if (layers) {
                // Nothing satisfactory in the focus history, each modality layer has FocusDeloser,
                // let's try to find something under the same root.
                for (let l of layers) {
                    const e = l.getElement();

                    const ah = getAbilityHelpersOnElement(e);
                    const deloser = ah && ah.focusDeloser;

                    if (deloser && checkDeloser(deloser, resetQueue)) {
                        return true;
                    }
                }
            }

            // Nothing is found, at least try to reset.
            for (let id of Object.keys(resetQueue)) {
                if (resetQueue[id].resetFocus()) {
                    return true;
                }
            }
        }

        return false;

        function checkDeloser(deloser: Types.FocusDeloserContainer, resetQueue: { [id: string]: Types.FocusDeloserContainer }): boolean {
            if (deloser) {
                const available = deloser.findAvailable();

                if (available) {
                    ah.focusedElement.focus(available);

                    return true;
                }

                if (!(deloser.id in resetQueue)) {
                    resetQueue[deloser.id] = deloser;
                }
            }

            return false;
        }
    }
}
