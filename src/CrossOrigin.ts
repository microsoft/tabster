/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    DeloserAPI,
    DeloserHistoryByRootBase,
    DeloserItemBase,
} from "./Deloser";
import { getTabsterOnElement } from "./Instance";
import { RootAPI } from "./Root";
import { Subscribable } from "./State/Subscribable";
import * as Types from "./Types";
import { ObservedElementAccessibilities } from "./Consts";
import {
    getElementUId,
    getInstanceContext,
    getPromise,
    getUId,
    getWindowUId,
    HTMLElementWithUID,
} from "./Utils";
import { dom } from "./DOMAPI";

const _transactionTimeout = 1500;
const _pingTimeout = 3000;

const _targetIdUp = "up";

const CrossOriginTransactionTypes: Types.CrossOriginTransactionTypes = {
    Bootstrap: 1,
    FocusElement: 2,
    State: 3,
    GetElement: 4,
    RestoreFocusInDeloser: 5,
    Ping: 6,
};

interface CrossOriginInstanceContext {
    ignoreKeyboardNavigationStateUpdate: boolean;
    focusOwner?: string;
    focusOwnerTimestamp?: number;
    deloserByUId: { [uid: string]: Types.Deloser };
    origOutlineSetup?: (props?: Partial<Types.OutlineProps>) => void;
}

interface KnownTargets {
    [id: string]: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        send: (payload: Types.CrossOriginTransactionData<any, any>) => void;
        last?: number;
    };
}

class CrossOriginDeloserItem extends DeloserItemBase<CrossOriginDeloser> {
    private _deloser: CrossOriginDeloser;
    private _transactions: CrossOriginTransactions;

    constructor(
        tabster: Types.TabsterCore,
        deloser: CrossOriginDeloser,
        trasactions: CrossOriginTransactions
    ) {
        super();
        this._deloser = deloser;
        this._transactions = trasactions;
    }

    belongsTo(deloser: CrossOriginDeloser): boolean {
        return deloser.deloserUId === this._deloser.deloserUId;
    }

    async focusAvailable(): Promise<boolean | null> {
        const data: RestoreFocusInDeloserTransactionData = {
            ...this._deloser,
            reset: false,
        };

        return this._transactions
            .beginTransaction(RestoreFocusInDeloserTransaction, data)
            .then((value) => !!value);
    }

    async resetFocus(): Promise<boolean> {
        const data: RestoreFocusInDeloserTransactionData = {
            ...this._deloser,
            reset: true,
        };

        return this._transactions
            .beginTransaction(RestoreFocusInDeloserTransaction, data)
            .then((value) => !!value);
    }
}

class CrossOriginDeloserHistoryByRoot extends DeloserHistoryByRootBase<
    CrossOriginDeloser,
    CrossOriginDeloserItem
> {
    private _transactions: CrossOriginTransactions;

    constructor(
        tabster: Types.TabsterCore,
        rootUId: string,
        transactions: CrossOriginTransactions
    ) {
        super(tabster, rootUId);
        this._transactions = transactions;
    }

    unshift(deloser: CrossOriginDeloser): void {
        let item: CrossOriginDeloserItem | undefined;

        for (let i = 0; i < this._history.length; i++) {
            if (this._history[i].belongsTo(deloser)) {
                item = this._history[i];
                this._history.splice(i, 1);
                break;
            }
        }

        if (!item) {
            item = new CrossOriginDeloserItem(
                this._tabster,
                deloser,
                this._transactions
            );
        }

        this._history.unshift(item);

        this._history.splice(10, this._history.length - 10);
    }

    async focusAvailable(): Promise<boolean | null> {
        for (const i of this._history) {
            if (await i.focusAvailable()) {
                return true;
            }
        }

        return false;
    }

    async resetFocus(): Promise<boolean> {
        for (const i of this._history) {
            if (await i.resetFocus()) {
                return true;
            }
        }

        return false;
    }
}

abstract class CrossOriginTransaction<I, O> {
    abstract type: Types.CrossOriginTransactionType;
    readonly id: string;
    readonly beginData: I;
    readonly timeout?: number;
    protected tabster: Types.TabsterCore;
    protected endData: O | undefined;
    protected owner: Types.GetWindow;
    protected ownerId: string;
    protected sendUp: Types.CrossOriginTransactionSend | undefined;
    private _promise: Promise<O>;
    protected _resolve: ((endData?: O | PromiseLike<O>) => void) | undefined;
    private _reject: ((reason: string) => void) | undefined;
    private _knownTargets: KnownTargets;
    private _sentTo: Types.CrossOriginSentTo;
    protected targetId: string | undefined;
    private _inProgress: { [id: string]: boolean } = {};
    private _isDone = false;
    private _isSelfResponding = false;
    private _sentCount = 0;

