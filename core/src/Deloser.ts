/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { RootAPI } from './Root';
import * as Types from './Types';
import { documentContains, getElementUId, WeakHTMLElement } from './Utils';

const _containerHistoryLength = 10;

export abstract class DeloserItemBase<C> {
    abstract resetFocus(): Promise<boolean>;
    abstract belongsTo(deloser: C): boolean;
}

export class DeloserItem extends DeloserItemBase<Types.Deloser> {
    readonly uid: string;
    private _ah: Types.AbilityHelpers;
    private _deloser: Types.Deloser;

    constructor(ah: Types.AbilityHelpers, deloser: Types.Deloser) {
        super();
        this.uid = deloser.uid;
        this._ah = ah;
        this._deloser = deloser;
    }

    belongsTo(deloser: Types.Deloser): boolean {
        return deloser === this._deloser;
    }

    unshift(element: HTMLElement): void {
        this._deloser.unshift(element);
    }

    async focusAvailable(): Promise<boolean> {
        const available = this._deloser.findAvailable();
        return available ? this._ah.focusedElement.focus(available) : false;
    }

    async resetFocus(): Promise<boolean> {
        return Promise.resolve(this._deloser.resetFocus());
    }
}

export abstract class DeloserHistoryByRootBase<I, D extends DeloserItemBase<I>> {
    protected _ah: Types.AbilityHelpers;
    protected _history: D[] = [];
    readonly rootUId: string;

    constructor(ah: Types.AbilityHelpers, rootUId: string) {
        this._ah = ah;
        this.rootUId = rootUId;
    }

    getLength(): number {
        return this._history.length;
    }

    removeDeloser(deloser: I): void {
        this._history = this._history.filter(c => !c.belongsTo(deloser));
    }

    hasDeloser(deloser: I): boolean {
        return this._history.some(d => d.belongsTo(deloser));
    }

    abstract focusAvailable(from: I | null): Promise<boolean>;
    abstract resetFocus(from: I | null): Promise<boolean>;
}

class DeloserHistoryByRoot extends DeloserHistoryByRootBase<Types.Deloser, DeloserItem> {
    unshiftToDeloser(deloser: Types.Deloser, element: HTMLElement): void {
        let item: DeloserItem | undefined;

        for (let i = 0; i < this._history.length; i++) {
            if (this._history[i].belongsTo(deloser)) {
                item = this._history[i];
                this._history.splice(i, 1);
                break;
            }
        }

        if (!item) {
            item = new DeloserItem(this._ah, deloser);
        }

        item.unshift(element);

        this._history.unshift(item);

        this._history.splice(_containerHistoryLength, this._history.length - _containerHistoryLength);
    }

    async focusAvailable(from: Types.Deloser | null): Promise<boolean> {
        let skip = !!from;

        for (const i of this._history) {
            if (from && i.belongsTo(from)) {
                skip = false;
            }

            if (!skip && await i.focusAvailable()) {
                return true;
            }
        }

        const root = RootAPI.getRootByUId(this.rootUId);
        const modalizers = root && root.getModalizers();

        if (modalizers) {
            // Nothing satisfactory in the focus history, each Modalizer has Deloser,
            // let's try to find something under the same root.
            for (let m of modalizers) {
                const e = m.getElement();
                const ah = e && getAbilityHelpersOnElement(this._ah, e);
                const deloser = ah && ah.deloser;
                const deloserItem = deloser && new DeloserItem(this._ah, deloser);

                if (deloserItem && await deloserItem.focusAvailable()) {
                    return true;
                }
            }
        }

        return false;
    }

    async resetFocus(from: Types.Deloser | null): Promise<boolean> {
        let skip = !!from;
        const resetQueue: { [id: string]: DeloserItem } = {};

        for (const i of this._history) {
            if (from && i.belongsTo(from)) {
                skip = false;
            }

            if (!skip && !resetQueue[i.uid]) {
                resetQueue[i.uid] = i;
            }
        }

        const root = RootAPI.getRootByUId(this.rootUId);
        const modalizers = root && root.getModalizers();

        if (modalizers) {
            // Nothing satisfactory in the focus history, each Modalizer has Deloser,
            // let's try to find something under the same root.
            for (let m of modalizers) {
                const e = m.getElement();
                const ah = e && getAbilityHelpersOnElement(this._ah, e);
                const deloser = ah && ah.deloser;

                if (deloser && !(deloser.uid in resetQueue)) {
                    resetQueue[deloser.uid] = new DeloserItem(this._ah, deloser);
                }
            }
        }

        // Nothing is found, at least try to reset.
        for (let id of Object.keys(resetQueue)) {
            if (await resetQueue[id].resetFocus()) {
                return true;
            }
        }

        return false;
    }
}

