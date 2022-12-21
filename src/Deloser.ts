/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance";
import { RootAPI } from "./Root";
import * as Types from "./Types";
import {
    documentContains,
    getElementUId,
    getPromise,
    TabsterPart,
    triggerEvent,
    WeakHTMLElement,
} from "./Utils";

const _containerHistoryLength = 10;

export abstract class DeloserItemBase<C> {
    abstract resetFocus(): Promise<boolean>;
    abstract belongsTo(deloser: C): boolean;
}

export class DeloserItem extends DeloserItemBase<Types.Deloser> {
    readonly uid: string;
    private _tabster: Types.TabsterCore;
    private _deloser: Types.Deloser;

    constructor(tabster: Types.TabsterCore, deloser: Types.Deloser) {
        super();
        this.uid = deloser.uid;
        this._tabster = tabster;
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
        return available
            ? this._tabster.focusedElement.focus(available)
            : false;
    }

    async resetFocus(): Promise<boolean> {
        const getWindow = this._tabster.getWindow;
        return getPromise(getWindow).resolve(this._deloser.resetFocus());
    }
}

export abstract class DeloserHistoryByRootBase<
    I,
    D extends DeloserItemBase<I>
> {
    protected _tabster: Types.TabsterCore;
    protected _history: D[] = [];
    readonly rootUId: string;

    constructor(tabster: Types.TabsterCore, rootUId: string) {
        this._tabster = tabster;
        this.rootUId = rootUId;
    }

    getLength(): number {
        return this._history.length;
    }

    removeDeloser(deloser: I): void {
        this._history = this._history.filter((c) => !c.belongsTo(deloser));
    }

    hasDeloser(deloser: I): boolean {
        return this._history.some((d) => d.belongsTo(deloser));
    }

    abstract focusAvailable(from: I | null): Promise<boolean>;
    abstract resetFocus(from: I | null): Promise<boolean>;
}

class DeloserHistoryByRoot extends DeloserHistoryByRootBase<
    Types.Deloser,
    DeloserItem