    constructor(
        tabster: Types.TabsterCore,
        getOwner: Types.GetWindow,
        knownTargets: KnownTargets,
        value: I,
        timeout?: number,
        sentTo?: Types.CrossOriginSentTo,
        targetId?: string,
        sendUp?: Types.CrossOriginTransactionSend
    ) {
        this.tabster = tabster;
        this.owner = getOwner;
        this.ownerId = getWindowUId(getOwner());
        this.id = getUId(getOwner());
        this.beginData = value;
        this._knownTargets = knownTargets;
        this._sentTo = sentTo || { [this.ownerId]: true };
        this.targetId = targetId;
        this.sendUp = sendUp;
        this.timeout = timeout;
        this._promise = new (getPromise(getOwner))<O>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    protected getTargets(knownTargets: KnownTargets): KnownTargets | null {
        return this.targetId === _targetIdUp
            ? this.sendUp
                ? { [_targetIdUp]: { send: this.sendUp } }
                : null
            : this.targetId
              ? knownTargets[this.targetId]
                  ? {
                        [this.targetId]: {
                            send: knownTargets[this.targetId].send,
                        },
                    }
                  : null
              : Object.keys(knownTargets).length === 0 && this.sendUp
                ? { [_targetIdUp]: { send: this.sendUp } }
                : Object.keys(knownTargets).length > 0
                  ? knownTargets
                  : null;
    }

    begin(
        selfResponse?: (
            data: Types.CrossOriginTransactionData<I, O>
        ) => Promise<O | undefined>
    ): Promise<O | undefined> {
        const targets = this.getTargets(this._knownTargets);
        const sentTo: Types.CrossOriginSentTo = { ...this._sentTo };

        if (targets) {
            for (const id of Object.keys(targets)) {
                sentTo[id] = true;
            }
        }

        const data: Types.CrossOriginTransactionData<I, O> = {
            transaction: this.id,
            type: this.type,
            isResponse: false,
            timestamp: Date.now(),
            owner: this.ownerId,
            sentto: sentTo,
            timeout: this.timeout,
            beginData: this.beginData,
        };

        if (this.targetId) {
            data.target = this.targetId;
        }

        if (selfResponse) {
            this._isSelfResponding = true;

            selfResponse(data).then((value) => {
                this._isSelfResponding = false;

                if (value !== undefined) {
                    if (!this.endData) {
                        this.endData = value;
                    }
                }

                if (this.endData || this._sentCount === 0) {
                    this.end();
                }
            });
        }

        if (targets) {
            for (const id of Object.keys(targets)) {
                if (!(id in this._sentTo)) {
                    this._send(targets[id].send, id, data);
                }
            }
        }

        if (this._sentCount === 0 && !this._isSelfResponding) {
            this.end();
        }

        return this._promise;
    }

    private _send(
        send: (data: Types.CrossOriginTransactionData<I, O>) => void,
        targetId: string,
        data: Types.CrossOriginTransactionData<I, O>
    ) {
        if (this._inProgress[targetId] === undefined) {
            this._inProgress[targetId] = true;
            this._sentCount++;
            send(data);
        }
    }

    end(error?: string): void {
        if (this._isDone) {
            return;
        }

        this._isDone = true;

        if (this.endData === undefined && error) {
            if (this._reject) {
                this._reject(error);
            }
        } else if (this._resolve) {
            this._resolve(this.endData);
        }
    }

    onResponse(data: Types.CrossOriginTransactionData<I, O>): void {
        const endData = data.endData;

        if (endData !== undefined && !this.endData) {
            this.endData = endData;
        }

        const inProgressId =
            data.target === _targetIdUp ? _targetIdUp : data.owner;

        if (this._inProgress[inProgressId]) {
            this._inProgress[inProgressId] = false;
            this._sentCount--;

            if (
                this.endData ||
                (this._sentCount === 0 && !this._isSelfResponding)
            ) {
                this.end();
            }
        }
    }
}

interface CrossOriginTransactionClass<I, O> {
    new (
        tabster: Types.TabsterCore,
        getOwner: Types.GetWindow,
        knownTargets: KnownTargets,
        value: I,
        timeout?: number,
        sentTo?: Types.CrossOriginSentTo,
        targetId?: string,
        sendUp?: Types.CrossOriginTransactionSend
    ): CrossOriginTransaction<I, O>;
    shouldForward?(
        tabster: Types.TabsterCore,
        data: Types.CrossOriginTransactionData<I, O>,
        getOwner: Types.GetWindow,
        ownerId: string
    ): boolean;
    makeResponse(
        tabster: Types.TabsterCore,
        data: Types.CrossOriginTransactionData<I, O>,
        getOwner: Types.GetWindow,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<O | undefined>,
        isSelfResponse?: boolean
    ): Promise<O>;
    shouldSelfRespond?(
        tabster: Types.TabsterCore,
        data: I,
        getOwner: Types.GetWindow,
        ownerId: string
    ): boolean;
}

interface BootstrapTransactionContents {
    isNavigatingWithKeyboard: boolean;
}

class BootstrapTransaction extends CrossOriginTransaction<
    undefined,
    BootstrapTransactionContents
> {
    type = CrossOriginTransactionTypes.Bootstrap;

    static shouldForward() {
        return false;
    }

    static async makeResponse(
        tabster: Types.TabsterCore
    ): Promise<BootstrapTransactionContents> {
        return {
            isNavigatingWithKeyboard:
                tabster.keyboardNavigation.isNavigatingWithKeyboard(),
        };
    }
}

interface CrossOriginElementDataIn {
    uid?: string;
    id?: string;
    rootId?: string;
    ownerId?: string;
    observedName?: string;
    /**
     * Optionally wait if the element is accessible or focusable before returning it
     */
    accessibility?: Types.ObservedElementAccessibility;
}

interface FocusElementData extends CrossOriginElementDataIn {
    noFocusedProgrammaticallyFlag?: boolean;
    noAccessibleCheck?: boolean;
}

class FocusElementTransaction extends CrossOriginTransaction<
    FocusElementData,
    boolean
> {
    type = CrossOriginTransactionTypes.FocusElement;

    static shouldSelfRespond() {
        return true;
    }

    static shouldForward(
        tabster: Types.TabsterCore,
        data: Types.CrossOriginTransactionData<FocusElementData, boolean>,
        getOwner: Types.GetWindow
    ): boolean {
        const el = GetElementTransaction.findElement(
            tabster,
            getOwner,
            data.beginData
        );
        return !el || !tabster.focusable.isFocusable(el);
    }

    static async makeResponse(
        tabster: Types.TabsterCore,
        data: Types.CrossOriginTransactionData<FocusElementData, boolean>,
        getOwner: Types.GetWindow,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<boolean | undefined>
    ): Promise<boolean> {
        const el = GetElementTransaction.findElement(
            tabster,
            getOwner,
            data.beginData
        );
        return (
            (!!el && tabster.focusedElement.focus(el, true)) ||
            !!(await forwardResult)
        );
    }
}

const CrossOriginStates: {
    Focused: 1;
    Blurred: 2;
    Observed: 3;
    DeadWindow: 4;
    KeyboardNavigation: 5;
    Outline: 6;
} = {
    Focused: 1,
    Blurred: 2,
    Observed: 3,
    DeadWindow: 4,
    KeyboardNavigation: 5,
    Outline: 6,
};
type CrossOriginState =
    (typeof CrossOriginStates)[keyof typeof CrossOriginStates];

interface CrossOriginElementDataOut {
    ownerUId: string;
    uid?: string;
    id?: string;
    rootUId?: string;
    deloserUId?: string;
    observedName?: string;
    observedDetails?: string;
}

interface CrossOriginStateData extends CrossOriginElementDataOut {
    state: CrossOriginState;
    isFocusedProgrammatically?: boolean;
    force?: boolean;
    isNavigatingWithKeyboard?: boolean;
    outline?: Partial<Types.OutlineProps>;
}

class StateTransaction extends CrossOriginTransaction<
    CrossOriginStateData,
    true
> {
    type = CrossOriginTransactionTypes.State;

    static shouldSelfRespond(
        tabster: Types.TabsterCore,
        data: CrossOriginStateData
    ): boolean {
        return (
            data.state !== CrossOriginStates.DeadWindow &&
            data.state !== CrossOriginStates.KeyboardNavigation
        );
    }

    static async makeResponse(
        tabster: Types.TabsterCore,
        data: Types.CrossOriginTransactionData<CrossOriginStateData, true>,
        getOwner: Types.GetWindow,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<true | undefined>,
        isSelfResponse?: boolean
    ): Promise<true> {
        const timestamp = data.timestamp;
        const beginData = data.beginData;

        if (timestamp && beginData) {
            switch (beginData.state) {
                case CrossOriginStates.Focused:
                    return StateTransaction._makeFocusedResponse(
                        tabster,
                        timestamp,
                        beginData,
                        transactions,
                        isSelfResponse
                    );
                case CrossOriginStates.Blurred:
                    return StateTransaction._makeBlurredResponse(
                        tabster,
                        timestamp,
                        beginData,
                        transactions.ctx
                    );
                case CrossOriginStates.Observed:
                    return StateTransaction._makeObservedResponse(
                        tabster,
                        beginData
                    );
                case CrossOriginStates.DeadWindow:
                    return StateTransaction._makeDeadWindowResponse(
                        tabster,
                        beginData,
                        transactions,
                        forwardResult
                    );
                case CrossOriginStates.KeyboardNavigation:
                    return StateTransaction._makeKeyboardNavigationResponse(
                        tabster,
                        transactions.ctx,
                        beginData.isNavigatingWithKeyboard
                    );
                case CrossOriginStates.Outline:
                    return StateTransaction._makeOutlineResponse(
                        tabster,
                        transactions.ctx,
                        beginData.outline
                    );
            }
        }

        return true;
    }

    static createElement(
        tabster: Types.TabsterCore,
        beginData: CrossOriginElementDataOut
    ): CrossOriginElement | null {
        return beginData.uid
            ? new CrossOriginElement(
                  tabster,
                  beginData.uid,
                  beginData.ownerUId,
                  beginData.id,
                  beginData.rootUId,
                  beginData.observedName,
                  beginData.observedDetails
              )
            : null;
    }

    private static async _makeFocusedResponse(
        tabster: Types.TabsterCore,
        timestamp: number,
        beginData: CrossOriginStateData,
        transactions: CrossOriginTransactions,
        isSelfResponse?: boolean
    ): Promise<true> {
        const element = StateTransaction.createElement(tabster, beginData);

        if (beginData && beginData.ownerUId && element) {
            transactions.ctx.focusOwner = beginData.ownerUId;
            transactions.ctx.focusOwnerTimestamp = timestamp;

            if (!isSelfResponse && beginData.rootUId && beginData.deloserUId) {
                const deloserAPI = tabster.deloser;

                if (deloserAPI) {
                    const history = DeloserAPI.getHistory(deloserAPI);

                    const deloser: CrossOriginDeloser = {
                        ownerUId: beginData.ownerUId,
                        deloserUId: beginData.deloserUId,
                        rootUId: beginData.rootUId,
                    };

                    const historyItem = history.make(
                        beginData.rootUId,
                        () =>
                            new CrossOriginDeloserHistoryByRoot(
                                tabster,
                                deloser.rootUId,
                                transactions
                            )
                    );

                    historyItem.unshift(deloser);
                }
            }

            CrossOriginFocusedElementState.setVal(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                tabster.crossOrigin!.focusedElement,
                element,
                {
                    isFocusedProgrammatically:
                        beginData.isFocusedProgrammatically,
                }
            );
        }

        return true;
    }

    private static async _makeBlurredResponse(
        tabster: Types.TabsterCore,
        timestamp: number,
        beginData: CrossOriginStateData,
        context: CrossOriginInstanceContext
    ): Promise<true> {
        if (
            beginData &&
            (beginData.ownerUId === context.focusOwner || beginData.force) &&
            (!context.focusOwnerTimestamp ||
                context.focusOwnerTimestamp < timestamp)
        ) {
            CrossOriginFocusedElementState.setVal(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                tabster.crossOrigin!.focusedElement,
                undefined,
                {}
            );
        }

        return true;
    }

    private static async _makeObservedResponse(
        tabster: Types.TabsterCore,
        beginData: CrossOriginStateData
    ): Promise<true> {
        const name = beginData.observedName;
        const element = StateTransaction.createElement(tabster, beginData);

        if (name && element) {
            CrossOriginObservedElementState.trigger(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                tabster.crossOrigin!.observedElement,
                element,
                { names: [name], details: beginData.observedDetails }
            );
        }

        return true;
    }

    private static async _makeDeadWindowResponse(
        tabster: Types.TabsterCore,
        beginData: CrossOriginStateData,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<true | undefined>
    ): Promise<true> {
        const deadUId = beginData && beginData.ownerUId;

        if (deadUId) {
            transactions.removeTarget(deadUId);
        }

        return forwardResult.then(() => {
            if (deadUId === transactions.ctx.focusOwner) {
                const deloserAPI = tabster.deloser;

                if (deloserAPI) {
                    DeloserAPI.forceRestoreFocus(deloserAPI);
                }
            }
            return true;
        });
    }

    private static async _makeKeyboardNavigationResponse(
        tabster: Types.TabsterCore,
        context: CrossOriginInstanceContext,
        isNavigatingWithKeyboard?: boolean
    ): Promise<true> {
        if (
            isNavigatingWithKeyboard !== undefined &&
            tabster.keyboardNavigation.isNavigatingWithKeyboard() !==
                isNavigatingWithKeyboard
        ) {
            context.ignoreKeyboardNavigationStateUpdate = true;
            tabster.keyboardNavigation.setNavigatingWithKeyboard(
                isNavigatingWithKeyboard
            );
            context.ignoreKeyboardNavigationStateUpdate = false;
        }
        return true;
    }

    private static async _makeOutlineResponse(
        tabster: Types.TabsterCore,
        context: CrossOriginInstanceContext,
        props?: Partial<Types.OutlineProps>
    ): Promise<true> {
        if (context.origOutlineSetup) {
            context.origOutlineSetup.call(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                tabster.outline!,
                props
            );
        }
        return true;
    }
}

class GetElementTransaction extends CrossOriginTransaction<
    CrossOriginElementDataIn | undefined,
    CrossOriginElementDataOut
> {
    type = CrossOriginTransactionTypes.GetElement;

    static shouldSelfRespond() {
        return true;
    }

    static findElement(
        tabster: Types.TabsterCore,
        getOwner: Types.GetWindow,
        data?: CrossOriginElementDataIn
    ): HTMLElement | null {
        let element: HTMLElement | null | undefined;

        if (
            data &&
            (!data.ownerId || data.ownerId === getWindowUId(getOwner()))
        ) {
            if (data.id) {
                element = dom.getElementById(getOwner().document, data.id);

                if (element && data.rootId) {
                    const ctx = RootAPI.getTabsterContext(tabster, element);

                    if (!ctx || ctx.root.uid !== data.rootId) {
                        return null;
                    }
                }
            } else if (data.uid) {
                const ref = getInstanceContext(getOwner).elementByUId[data.uid];
                element = ref && ref.get();
            } else if (data.observedName) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                element = tabster.observedElement!.getElement(
                    data.observedName,
                    data.accessibility
                );
            }
        }

        return element || null;
    }