export class DeloserHistory {
    private _ah: Types.AbilityHelpers;
    private _history: DeloserHistoryByRootBase<{}, DeloserItemBase<{}>>[] = [];

    constructor(ah: Types.AbilityHelpers) {
        this._ah = ah;
    }

    process(element: HTMLElement): Types.Deloser | undefined {
        const ml = RootAPI.findRootAndModalizer(this._ah, element);
        const rootUId = ml && ml.root.uid;
        const deloser = DeloserAPI.getDeloser(this._ah, element);

        if (!rootUId || !deloser) {
            return undefined;
        }

        const historyByRoot = this.make(rootUId, () => new DeloserHistoryByRoot(this._ah, rootUId));

        if (!ml || !ml.modalizer || (ml.root.getCurrentModalizerId() === ml.modalizer.userId)) {
            historyByRoot.unshiftToDeloser(deloser, element);
        }

        return deloser;
    }

    make<I, D extends DeloserItemBase<I>, C extends DeloserHistoryByRootBase<I, D>>(
        rootUId: string,
        createInstance: () => C
    ): C {
        let historyByRoot: C | undefined;

        for (let i = 0; i < this._history.length; i++) {
            const hbr = this._history[i] as C;

            if (hbr.rootUId === rootUId) {
                historyByRoot = hbr;
                this._history.splice(i, 1);
                break;
            }
        }

        if (!historyByRoot) {
            historyByRoot = createInstance();
        }

        this._history.unshift(historyByRoot);

        this._history.splice(_containerHistoryLength, this._history.length - _containerHistoryLength);

        return historyByRoot;
    }

    removeDeloser(deloser: Types.Deloser): void {
        this._history.forEach(i => {
            i.removeDeloser(deloser);
        });

        this._history = this._history.filter(i => i.getLength() > 0);
    }

    async focusAvailable(from: Types.Deloser | null): Promise<boolean> {
        let skip = !!from;

        for (const h of this._history) {
            if (from && h.hasDeloser(from)) {
                skip = false;
            }

            if (!skip && await h.focusAvailable(from)) {
                return true;
            }
        }

        return false;
    }

    async resetFocus(from: Types.Deloser | null): Promise<boolean> {
        let skip = !!from;

        for (const h of this._history) {
            if (from && h.hasDeloser(from)) {
                skip = false;
            }

            if (!skip && await h.resetFocus(from)) {
                return true;
            }
        }

        return false;
    }
}

