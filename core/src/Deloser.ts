/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { RootAPI } from './Root';
import * as Types from './Types';

const _containerHistoryLength = 10;

let _lastInternalId = 0;

interface DeloserHistoryItem {
    rootId: string;
    history: Types.Deloser[];
}

function _setInformativeStyle(element: HTMLElement, remove: boolean, isActive?: boolean, snapshotIndex?: number): void {
    if (__DEV__) {
        if (remove) {
            element.style.removeProperty('--ah-deloser');
        } else {
            element.style.setProperty(
                '--ah-deloser',
                (isActive ? 'active' : 'inactive') + ',' + ('snapshot-' + snapshotIndex)
            );
        }
    }
}

export class Deloser implements Types.Deloser {
    readonly id: string;

    private _ah: Types.AbilityHelpers;
    private _basic: Types.DeloserBasicProps;
    private _extended: Types.DeloserExtendedProps;
    private _isActive = false;
    private _history: HTMLElement[][] = [[]];
    private _snapshotIndex = 0;
    private _element: HTMLElement;

    constructor(element: HTMLElement, ah: Types.AbilityHelpers, basic?: Types.DeloserBasicProps, extended?: Types.DeloserExtendedProps) {
        this._ah = ah;

        this.id = 'fd' + ++_lastInternalId;
        this._element = element;
        this._basic = basic || {};
        this._extended = extended || {};

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this._isActive, this._snapshotIndex);
        }
    }

    setProps(basic?: Partial<Types.DeloserBasicProps> | null, extended?: Partial<Types.DeloserExtendedProps> | null): void {
        if (basic) {
            this._basic = { ...this._basic, ...basic };
        } else if (basic === null) {
            this._basic = {};
        }

        if (extended) {
            this._extended = { ...this._extended, ...extended };
        } else if (extended === null) {
            this._extended = {};
        }
    }

    move(newContainer: HTMLElement): void {
        this._remove();
        this._element = newContainer;

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this._isActive, this._snapshotIndex);
        }
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

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this._isActive, this._snapshotIndex);
        }
    }

    getActions(): Types.DeloserElementActions {
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

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this._isActive, this._snapshotIndex);
        }
    }

    focusFirst = (): boolean => {
        return this._ah.focusedElement.focusFirst(this._element);
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
        return this._ah.focusedElement.focusDefault(this._element);
    }

    resetFocus = (): boolean => {
        return this._ah.focusedElement.resetFocus(this._element);
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

    customFocusLostHandler(element: HTMLElement): boolean {
        if (this._extended.onFocusLost) {
            return this._extended.onFocusLost(element, this.getActions());
        }

        return false;
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, true);
        }
    }
}

export class DeloserAPI implements Types.DeloserAPI {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _initTimer: number | undefined;
    private _isInSomeDeloser = false;
    private _curDeloser: Types.Deloser | undefined;
    private _history: DeloserHistoryItem[] = [];
    private _restoreFocusTimer: number | undefined;
    private _isPaused = false;

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

        this._ah.focusedElement.unsubscribe(this._onElementFocused);
    }

    getActions(element: HTMLElement): Types.DeloserElementActions | undefined {
        for (let e: (HTMLElement | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.deloser) {
                return ah.deloser.getActions();
            }
        }

        return undefined;
    }

    add(element: HTMLElement, basic?: Types.DeloserBasicProps, extended?: Types.DeloserExtendedProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.deloser) {
            return;
        }

        setAbilityHelpersOnElement(element, {
            deloser: new Deloser(element, this._ah, basic, extended)
        });
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (!ah) {
            return;
        }

        const deloser = ah.deloser;

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
            deloser: undefined
        });
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);

        if (ahFrom && ahFrom.deloser) {
            ahFrom.deloser.move(to);

            setAbilityHelpersOnElement(to, {
                deloser: ahFrom.deloser
            });

            setAbilityHelpersOnElement(from, {
                deloser: undefined
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

    setProps(element: HTMLElement, basic?: Partial<Types.DeloserBasicProps>, extended?: Partial<Types.DeloserExtendedProps>): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.deloser) {
            ah.deloser.setProps(basic, extended);
        }
    }

    private _getDeloser(element: HTMLElement): Types.Deloser | undefined {
        for (let e: (HTMLElement | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.deloser) {
                return ah.deloser;
            }
        }

        return undefined;
    }

    private _onElementFocused = (e: HTMLElement | undefined): void => {
        if (this._restoreFocusTimer) {
            this._mainWindow.clearTimeout(this._restoreFocusTimer);
            this._restoreFocusTimer = undefined;
        }

        if (!e) {
            this._scheduleRestoreFocus();

            return;
        }

        const deloser = this._getDeloser(e);

        if (deloser) {
            this._isInSomeDeloser = true;

            const rootId = RootAPI.getRootId(e);

            if (deloser !== this._curDeloser) {
                if (this._curDeloser) {
                    this._curDeloser.setActive(false);
                }

                this._curDeloser = deloser;

                deloser.setActive(true);
            }

            let historyItem: DeloserHistoryItem | undefined;
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

            const ml = RootAPI.findRootAndModalizer(e);

            if (!ml || !ml.modalizer || (ml.root.getCurrentModalizerId() === ml.modalizer.userId)) {
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
        const last = this._ah.focusedElement.getLastFocusedElement();

        return !!(last && last.offsetParent);
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
                const last = this._ah.focusedElement.getLastFocusedElement();

                if (last && this._curDeloser.customFocusLostHandler(last)) {
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
            const resetQueue: { [id: string]: Types.Deloser } = {};

            for (let j = 0; j < hi.history.length; j++) {
                if (checkDeloser(hi.history[j], resetQueue)) {
                    return true;
                }
            }

            const root = RootAPI.getRootById(hi.rootId);
            const modalizers = root && root.getModalizers();

            if (modalizers) {
                // Nothing satisfactory in the focus history, each Modalizer has Deloser,
                // let's try to find something under the same root.
                for (let m of modalizers) {
                    const e = m.getElement();

                    const ah = getAbilityHelpersOnElement(e);
                    const deloser = ah && ah.deloser;

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

        function checkDeloser(deloser: Types.Deloser, resetQueue: { [id: string]: Types.Deloser }): boolean {
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