    static getElementData(
        tabster: Types.TabsterCore,
        element: HTMLElement,
        getOwner: Types.GetWindow,
        context: CrossOriginInstanceContext,
        ownerUId: string
    ): CrossOriginElementDataOut {
        const deloser = DeloserAPI.getDeloser(tabster, element);
        const ctx = RootAPI.getTabsterContext(tabster, element);
        const tabsterOnElement = getTabsterOnElement(tabster, element);
        const observed = tabsterOnElement && tabsterOnElement.observed;

        return {
            uid: getElementUId(getOwner, element),
            ownerUId,
            id: element.id || undefined,
            rootUId: ctx ? ctx.root.uid : undefined,
            deloserUId: deloser
                ? getDeloserUID(getOwner, context, deloser)
                : undefined,
            observedName: observed && observed.names && observed.names[0],
            observedDetails: observed && observed.details,
        };
    }

    static async makeResponse(
        tabster: Types.TabsterCore,
        data: Types.CrossOriginTransactionData<
            CrossOriginElementDataIn | undefined,
            CrossOriginElementDataOut
        >,
        getOwner: Types.GetWindow,
        ownerUId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<CrossOriginElementDataOut | undefined>
    ): Promise<CrossOriginElementDataOut | undefined> {
        const beginData = data.beginData;
        let element: HTMLElement | undefined;
        let dataOut: CrossOriginElementDataOut | undefined;

        if (beginData === undefined) {
            element = tabster.focusedElement.getFocusedElement();
        } else if (beginData) {
            element =
                GetElementTransaction.findElement(
                    tabster,
                    getOwner,
                    beginData
                ) || undefined;
        }

        if (!element && beginData) {
            const name = beginData.observedName;
            const timeout = data.timeout;
            const accessibility = beginData.accessibility;

            if (name && timeout) {
                const e: {
                    element?: HTMLElement | null;
                    crossOrigin?: CrossOriginElementDataOut;
                } = await new (getPromise(getOwner))((resolve) => {
                    let isWaitElementResolved = false;
                    let isForwardResolved = false;
                    let isResolved = false;

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    tabster
                        .observedElement!.waitElement(
                            name,
                            timeout,
                            accessibility
                        )
                        .result.then((value) => {
                            isWaitElementResolved = true;

                            if (!isResolved && (value || isForwardResolved)) {
                                isResolved = true;
                                resolve({ element: value });
                            }
                        });

                    forwardResult.then((value) => {
                        isForwardResolved = true;

                        if (!isResolved && (value || isWaitElementResolved)) {
                            isResolved = true;
                            resolve({ crossOrigin: value });
                        }
                    });
                });

                if (e.element) {
                    element = e.element;
                } else if (e.crossOrigin) {
                    dataOut = e.crossOrigin;
                }
            }
        }

        return element
            ? GetElementTransaction.getElementData(
                  tabster,
                  element,
                  getOwner,
                  transactions.ctx,
                  ownerUId
              )
            : dataOut;
    }
}