> {
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
            item = new DeloserItem(this._tabster, deloser);
        }

        item.unshift(element);

        this._history.unshift(item);

        this._history.splice(
            _containerHistoryLength,
            this._history.length - _containerHistoryLength
        );
    }

    async focusAvailable(from: Types.Deloser | null): Promise<boolean> {
        let skip = !!from;

        for (const i of this._history) {
            if (from && i.belongsTo(from)) {
                skip = false;
            }

            if (!skip && (await i.focusAvailable())) {
                return true;
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

        // Nothing is found, at least try to reset.
        for (const id of Object.keys(resetQueue)) {
            if (await resetQueue[id].resetFocus()) {
                return true;
            }
        }

        return false;
    }
}

export class DeloserHistory {
    private _tabster: Types.TabsterCore;
    // eslint-disable-next-line @typescript-eslint/ban-types
    private _history: DeloserHistoryByRootBase<
        unknown,
        DeloserItemBase<unknown>
    >[] = [];

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
    }

    dispose(): void {
        this._history = [];
    }

    process(element: HTMLElement): Types.Deloser | undefined {
        const ctx = RootAPI.getTabsterContext(this._tabster, element);
        const rootUId = ctx && ctx.root.uid;
        const deloser = DeloserAPI.getDeloser(this._tabster, element);

        if (!rootUId || !deloser) {
            return undefined;
        }

        const historyByRoot = this.make(
            rootUId,
            () => new DeloserHistoryByRoot(this._tabster, rootUId)
        );

        if (!ctx || !ctx.modalizer || ctx.modalizer?.isActive()) {
            historyByRoot.unshiftToDeloser(deloser, element);
        }

        return deloser;
    }

    make<
        I,
        D extends DeloserItemBase<I>,
        C extends DeloserHistoryByRootBase<I, D>
    >(rootUId: string, createInstance: () => C): C {
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

        this._history.splice(
            _containerHistoryLength,
            this._history.length - _containerHistoryLength
        );

        return historyByRoot;
    }

    removeDeloser(deloser: Types.Deloser): void {
        this._history.forEach((i) => {
            i.removeDeloser(deloser);
        });

        this._history = this._history.filter((i) => i.getLength() > 0);
    }

    async focusAvailable(from: Types.Deloser | null): Promise<boolean> {
        let skip = !!from;

        for (const h of this._history) {
            if (from && h.hasDeloser(from)) {
                skip = false;
            }

            if (!skip && (await h.focusAvailable(from))) {
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

            if (!skip && (await h.resetFocus(from))) {
                return true;
            }
        }

        return false;
    }
}

function _setInformativeStyle(
    weakElement: WeakHTMLElement,
    remove: boolean,
    isActive?: boolean,
    snapshotIndex?: number
): void {
    if (__DEV__) {
        const element = weakElement.get();

        if (element) {
            if (remove) {
                element.style.removeProperty("--tabster-deloser");
            } else {
                element.style.setProperty(
                    "--tabster-deloser",
                    (isActive ? "active" : "inactive") +
                        "," +
                        ("snapshot-" + snapshotIndex)
                );
            }
        }
    }
}

function buildElementSelector(
    element: HTMLElement,
    withClass?: boolean,
    withIndex?: boolean
): string {
    const selector: string[] = [];
    const escapeRegExp = /(:|\.|\[|\]|,|=|@)/g;
    const escapeReplaceValue = "\\$1";

    if (element.id) {
        selector.push(
            "#" + element.id.replace(escapeRegExp, escapeReplaceValue)
        );
    }

    if (withClass !== false && element.className) {
        element.className.split(" ").forEach((cls) => {
            cls = cls.trim();

            if (cls) {
                selector.push(
                    "." + cls.replace(escapeRegExp, escapeReplaceValue)
                );
            }
        });
    }

    let index = 0;
    let el: Element | null;

    if (withIndex !== false && selector.length === 0) {
        el = element;
        while (el) {
            index++;
            el = el.previousElementSibling;
        }
        selector.unshift(":nth-child(" + index + ")");
    }

    selector.unshift(element.tagName.toLowerCase());

    return selector.join("");
}

function buildSelector(element: HTMLElement): string | undefined {
    if (!documentContains(element.ownerDocument, element)) {
        return undefined;
    }

    const selector: string[] = [buildElementSelector(element)];

    let el = element.parentElement;

    while (el) {
        const isBody = el.tagName === "BODY";
        selector.unshift(buildElementSelector(el, false, !isBody));

        if (isBody) {
            break;
        }

        el = el.parentElement;
    }

    return selector.join(" ");
}

export class Deloser
    extends TabsterPart<Types.DeloserProps>
    implements Types.Deloser
{
    readonly uid: string;
    private _isActive = false;
    private _history: WeakHTMLElement<HTMLElement, string>[][] = [[]];
    private _snapshotIndex = 0;
    private _onDispose: (deloser: Deloser) => void;

    constructor(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        onDispose: (deloser: Deloser) => void,
        props: Types.DeloserProps
    ) {
        super(tabster, element, props);

        this.uid = getElementUId(tabster.getWindow, element);
        this._onDispose = onDispose;

        if (__DEV__) {
            _setInformativeStyle(
                this._element,
                false,
                this._isActive,
                this._snapshotIndex
            );
        }
    }

    dispose(): void {
        this._remove();

        this._onDispose(this);

        this._isActive = false;
        this._snapshotIndex = 0;

        this._props = {};
        this._history = [];
    }

    isActive = (): boolean => {
        return this._isActive;
    };

    setActive(active: boolean): void {
        this._isActive = active;

        if (__DEV__) {
            _setInformativeStyle(
                this._element,
                false,
                this._isActive,
                this._snapshotIndex
            );
        }
    }

    getActions(): Types.DeloserElementActions {
        return {
            focusDefault: this.focusDefault,
            focusFirst: this.focusFirst,
            resetFocus: this.resetFocus,
            clearHistory: this.clearHistory,
            setSnapshot: this.setSnapshot,
            isActive: this.isActive,
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
            _setInformativeStyle(
                this._element,
                false,
                this._isActive,
                this._snapshotIndex
            );
        }
    };

    focusFirst = (): boolean => {
        const e = this._element.get();
        return !!e && this._tabster.focusedElement.focusFirst({ container: e });
    };

    unshift(element: HTMLElement): void {
        let cur = this._history[this._snapshotIndex];

        cur = this._history[this._snapshotIndex] = cur.filter((we) => {
            const e = we.get();
            return e && e !== element;
        });

        cur.unshift(
            new WeakHTMLElement(
                this._tabster.getWindow,
                element,
                buildSelector(element)
            )
        );

        while (cur.length > _containerHistoryLength) {
            cur.pop();
        }
    }

    focusDefault = (): boolean => {
        const e = this._element.get();
        return !!e && this._tabster.focusedElement.focusDefault(e);
    };

    resetFocus = (): boolean => {
        const e = this._element.get();
        return !!e && this._tabster.focusedElement.resetFocus(e);
    };

    findAvailable(): HTMLElement | null {
        const element = this._element.get();

        if (!element || !this._tabster.focusable.isVisible(element)) {
            return null;
        }

        let restoreFocusOrder = this._props.restoreFocusOrder;
        let available: HTMLElement | null = null;

        const ctx = RootAPI.getTabsterContext(this._tabster, element);

        if (!ctx) {
            return null;
        }

        const root = ctx.root;
        const rootElement = root.getElement();

        if (!rootElement) {
            return null;
        }

        if (restoreFocusOrder === undefined) {
            restoreFocusOrder = root.getProps().restoreFocusOrder;
        }

        if (restoreFocusOrder === Types.RestoreFocusOrders.RootDefault) {
            available = this._tabster.focusable.findDefault({
                container: rootElement,
            });
        }

        if (
            !available &&
            restoreFocusOrder === Types.RestoreFocusOrders.RootFirst
        ) {
            available = this._findFirst(rootElement);
        }

        if (available) {
            return available;
        }

        const availableInHistory = this._findInHistory();
        const availableDefault = this._tabster.focusable.findDefault({
            container: element,
        });
        const availableFirst = this._findFirst(element);

        if (
            availableInHistory &&
            restoreFocusOrder === Types.RestoreFocusOrders.History
        ) {
            return availableInHistory;
        }

        if (
            availableDefault &&
            restoreFocusOrder === Types.RestoreFocusOrders.DeloserDefault
        ) {
            return availableDefault;
        }

        if (
            availableFirst &&
            restoreFocusOrder === Types.RestoreFocusOrders.DeloserFirst
        ) {
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

        this._history[this._snapshotIndex] = this._history[
            this._snapshotIndex
        ].filter((we) => {
            const e = we.get();
            return e && preserveExisting ? element.contains(e) : false;
        });
    };

    customFocusLostHandler(element: HTMLElement): boolean {
        return triggerEvent(element, Types.DeloserEventName, this.getActions());
    }

    private _findInHistory(): HTMLElement | null {
        const cur = this._history[this._snapshotIndex].slice(0);

        this.clearHistory(true);

        for (let i = 0; i < cur.length; i++) {
            const we = cur[i];
            const e = we.get();
            const element = this._element.get();

            if (e && element && element.contains(e)) {
                if (this._tabster.focusable.isFocusable(e)) {
                    return e;
                }
            } else if (!this._props.noSelectorCheck) {
                // Element is not in the DOM, try to locate the node by it's
                // selector. This might return not exactly the right node,
                // but it would be easily fixable by having more detailed selectors.
                const selector = we.getData();

                if (selector && element) {
                    let els: NodeListOf<Element>;

                    try {
                        els = element.ownerDocument.querySelectorAll(selector);
                    } catch (e) {
                        if (__DEV__) {
                            // This should never happen, unless there is some bug in buildElementSelector().
                            console.error(
                                `Failed to querySelectorAll('${selector}')`
                            );
                        }
                        continue;
                    }

                    for (let i = 0; i < els.length; i++) {
                        const el = els[i] as HTMLElement;

                        if (el && this._tabster.focusable.isFocusable(el)) {
                            return el;
                        }
                    }
                }
            }
        }

        return null;
    }

    private _findFirst(element: HTMLElement): HTMLElement | null {
        if (this._tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
            const first = this._tabster.focusable.findFirst({
                container: element,
            });

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateDeloserProps(props: Types.DeloserProps): void {
    // TODO: Implement validation.
}

export class DeloserAPI implements Types.DeloserAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    /**
     * Tracks if focus is inside a deloser
     */
    private _inDeloser = false;
    private _curDeloser: Types.Deloser | undefined;
    private _history: DeloserHistory;
    private _restoreFocusTimer: number | undefined;
    private _isRestoringFocus = false;
    private _isPaused = false;
    private _autoDeloser: Types.DeloserProps | undefined;
    private _autoDeloserInstance: Deloser | undefined;

    constructor(
        tabster: Types.TabsterCore,
        props?: { autoDeloser: Types.DeloserProps }
    ) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._history = new DeloserHistory(tabster);
        this._initTimer = this._win().setTimeout(this._init, 0);

        const autoDeloser = props?.autoDeloser;
        if (autoDeloser) {
            this._autoDeloser = autoDeloser;
        }
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

        if (this._restoreFocusTimer) {
            win.clearTimeout(this._restoreFocusTimer);
            this._restoreFocusTimer = undefined;
        }

        if (this._autoDeloserInstance) {
            this._autoDeloserInstance.dispose();
            delete this._autoDeloserInstance;
            delete this._autoDeloser;
        }

        this._tabster.focusedElement.unsubscribe(this._onFocus);

        this._history.dispose();

        delete this._curDeloser;
    }

    createDeloser(
        element: HTMLElement,
        props: Types.DeloserProps
    ): Types.Deloser {
        if (__DEV__) {
            validateDeloserProps(props);
        }

        const deloser = new Deloser(
            this._tabster,
            element,
            this._onDeloserDispose,
            props
        );

        if (
            element.contains(
                this._tabster.focusedElement.getFocusedElement() ?? null
            )
        ) {
            this._activate(deloser);
        }

        return deloser;
    }

    getActions(element: HTMLElement): Types.DeloserElementActions | undefined {
        for (let e: HTMLElement | null = element; e; e = e.parentElement) {
            const tabsterOnElement = getTabsterOnElement(this._tabster, e);

            if (tabsterOnElement && tabsterOnElement.deloser) {
                return tabsterOnElement.deloser.getActions();
            }
        }

        return undefined;
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
            this._activate(deloser);
        } else {
            this._deactivate();
        }
    };

    /**
     * Activates and sets the current deloser
     */
    private _activate(deloser: Types.Deloser) {
        const curDeloser = this._curDeloser;
        if (curDeloser !== deloser) {
            this._inDeloser = true;
            curDeloser?.setActive(false);
            deloser.setActive(true);
            this._curDeloser = deloser;
        }
    }

    /**
     * Called when focus should no longer be in a deloser
     */
    private _deactivate() {
        this._inDeloser = false;
        this._curDeloser?.setActive(false);
        this._curDeloser = undefined;
    }

    private _scheduleRestoreFocus(force?: boolean): void {
        if (this._isPaused || this._isRestoringFocus) {
            return;
        }

        const restoreFocus = async () => {
            this._restoreFocusTimer = undefined;
            const lastFocused =
                this._tabster.focusedElement.getLastFocusedElement();

            if (
                !force &&
                (this._isRestoringFocus ||
                    !this._inDeloser ||
                    !!lastFocused?.offsetParent)
            ) {
                return;
            }

            const curDeloser = this._curDeloser;
            if (curDeloser) {
                if (
                    lastFocused &&
                    curDeloser.customFocusLostHandler(lastFocused)
                ) {
                    return;
                }

                const el = curDeloser.findAvailable();

                if (el && this._tabster.focusedElement.focus(el)) {
                    return;
                }
            }

            this._deactivate();

            this._isRestoringFocus = true;

            if (!(await this._history.focusAvailable(null))) {
                await this._history.resetFocus(null);
            }

            this._isRestoringFocus = false;
        };

        if (force) {
            restoreFocus();
        } else {
            this._restoreFocusTimer = this._win().setTimeout(restoreFocus, 100);
        }
    }

    static getDeloser(
        tabster: Types.TabsterCore,
        element: HTMLElement
    ): Types.Deloser | undefined {
        for (let e: HTMLElement | null = element; e; e = e.parentElement) {
            const tabsterOnElement = getTabsterOnElement(tabster, e);

            if (tabsterOnElement && tabsterOnElement.deloser) {
                return tabsterOnElement.deloser;
            }
        }

        const deloserAPI = tabster.deloser && (tabster.deloser as DeloserAPI);

        if (deloserAPI) {
            if (deloserAPI._autoDeloserInstance) {
                return deloserAPI._autoDeloserInstance;
            }

            const autoDeloserProps = deloserAPI._autoDeloser;

            if (!deloserAPI._autoDeloserInstance && autoDeloserProps) {
                const body = element.ownerDocument?.body;

                if (body) {
                    deloserAPI._autoDeloserInstance = new Deloser(
                        tabster,
                        body,
                        (tabster.deloser as DeloserAPI)._onDeloserDispose,
                        autoDeloserProps
                    );
                }
            }

            return deloserAPI._autoDeloserInstance;
        }

        return undefined;
    }

    private _onDeloserDispose = (deloser: Deloser) => {
        this._history.removeDeloser(deloser);

        if (deloser.isActive()) {
            this._scheduleRestoreFocus();
        }
    };

    static getHistory(instance: Types.DeloserAPI): DeloserHistory {
        return (instance as DeloserAPI)._history;
    }

    static forceRestoreFocus(instance: Types.DeloserAPI): void {
        (instance as DeloserAPI)._scheduleRestoreFocus(true);
    }
}