function _setInformativeStyle(weakElement: WeakHTMLElement, remove: boolean, isActive?: boolean, snapshotIndex?: number): void {
    if (__DEV__) {
        const element = weakElement.get();

        if (element) {
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
}

function buildElementSelector(element: HTMLElement, withClass?: boolean, withIndex?: boolean): string {
    const selector: string[] = [];

    if (element.id) {
        selector.push('#' + element.id);
    }

    if ((withClass !== false) && element.className) {
        element.className.split(' ').forEach(cls => {
            cls = cls.trim();

            if (cls) {
                selector.push('.' + cls);
            }
        });
    }

    let index = 0;
    let el: Element | null;

    if ((withIndex !== false) && (selector.length === 0)) {
        el = element;
        while (el) {
            index++;
            el = el.previousElementSibling;
        }
        selector.unshift(':nth-child(' + index + ')');
    }

    selector.unshift(element.tagName.toLowerCase());

    return selector.join('');
}

function buildSelector(element: HTMLElement): string | undefined {
    if (!documentContains(element.ownerDocument, element)) {
        return undefined;
    }

    const selector: string[] = [buildElementSelector(element)];

    let el = element.parentElement;

    while (el) {
        const isBody = el.tagName === 'BODY';
        selector.unshift(buildElementSelector(el, false, !isBody));

        if (isBody) {
            break;
        }

        el = el.parentElement;
    }

    return selector.join(' ');
}

export class Deloser implements Types.Deloser {
    readonly uid: string;
    private _ah: Types.AbilityHelpers;
    private _basic: Types.DeloserBasicProps;
    private _extended: Types.DeloserExtendedProps;
    private _isActive = false;
    private _history: WeakHTMLElement<HTMLElement, string>[][] = [[]];
    private _snapshotIndex = 0;
    private _element: WeakHTMLElement;

    constructor(
        element: HTMLElement,
        ah: Types.AbilityHelpers,
        getWindow: Types.GetWindow,
        basic?: Types.DeloserBasicProps,
        extended?: Types.DeloserExtendedProps
    ) {
        this.uid = getElementUId(element, getWindow());
        this._ah = ah;
        this._element = new WeakHTMLElement(element);
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

    getBasicProps(): Types.RootBasicProps {
        return this._basic;
    }

    move(newContainer: HTMLElement): void {
        this._remove();
        this._element = new WeakHTMLElement(newContainer);

        if (__DEV__) {
            _setInformativeStyle(this._element, false, this._isActive, this._snapshotIndex);
        }
    }

    dispose(): void {
        this._remove();

        this._isActive = false;
        this._snapshotIndex = 0;

        this._basic = {};
        this._extended = {};
        this._history = [];
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
        const e = this._element.get();
        return !!e && this._ah.focusedElement.focusFirst(e);
    }

    unshift(element: HTMLElement): void {
        let cur = this._history[this._snapshotIndex];

        cur = this._history[this._snapshotIndex] = cur.filter(we => {
            const e = we.get();
            return e && (e !== element);
        });

        cur.unshift(new WeakHTMLElement(element, buildSelector(element)));

        while (cur.length > _containerHistoryLength) {
            cur.pop();
        }
    }

    focusDefault = (): boolean => {
        const e = this._element.get();
        return !!e && this._ah.focusedElement.focusDefault(e);
    }

    resetFocus = (): boolean => {
        const e = this._element.get();
        return !!e && this._ah.focusedElement.resetFocus(e);
    }

    findAvailable(): HTMLElement | null {
        const element = this._element.get();

        if (!element || !this._ah.focusable.isVisible(element)) {
            return null;
        }

        let restoreFocusOrder = this._basic.restoreFocusOrder;
        let available: HTMLElement | null = null;

        const rootAndModalizer = RootAPI.findRootAndModalizer(this._ah, element);

        if (!rootAndModalizer) {
            return null;
        }

        const root = rootAndModalizer.root;
        const rootElement = root.getElement();

        if (!rootElement) {
            return null;
        }

        if (restoreFocusOrder === undefined) {
            restoreFocusOrder = root.getBasicProps().restoreFocusOrder;
        }

        if (restoreFocusOrder === Types.RestoreFocusOrder.RootDefault) {
            available = this._ah.focusable.findDefault(rootElement);
        }

        if (!available && (restoreFocusOrder === Types.RestoreFocusOrder.RootFirst)) {
            available = this._findFirst(rootElement);
        }

        if (available) {
            return available;
        }

        const availableInHistory = this._findInHistory();
        const availableDefault = this._ah.focusable.findDefault(element);
        const availableFirst = this._findFirst(element);

        if (availableInHistory && (restoreFocusOrder === Types.RestoreFocusOrder.History)) {
            return availableInHistory;
        }

        if (availableDefault && (restoreFocusOrder === Types.RestoreFocusOrder.DeloserDefault)) {
            return availableDefault;
        }

        if (availableFirst && (restoreFocusOrder === Types.RestoreFocusOrder.DeloserFirst)) {
            return availableFirst;
        }

        return availableDefault || availableInHistory || availableFirst || null;
    }

    clearHistory = (preserveExisting?: boolean): void => {
        const element = this._element.get();

        if (!element) {
            this._history[this._snapshotIndex] = [];

            return;
        }

        this._history[this._snapshotIndex] =
            this._history[this._snapshotIndex].filter(we => {
                const e = we.get();
                return (e && preserveExisting) ? element.contains(e) : false;
            });
    }

    customFocusLostHandler(element: HTMLElement): boolean {
        if (this._extended.onFocusLost) {
            return this._extended.onFocusLost(element, this.getActions());
        }

        return false;
    }

    getElement(): HTMLElement | undefined {
        return this._element.get();
    }

    private _findInHistory(): HTMLElement | null {
        const cur = this._history[this._snapshotIndex].slice(0);

        this.clearHistory(true);

        for (let i = 0; i < cur.length; i++) {
            const we = cur[i];
            const e = we.get();
            const element = this._element.get();

            if (e && element && element.contains(e)) {
                if (this._ah.focusable.isFocusable(e)) {
                    return e;
                }
            } else if (!this._basic.noSelectorCheck) {
                // Element is not in the DOM, try to locate the node by it's
                // selector. This might return not exactly the right node,
                // but it would be easily fixable by having more detailed selectors.
                const selector = we.getData();

                if (selector && element) {
                    const els = element.ownerDocument.querySelectorAll(selector);

                    for (let i = 0; i < els.length; i++) {
                        const el = els[i] as HTMLElement;

                        if (el && this._ah.focusable.isFocusable(el)) {
                            return el;
                        }
                    }
                }
            }
        }

        return null;
    }

    private _findFirst(element: HTMLElement): HTMLElement | null {
        if (this._ah.keyboardNavigation.isNavigatingWithKeyboard()) {
            const first = this._ah.focusable.findFirst(element);

            if (first) {
                return first;
            }
        }

        return null;
    }

    private _remove(): void {
        if (__DEV__) {
            _setInformativeStyle(this._element, true);
        }
    }
}

export class DeloserAPI implements Types.DeloserAPI {
    private _ah: Types.AbilityHelpers;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _isInSomeDeloser = false;
    private _curDeloser: Types.Deloser | undefined;
    private _history: DeloserHistory;
    private _restoreFocusTimer: number | undefined;
    private _isRestoringFocus = false;
    private _isPaused = false;

    constructor(ah: Types.AbilityHelpers, getWindow: Types.GetWindow) {
        this._ah = ah;
        this._win = getWindow;
        this._history = new DeloserHistory(ah);
        this._initTimer = getWindow().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._ah.focusedElement.subscribe(this._onFocus);
    }

    protected dispose(): void {
        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._restoreFocusTimer) {
            win.clearTimeout(this._restoreFocusTimer);
            this._restoreFocusTimer = undefined;
        }

        this._ah.focusedElement.unsubscribe(this._onFocus);

        delete this._curDeloser;
    }

    static dispose(instance: Types.DeloserAPI): void {
        (instance as DeloserAPI).dispose();
    }

    getActions(element: HTMLElement): Types.DeloserElementActions | undefined {
        for (let e: (HTMLElement | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(this._ah, e);

            if (ah && ah.deloser) {
                return ah.deloser.getActions();
            }
        }

        return undefined;
    }

    add(element: HTMLElement, basic?: Types.DeloserBasicProps, extended?: Types.DeloserExtendedProps): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);

        if (ah && ah.deloser) {
            return;
        }

        setAbilityHelpersOnElement(this._ah, element, {
            deloser: new Deloser(element, this._ah, this._win, basic, extended)
        });
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);

        if (!ah) {
            return;
        }

        const deloser = ah.deloser;

        if (!deloser) {
            return;
        }

        this._history.removeDeloser(deloser);

        if (deloser.isActive()) {
            this._scheduleRestoreFocus();
        }

        deloser.dispose();

        setAbilityHelpersOnElement(this._ah, element, {
            deloser: undefined
        });
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(this._ah, from);

        if (ahFrom && ahFrom.deloser) {
            ahFrom.deloser.move(to);

            setAbilityHelpersOnElement(this._ah, to, {
                deloser: ahFrom.deloser
            });

            setAbilityHelpersOnElement(this._ah, from, {
                deloser: undefined
            });
        }
    }

    pause(): void {
        this._isPaused = true;

        if (this._restoreFocusTimer) {
            this._win().clearTimeout(this._restoreFocusTimer);
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
        const ah = getAbilityHelpersOnElement(this._ah, element);

        if (ah && ah.deloser) {
            ah.deloser.setProps(basic, extended);
        }
    }

    private _onFocus = (e: HTMLElement | undefined): void => {
        if (this._restoreFocusTimer) {
            this._win().clearTimeout(this._restoreFocusTimer);
            this._restoreFocusTimer = undefined;
        }

        if (!e) {
            this._scheduleRestoreFocus();

            return;
        }

        const deloser = this._history.process(e);

        if (deloser) {
            this._isInSomeDeloser = true;

            if (deloser !== this._curDeloser) {
                if (this._curDeloser) {
                    this._curDeloser.setActive(false);
                }

                this._curDeloser = deloser;
            }

            deloser.setActive(true);
        } else {
            this._isInSomeDeloser = false;

            this._curDeloser = undefined;
        }
    }

    private _isLastFocusedAvailable(): boolean {
        const last = this._ah.focusedElement.getLastFocusedElement();

        return !!(last && last.offsetParent);
    }

    private _scheduleRestoreFocus(force?: boolean): void {
        if (this._isPaused || this._isRestoringFocus) {
            return;
        }

        const reallySchedule = async () => {
            this._restoreFocusTimer = undefined;

            if (!force && (this._isRestoringFocus || !this._isInSomeDeloser || this._isLastFocusedAvailable())) {
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

            this._isInSomeDeloser = false;

            if (this._curDeloser) {
                this._curDeloser.setActive(false);
                this._curDeloser = undefined;
            }

            this._isRestoringFocus = true;

            if (!(await this._history.focusAvailable(null))) {
                await this._history.resetFocus(null);
            }

            this._isRestoringFocus = false;
        };

        if (force) {
            reallySchedule();
        } else {
            this._restoreFocusTimer = this._win().setTimeout(reallySchedule, 100);
        }
    }

    static getDeloser(abilityHelpers: Types.AbilityHelpers, element: HTMLElement): Types.Deloser | undefined {
        for (let e: (HTMLElement | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(abilityHelpers, e);

            if (ah && ah.deloser) {
                return ah.deloser;
            }
        }

        return undefined;
    }

    static getHistory(instance: Types.DeloserAPI): DeloserHistory {
        return (instance as DeloserAPI)._history;
    }

    static forceRestoreFocus(instance: Types.DeloserAPI): void {
        (instance as DeloserAPI)._scheduleRestoreFocus(true);
    }
}