interface CrossOriginDeloser {
    ownerUId: string;
    deloserUId: string;
    rootUId: string;
}

interface RestoreFocusInDeloserTransactionData extends CrossOriginDeloser {
    reset: boolean;
}

class RestoreFocusInDeloserTransaction extends CrossOriginTransaction<
    RestoreFocusInDeloserTransactionData,
    boolean
> {
    type = CrossOriginTransactionTypes.RestoreFocusInDeloser;

    static async makeResponse(
        tabster: Types.TabsterCore,
        data: Types.CrossOriginTransactionData<
            RestoreFocusInDeloserTransactionData,
            boolean
        >,
        getOwner: Types.GetWindow,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<boolean | undefined>
    ): Promise<boolean | null> {
        const forwardRet = await forwardResult;
        const begin = !forwardRet && data.beginData;
        const uid = begin && begin.deloserUId;
        const deloser = uid && transactions.ctx.deloserByUId[uid];
        const deloserAPI = tabster.deloser;

        if (begin && deloser && deloserAPI) {
            const history = DeloserAPI.getHistory(deloserAPI);
            return begin.reset
                ? history.resetFocus(deloser)
                : history.focusAvailable(deloser);
        }

        return !!forwardRet;
    }
}

class PingTransaction extends CrossOriginTransaction<undefined, true> {
    type = CrossOriginTransactionTypes.Ping;

    static shouldForward() {
        return false;
    }

    static async makeResponse(): Promise<true> {
        return true;
    }
}

interface CrossOriginTransactionWrapper<I, O> {
    transaction: CrossOriginTransaction<I, O>;
    timer?: number;
}

class CrossOriginTransactions {
    private _owner: Types.GetWindow;
    private _ownerUId: string;
    private _knownTargets: KnownTargets = {};
    private _transactions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [id: string]: CrossOriginTransactionWrapper<any, any>;
    } = {};
    private _tabster: Types.TabsterCore;
    private _pingTimer: number | undefined;
    private _isDefaultSendUp = false;
    private _deadPromise: Promise<true | undefined> | undefined;
    isSetUp = false;
    sendUp: Types.CrossOriginTransactionSend | undefined;
    ctx: CrossOriginInstanceContext;

    constructor(
        tabster: Types.TabsterCore,
        getOwner: Types.GetWindow,
        context: CrossOriginInstanceContext
    ) {
        this._tabster = tabster;
        this._owner = getOwner;
        this._ownerUId = getWindowUId(getOwner());
        this.ctx = context;
    }

    setup(
        sendUp?: Types.CrossOriginTransactionSend | null
    ): (msg: Types.CrossOriginMessage) => void {
        if (this.isSetUp) {
            if (__DEV__) {
                console.error("CrossOrigin is already set up.");
            }
        } else {
            this.isSetUp = true;

            this.setSendUp(sendUp);

            this._owner().addEventListener("pagehide", this._onPageHide);

            this._ping();
        }

        return this._onMessage;
    }

    setSendUp(
        sendUp?: Types.CrossOriginTransactionSend | null
    ): (msg: Types.CrossOriginMessage) => void {
        if (!this.isSetUp) {
            throw new Error("CrossOrigin is not set up.");
        }

        this.sendUp = sendUp || undefined;

        const owner = this._owner();

        if (sendUp === undefined) {
            if (!this._isDefaultSendUp) {
                if (owner.document) {
                    this._isDefaultSendUp = true;

                    if (
                        owner.parent &&
                        owner.parent !== owner &&
                        owner.parent.postMessage
                    ) {
                        this.sendUp = (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            data: Types.CrossOriginTransactionData<any, any>
                        ) => {
                            owner.parent.postMessage(JSON.stringify(data), "*");
                        };
                    }

                    owner.addEventListener("message", this._onBrowserMessage);
                }
            }
        } else if (this._isDefaultSendUp) {
            owner.removeEventListener("message", this._onBrowserMessage);
            this._isDefaultSendUp = false;
        }

        return this._onMessage;
    }

    async dispose(): Promise<void> {
        const owner = this._owner();

        if (this._pingTimer) {
            owner.clearTimeout(this._pingTimer);
            this._pingTimer = undefined;
        }

        owner.removeEventListener("message", this._onBrowserMessage);
        owner.removeEventListener("pagehide", this._onPageHide);

        await this._dead();

        delete this._deadPromise;

        for (const id of Object.keys(this._transactions)) {
            const t = this._transactions[id];

            if (t.timer) {
                owner.clearTimeout(t.timer);
                delete t.timer;
            }

            t.transaction.end();
        }

        this._knownTargets = {};

        delete this.sendUp;
    }

    beginTransaction<I, O>(
        Transaction: CrossOriginTransactionClass<I, O>,
        value: I,
        timeout?: number,
        sentTo?: Types.CrossOriginSentTo,
        targetId?: string,
        withReject?: boolean
    ): Promise<O | undefined> {
        if (!this._owner) {
            return getPromise(this._owner).reject();
        }

        const transaction = new Transaction(
            this._tabster,
            this._owner,
            this._knownTargets,
            value,
            timeout,
            sentTo,
            targetId,
            this.sendUp
        );
        let selfResponse:
            | ((
                  data: Types.CrossOriginTransactionData<I, O>
              ) => Promise<O | undefined>)
            | undefined;

        if (
            Transaction.shouldSelfRespond &&
            Transaction.shouldSelfRespond(
                this._tabster,
                value,
                this._owner,
                this._ownerUId
            )
        ) {
            selfResponse = (data: Types.CrossOriginTransactionData<I, O>) => {
                return Transaction.makeResponse(
                    this._tabster,
                    data,
                    this._owner,
                    this._ownerUId,
                    this,
                    getPromise(this._owner).resolve(undefined),
                    true
                );
            };
        }

        return this._beginTransaction(
            transaction,
            timeout,
            selfResponse,
            withReject
        );
    }

    removeTarget(uid: string): void {
        delete this._knownTargets[uid];
    }

    private _beginTransaction<I, O>(
        transaction: CrossOriginTransaction<I, O>,
        timeout?: number,
        selfResponse?: (
            data: Types.CrossOriginTransactionData<I, O>
        ) => Promise<O | undefined>,
        withReject?: boolean
    ): Promise<O | undefined> {
        const owner = this._owner();

        const wrapper: CrossOriginTransactionWrapper<I, O> = {
            transaction,
            timer: owner.setTimeout(
                () => {
                    delete wrapper.timer;
                    transaction.end("Cross origin transaction timed out.");
                },
                _transactionTimeout + (timeout || 0)
            ),
        };

        this._transactions[transaction.id] = wrapper;

        const ret = transaction.begin(selfResponse);

        ret.catch(() => {
            /**/
        }).finally(() => {
            if (wrapper.timer) {
                owner.clearTimeout(wrapper.timer);
            }
            delete this._transactions[transaction.id];
        });

        return ret.then(
            (value) => value,
            withReject ? undefined : () => undefined
        );
    }

    forwardTransaction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: Types.CrossOriginTransactionData<any, any>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> {
        const owner = this._owner;
        let targetId = data.target;

        if (targetId === this._ownerUId) {
            return getPromise(owner).resolve();
        }

        const Transaction = this._getTransactionClass(data.type);

        if (Transaction) {
            if (
                Transaction.shouldForward === undefined ||
                Transaction.shouldForward(
                    this._tabster,
                    data,
                    owner,
                    this._ownerUId
                )
            ) {
                const sentTo = data.sentto;

                if (targetId === _targetIdUp) {
                    targetId = undefined;
                    sentTo[this._ownerUId] = true;
                }

                delete sentTo[_targetIdUp];

                return this._beginTransaction(
                    new Transaction(
                        this._tabster,
                        owner,
                        this._knownTargets,
                        data.beginData,
                        data.timeout,
                        sentTo,
                        targetId,
                        this.sendUp
                    ),
                    data.timeout
                );
            } else {
                return getPromise(owner).resolve();
            }
        }

        return getPromise(owner).reject(
            `Unknown transaction type ${data.type}`
        );
    }

    private _getTransactionClass(
        type: Types.CrossOriginTransactionType
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): CrossOriginTransactionClass<any, any> | null {
        switch (type) {
            case CrossOriginTransactionTypes.Bootstrap:
                return BootstrapTransaction;
            case CrossOriginTransactionTypes.FocusElement:
                return FocusElementTransaction;
            case CrossOriginTransactionTypes.State:
                return StateTransaction;
            case CrossOriginTransactionTypes.GetElement:
                return GetElementTransaction;
            case CrossOriginTransactionTypes.RestoreFocusInDeloser:
                return RestoreFocusInDeloserTransaction;
            case CrossOriginTransactionTypes.Ping:
                return PingTransaction;
            default:
                return null;
        }
    }

    private _onMessage = (e: Types.CrossOriginMessage) => {
        if (e.data.owner === this._ownerUId || !this._tabster) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Types.CrossOriginTransactionData<any, any> = e.data;
        let transactionId: string;

        if (
            !data ||
            !(transactionId = data.transaction) ||
            !data.type ||
            !data.timestamp ||
            !data.owner ||
            !data.sentto
        ) {
            return;
        }

        let knownTarget = this._knownTargets[data.owner];

        if (!knownTarget && e.send && data.owner !== this._ownerUId) {
            knownTarget = this._knownTargets[data.owner] = { send: e.send };
        }

        if (knownTarget) {
            knownTarget.last = Date.now();
        }

        if (data.isResponse) {
            const t = this._transactions[transactionId];

            if (t && t.transaction && t.transaction.type === data.type) {
                t.transaction.onResponse(data);
            }
        } else {
            const Transaction = this._getTransactionClass(data.type);

            const forwardResult = this.forwardTransaction(data);

            if (Transaction && e.send) {
                Transaction.makeResponse(
                    this._tabster,
                    data,
                    this._owner,
                    this._ownerUId,
                    this,
                    forwardResult,
                    false
                ).then((r) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const response: Types.CrossOriginTransactionData<any, any> =
                        {
                            transaction: data.transaction,
                            type: data.type,
                            isResponse: true,
                            timestamp: Date.now(),
                            owner: this._ownerUId,
                            timeout: data.timeout,
                            sentto: {},
                            target:
                                data.target === _targetIdUp
                                    ? _targetIdUp
                                    : data.owner,
                            endData: r,
                        };

                    e.send(response);
                });
            }
        }
    };

    private _onPageHide = () => {
        this._dead();
    };

    private async _dead(): Promise<void> {
        if (!this._deadPromise && this.ctx.focusOwner === this._ownerUId) {
            this._deadPromise = this.beginTransaction(StateTransaction, {
                ownerUId: this._ownerUId,
                state: CrossOriginStates.DeadWindow,
            });
        }

        if (this._deadPromise) {
            await this._deadPromise;
        }
    }

    private async _ping(): Promise<void> {
        if (this._pingTimer) {
            return;
        }

        let deadWindows: { [key: string]: boolean } | undefined;
        const now = Date.now();
        const targets = Object.keys(this._knownTargets).filter(
            (uid) => now - (this._knownTargets[uid].last || 0) > _pingTimeout
        );

        if (this.sendUp) {
            targets.push(_targetIdUp);
        }

        if (targets.length) {
            await getPromise(this._owner).all(
                targets.map((uid) =>
                    this.beginTransaction(
                        PingTransaction,
                        undefined,
                        undefined,
                        undefined,
                        uid,
                        true
                    ).then(
                        () => true,
                        () => {
                            if (uid !== _targetIdUp) {
                                if (!deadWindows) {
                                    deadWindows = {};
                                }
                                deadWindows[uid] = true;
                                delete this._knownTargets[uid];
                            }
                            return false;
                        }
                    )
                )
            );
        }

        if (deadWindows) {
            const focused = await this.beginTransaction(
                GetElementTransaction,
                undefined
            );

            if (
                !focused &&
                this.ctx.focusOwner &&
                this.ctx.focusOwner in deadWindows
            ) {
                await this.beginTransaction(StateTransaction, {
                    ownerUId: this._ownerUId,
                    state: CrossOriginStates.Blurred,
                    force: true,
                });

                const deloserAPI = this._tabster.deloser;

                if (deloserAPI) {
                    DeloserAPI.forceRestoreFocus(deloserAPI);
                }
            }
        }

        this._pingTimer = this._owner().setTimeout(() => {
            this._pingTimer = undefined;
            this._ping();
        }, _pingTimeout);
    }

    private _onBrowserMessage = (e: MessageEvent) => {
        if (e.source === this._owner()) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const send = (data: Types.CrossOriginTransactionData<any, any>) => {
            if (e.source && e.source.postMessage) {
                (e.source.postMessage as Function)(JSON.stringify(data), "*");
            }
        };

        try {
            this._onMessage({
                data: JSON.parse(e.data),
                send,
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            /* Ignore */
        }
    };
}

export class CrossOriginElement implements Types.CrossOriginElement {
    private _tabster: Types.TabsterCore;
    readonly uid: string;
    readonly ownerId: string;
    readonly id?: string;
    readonly rootId?: string;
    readonly observedName?: string;
    readonly observedDetails?: string;

    constructor(
        tabster: Types.TabsterCore,
        uid: string,
        ownerId: string,
        id?: string,
        rootId?: string,
        observedName?: string,
        observedDetails?: string
    ) {
        this._tabster = tabster;
        this.uid = uid;
        this.ownerId = ownerId;
        this.id = id;
        this.rootId = rootId;
        this.observedName = observedName;
        this.observedDetails = observedDetails;
    }

    focus(
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._tabster.crossOrigin!.focusedElement.focus(
            this,
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck
        );
    }
}

export class CrossOriginFocusedElementState
    extends Subscribable<
        CrossOriginElement | undefined,
        Types.FocusedElementDetail
    >
    implements Types.CrossOriginFocusedElementState
{
    private _transactions: CrossOriginTransactions;

    constructor(transactions: CrossOriginTransactions) {
        super();
        this._transactions = transactions;
    }

    async focus(
        element: Types.CrossOriginElement,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean> {
        return this._focus(
            {
                uid: element.uid,
                id: element.id,
                rootId: element.rootId,
                ownerId: element.ownerId,
                observedName: element.observedName,
            },
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck
        );
    }

    async focusById(
        elementId: string,
        rootId?: string,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean> {
        return this._focus(
            { id: elementId, rootId },
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck
        );
    }

    async focusByObservedName(
        observedName: string,
        timeout?: number,
        rootId?: string,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean> {
        return this._focus(
            { observedName, rootId },
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck,
            timeout
        );
    }

    private async _focus(
        elementData: CrossOriginElementDataIn,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean,
        timeout?: number
    ): Promise<boolean> {
        return this._transactions
            .beginTransaction(
                FocusElementTransaction,
                {
                    ...elementData,
                    noFocusedProgrammaticallyFlag,
                    noAccessibleCheck,
                },
                timeout
            )
            .then((value) => !!value);
    }

    static setVal(
        instance: Types.CrossOriginFocusedElementState,
        val: CrossOriginElement | undefined,
        detail: Types.FocusedElementDetail
    ): void {
        (instance as CrossOriginFocusedElementState).setVal(val, detail);
    }
}

export class CrossOriginObservedElementState
    extends Subscribable<CrossOriginElement, Types.ObservedElementProps>
    implements Types.CrossOriginObservedElementState
{
    private _tabster: Types.TabsterCore;
    private _transactions: CrossOriginTransactions;
    private _lastRequestFocusId = 0;

    constructor(
        tabster: Types.TabsterCore,
        transactions: CrossOriginTransactions
    ) {
        super();
        this._tabster = tabster;
        this._transactions = transactions;
    }

    async getElement(
        observedName: string,
        accessibility?: Types.ObservedElementAccessibility
    ): Promise<CrossOriginElement | null> {
        return this.waitElement(observedName, 0, accessibility);
    }

    async waitElement(
        observedName: string,
        timeout: number,
        accessibility?: Types.ObservedElementAccessibility
    ): Promise<CrossOriginElement | null> {
        return this._transactions
            .beginTransaction(
                GetElementTransaction,
                {
                    observedName,
                    accessibility,
                },
                timeout
            )
            .then((value) =>
                value
                    ? StateTransaction.createElement(this._tabster, value)
                    : null
            );
    }

    async requestFocus(
        observedName: string,
        timeout: number
    ): Promise<boolean> {
        const requestId = ++this._lastRequestFocusId;
        return this.waitElement(
            observedName,
            timeout,
            ObservedElementAccessibilities.Focusable
        ).then((element) =>
            this._lastRequestFocusId === requestId && element
                ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  this._tabster.crossOrigin!.focusedElement.focus(element, true)
                : false
        );
    }

    static trigger(
        instance: Types.CrossOriginObservedElementState,
        element: CrossOriginElement,
        details: Types.ObservedElementProps
    ): void {
        (instance as CrossOriginObservedElementState).trigger(element, details);
    }
}

export class CrossOriginAPI implements Types.CrossOriginAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _transactions: CrossOriginTransactions;
    private _blurTimer: number | undefined;
    private _ctx: CrossOriginInstanceContext;

    focusedElement: Types.CrossOriginFocusedElementState;
    observedElement: Types.CrossOriginObservedElementState;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._ctx = {
            ignoreKeyboardNavigationStateUpdate: false,
            deloserByUId: {},
        };

        this._transactions = new CrossOriginTransactions(
            tabster,
            this._win,
            this._ctx
        );
        this.focusedElement = new CrossOriginFocusedElementState(
            this._transactions
        );
        this.observedElement = new CrossOriginObservedElementState(
            tabster,
            this._transactions
        );
    }

    setup(
        sendUp?: Types.CrossOriginTransactionSend | null
    ): (msg: Types.CrossOriginMessage) => void {
        if (this.isSetUp()) {
            return this._transactions.setSendUp(sendUp);
        } else {
            this._tabster.queueInit(this._init);
            return this._transactions.setup(sendUp);
        }
    }

    isSetUp(): boolean {
        return this._transactions.isSetUp;
    }

    private _init = (): void => {
        const tabster = this._tabster;

        tabster.keyboardNavigation.subscribe(
            this._onKeyboardNavigationStateChanged
        );
        tabster.focusedElement.subscribe(this._onFocus);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        tabster.observedElement!.subscribe(this._onObserved);

        if (!this._ctx.origOutlineSetup) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this._ctx.origOutlineSetup = tabster.outline!.setup;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tabster.outline!.setup = this._outlineSetup;
        }

        this._transactions
            .beginTransaction(
                BootstrapTransaction,
                undefined,
                undefined,
                undefined,
                _targetIdUp
            )
            .then((data) => {
                if (
                    data &&
                    this._tabster.keyboardNavigation.isNavigatingWithKeyboard() !==
                        data.isNavigatingWithKeyboard
                ) {
                    this._ctx.ignoreKeyboardNavigationStateUpdate = true;
                    this._tabster.keyboardNavigation.setNavigatingWithKeyboard(
                        data.isNavigatingWithKeyboard
                    );
                    this._ctx.ignoreKeyboardNavigationStateUpdate = false;
                }
            });
    };

    dispose(): void {
        const tabster = this._tabster;

        tabster.keyboardNavigation.unsubscribe(
            this._onKeyboardNavigationStateChanged
        );
        tabster.focusedElement.unsubscribe(this._onFocus);
        tabster.observedElement?.unsubscribe(this._onObserved);

        this._transactions.dispose();
        this.focusedElement.dispose();
        this.observedElement.dispose();

        this._ctx.deloserByUId = {};
    }

    private _onKeyboardNavigationStateChanged = (value: boolean): void => {
        if (!this._ctx.ignoreKeyboardNavigationStateUpdate) {
            this._transactions.beginTransaction(StateTransaction, {
                state: CrossOriginStates.KeyboardNavigation,
                ownerUId: getWindowUId(this._win()),
                isNavigatingWithKeyboard: value,
            });
        }
    };

    private _onFocus = (element: HTMLElementWithUID | undefined): void => {
        const win = this._win();

        const ownerUId = getWindowUId(win);

        if (this._blurTimer) {
            win.clearTimeout(this._blurTimer);
            this._blurTimer = undefined;
        }

        if (element) {
            this._transactions.beginTransaction(StateTransaction, {
                ...GetElementTransaction.getElementData(
                    this._tabster,
                    element,
                    this._win,
                    this._ctx,
                    ownerUId
                ),
                state: CrossOriginStates.Focused,
            });
        } else {
            this._blurTimer = win.setTimeout(() => {
                this._blurTimer = undefined;

                if (this._ctx.focusOwner && this._ctx.focusOwner === ownerUId) {
                    this._transactions
                        .beginTransaction(GetElementTransaction, undefined)
                        .then((value) => {
                            if (!value && this._ctx.focusOwner === ownerUId) {
                                this._transactions.beginTransaction(
                                    StateTransaction,
                                    {
                                        ownerUId,
                                        state: CrossOriginStates.Blurred,
                                        force: false,
                                    }
                                );
                            }
                        });
                }
            }, 0);
        }
    };

    private _onObserved = (
        element: HTMLElement,
        details: Types.ObservedElementProps
    ): void => {
        const d = GetElementTransaction.getElementData(
            this._tabster,
            element,
            this._win,
            this._ctx,
            getWindowUId(this._win())
        ) as CrossOriginStateData;

        d.state = CrossOriginStates.Observed;
        d.observedName = details.names?.[0];
        d.observedDetails = details.details;

        this._transactions.beginTransaction(StateTransaction, d);
    };

    private _outlineSetup = (props?: Partial<Types.OutlineProps>): void => {
        this._transactions.beginTransaction(StateTransaction, {
            state: CrossOriginStates.Outline,
            ownerUId: getWindowUId(this._win()),
            outline: props,
        });
    };
}

function getDeloserUID(
    getWindow: Types.GetWindow,
    context: CrossOriginInstanceContext,
    deloser: Types.Deloser
): string | undefined {
    const deloserElement = deloser.getElement();

    if (deloserElement) {
        const uid = getElementUId(getWindow, deloserElement);

        if (!context.deloserByUId[uid]) {
            context.deloserByUId[uid] = deloser;
        }

        return uid;
    }

    return undefined;
}
