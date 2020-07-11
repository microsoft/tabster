/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DeloserAPI, DeloserHistoryByRootBase, DeloserItemBase } from './Deloser';
import { getAbilityHelpersOnElement } from './Instance';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import { RootAPI } from './Root';
import { Subscribable } from './State/Subscribable';
import * as Types from './Types';
import { elementByUId, getElementUId, getUId, getWindowUId, HTMLElementWithUID, WindowWithUID } from './Utils';

const _transactionTimeout = 1500;

const _targetIdUp = 'up';

let _ignoreKeyboardNavigationStateUpdate = false;
let _focusOwner: string | undefined;
let _focusOwnerTimestamp: number | undefined;
const _deloserByUId: { [uid: string]: Types.Deloser } = {};

interface KnownTargets {
    [id: string]: {
        send: (payload: Types.CrossOriginTransactionData<any, any>) => void;
        timeout?: number;
    };
}

class CrossOriginDeloserItem extends DeloserItemBase<CrossOriginDeloser> {
    private _deloser: CrossOriginDeloser;
    private _transactions: CrossOriginTransactions;

    constructor(ah: Types.AbilityHelpers, deloser: CrossOriginDeloser, trasactions: CrossOriginTransactions) {
        super();
        this._deloser = deloser;
        this._transactions = trasactions;
    }

    belongsTo(deloser: CrossOriginDeloser): boolean {
        return deloser.deloserUId === this._deloser.deloserUId;
    }

    async focusAvailable(): Promise<boolean> {
        const data: RestoreFocusInDeloserTransactionData = {
            ...this._deloser,
            reset: false
        };

        return this._transactions.beginTransaction(RestoreFocusInDeloserTransaction, data).then(value => !!value);
    }

    async resetFocus(): Promise<boolean> {
        const data: RestoreFocusInDeloserTransactionData = {
            ...this._deloser,
            reset: true
        };

        return this._transactions.beginTransaction(RestoreFocusInDeloserTransaction, data).then(value => !!value);
    }
}

class CrossOriginDeloserHistoryByRoot extends DeloserHistoryByRootBase<CrossOriginDeloser, CrossOriginDeloserItem> {
    private _transactions: CrossOriginTransactions;

    constructor(
        ah: Types.AbilityHelpers,
        rootUId: string,
        transactions: CrossOriginTransactions
    ) {
        super(ah, rootUId);
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
            item = new CrossOriginDeloserItem(this._ah, deloser, this._transactions);
        }

        this._history.unshift(item);

        this._history.splice(10, this._history.length - 10);
    }

    async focusAvailable(): Promise<boolean> {
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
    protected ah: Types.AbilityHelpers;
    protected endData: O | undefined;
    protected owner: Window;
    protected ownerId: string;
    protected sendUp: Types.CrossOriginTransactionSend | undefined;
    private _promise: Promise<O>;
    protected _resolve: ((endData?: O) => void) | undefined;
    private _reject: ((reason: string) => void) | undefined;
    private _knownTargets: KnownTargets;
    private _sentTo: Types.CrossOriginSentTo;
    protected targetId: string | undefined;
    private _inProgress: { [id: string]: boolean } = {};
    private _isDone = false;
    private _isSelfResponding = false;
    private _sentCount = 0;

    constructor(
        ah: Types.AbilityHelpers,
        owner: WindowWithUID,
        knownTargets: KnownTargets,
        value: I,
        timeout?: number,
        sentTo?: Types.CrossOriginSentTo,
        targetId?: string,
        sendUp?: Types.CrossOriginTransactionSend
    ) {
        this.ah = ah;
        this.owner = owner;
        this.ownerId = getWindowUId(owner);
        this.id = getUId(owner);
        this.beginData = value;
        this._knownTargets = knownTargets;
        this._sentTo = sentTo || { [this.ownerId]: true };
        this.targetId = targetId;
        this.sendUp = sendUp;
        this.timeout = timeout;
        this._promise = new Promise<O>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    protected getTargets(knownTargets: KnownTargets): KnownTargets | null {
        return this.targetId === _targetIdUp
            ? (this.sendUp
                ? { [_targetIdUp]: { send: this.sendUp } }
                : null)
            : (this.targetId
                ? (knownTargets[this.targetId]
                    ? { [this.targetId]: { send: knownTargets[this.targetId].send } }
                    : null)
                : (((Object.keys(knownTargets).length === 0) && (this.sendUp))
                    ? { [_targetIdUp]: { send: this.sendUp } }
                    : (Object.keys(knownTargets).length > 0
                        ? knownTargets
                        : null))
            );
    }

    begin(selfResponse?: (data: Types.CrossOriginTransactionData<I, O>) => Promise<O | undefined>): Promise<O | undefined> {
        const targets = this.getTargets(this._knownTargets);
        const sentTo: Types.CrossOriginSentTo = { ...this._sentTo };

        if (targets) {
            for (let id of Object.keys(targets)) {
                sentTo[id] = true;
            }
        }

        const data: Types.CrossOriginTransactionData<I, O> = {
            ['ah-transaction']: this.id,
            ['ah-type']: this.type,
            ['ah-is-response']: false,
            ['ah-timestamp']: Date.now(),
            ['ah-owner']: this.ownerId,
            ['ah-sentto']: sentTo,
            ['ah-timeout']: this.timeout,
            ['ah-begin-data']: this.beginData
        };

        if (this.targetId) {
            data['ah-target'] = this.targetId;
        }

        if (selfResponse) {
            this._isSelfResponding = true;

            selfResponse(data).then(value => {
                this._isSelfResponding = false;

                if (value !== undefined) {
                    if (!this.endData) {
                        this.endData = value;
                    }
                }

                if (this.endData || (this._sentCount === 0)) {
                    this.end();
                }
            });
        }

        if (targets) {
            for (let id of Object.keys(targets)) {
                if (!(id in this._sentTo)) {
                    this._send(targets[id].send, id, data);
                }
            }
        }

        if ((this._sentCount === 0) && !this._isSelfResponding) {
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

        if ((this.endData === undefined) && error) {
            if (this._reject) {
                this._reject(error);
            }
        } else if (this._resolve) {
            this._resolve(this.endData);
        }
    }

    onResponse(data: Types.CrossOriginTransactionData<I, O>): void {
        const endData = data['ah-end-data'];

        if ((endData !== undefined) && !this.endData) {
            this.endData = endData;
        }

        const inProgressId = (data['ah-target'] === _targetIdUp) ? _targetIdUp : data['ah-owner'];

        if (this._inProgress[inProgressId]) {
            this._inProgress[inProgressId] = false;
            this._sentCount--;

            if (this.endData || ((this._sentCount === 0) && !this._isSelfResponding)) {
                this.end();
            }
        }
    }
}

interface CrossOriginTransactionClass<I, O> {
    new (
        ah: Types.AbilityHelpers,
        owner: WindowWithUID,
        knownTargets: KnownTargets,
        value: I,
        timeout?: number,
        sentTo?: Types.CrossOriginSentTo,
        targetId?: string,
        sendUp?: Types.CrossOriginTransactionSend
    ): CrossOriginTransaction<I, O>;
    shouldForward?(ah: Types.AbilityHelpers, data: Types.CrossOriginTransactionData<I, O>, owner: Window, ownerId: string): boolean;
    makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<I, O>,
        owner: Window,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<O | undefined>,
        isSelfResponse?: boolean
    ): Promise<O>;
    shouldSelfRespond?: boolean;
}

interface BootstrapTransactionContents {
    isNavigatingWithKeyboard: boolean;
}

class BootstrapTransaction extends CrossOriginTransaction<undefined, BootstrapTransactionContents> {
    type = Types.CrossOriginTransactionType.Bootstrap;

    static shouldForward() {
        return false;
    }

    static async makeResponse(ah: Types.AbilityHelpers): Promise<BootstrapTransactionContents> {
        return { isNavigatingWithKeyboard: ah.keyboardNavigation.isNavigatingWithKeyboard() };
    }
}

class KeyboardNavigationStateTransaction extends CrossOriginTransaction<boolean, true> {
    type = Types.CrossOriginTransactionType.KeyboardNavigationState;

    static async makeResponse(ah: Types.AbilityHelpers, data: Types.CrossOriginTransactionData<boolean, true>): Promise<true> {
        if (ah.keyboardNavigation.isNavigatingWithKeyboard() !== data['ah-begin-data']) {
            _ignoreKeyboardNavigationStateUpdate = true;
            KeyboardNavigationState.setVal(ah.keyboardNavigation, !!data['ah-begin-data']);
            _ignoreKeyboardNavigationStateUpdate = false;
        }
        return true;
    }
}

interface CrossOriginElementDataIn {
    uid?: string;
    id?: string;
    rootId?: string;
    ownerId?: string;
    observedName?: string;
}

interface FocusElementData extends CrossOriginElementDataIn {
    noFocusedProgrammaticallyFlag?: boolean;
    noAccessibleCheck?: boolean;
}

class FocusElementTransaction extends CrossOriginTransaction<FocusElementData, boolean> {
    type = Types.CrossOriginTransactionType.FocusElement;

    static shouldSelfRespond = true;

    static shouldForward(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<FocusElementData, boolean>,
        owner: Window
    ): boolean {
        const el = GetElementTransaction.findElement(ah, owner, data['ah-begin-data']);
        return !el || !ah.focusable.isFocusable(el);
    }

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<FocusElementData, boolean>,
        owner: Window,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<boolean | undefined>
    ): Promise<boolean> {
        const el = GetElementTransaction.findElement(ah, owner, data['ah-begin-data']);
        return (!!el && ah.focusedElement.focus(el)) || !!(await forwardResult);
    }
}

enum CrossOriginElementState {
    Focused = 1,
    Blurred = 2,
    Observed = 3
}

interface CrossOriginElementDataOut {
    ownerUId: string;
    timestamp: number;
    uid?: string;
    id?: string;
    rootUId?: string;
    deloserUId?: string;
    observedName?: string;
    observedDetails?: string;
}

interface CrossOriginElementStateData extends CrossOriginElementDataOut {
    state: CrossOriginElementState;
    isFocusedProgrammatically?: boolean;
    force?: boolean;
}

class ElementStateTransaction extends CrossOriginTransaction<CrossOriginElementStateData, true> {
    type = Types.CrossOriginTransactionType.ElementState;

    static shouldSelfRespond = true;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<CrossOriginElementStateData, true>,
        owner: Window,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<true | undefined>,
        isSelfResponse?: boolean
    ): Promise<true> {
        const beginData = data['ah-begin-data'];

        if (beginData) {
            switch (beginData.state) {
                case CrossOriginElementState.Focused:
                    return ElementStateTransaction._makeFocusedResponse(ah, beginData, transactions, isSelfResponse);
                case CrossOriginElementState.Blurred:
                    return ElementStateTransaction._makeBlurredResponse(ah, beginData);
                case CrossOriginElementState.Observed:
                    return ElementStateTransaction._makeObservedResponse(ah, beginData);
            }
        }

        return true;
    }

    static createElement(ah: Types.AbilityHelpers, beginData: CrossOriginElementDataOut): CrossOriginElement | null {
        return beginData.uid
            ? new CrossOriginElement(
                ah,
                beginData.uid,
                beginData.ownerUId,
                beginData.id,
                beginData.rootUId,
                beginData.observedName,
                beginData.observedDetails)
            : null;
    }

    private static async _makeFocusedResponse(
        ah: Types.AbilityHelpers,
        beginData: CrossOriginElementStateData,
        transactions: CrossOriginTransactions,
        isSelfResponse?: boolean
    ): Promise<true> {
        const element = ElementStateTransaction.createElement(ah, beginData);

        if (beginData && (beginData.ownerUId) && element) {
            _focusOwner = beginData.ownerUId;
            _focusOwnerTimestamp = beginData.timestamp;

            if (!isSelfResponse && beginData.rootUId && beginData.deloserUId) {
                const history = DeloserAPI.getHistory(ah.deloser);

                const deloser: CrossOriginDeloser = {
                    ownerUId: beginData.ownerUId,
                    deloserUId: beginData.deloserUId,
                    rootUId: beginData.rootUId
                };

                const historyItem = history.make(
                    beginData.rootUId,
                    () => new CrossOriginDeloserHistoryByRoot(ah, deloser.rootUId, transactions)
                );

                historyItem.unshift(deloser);
            }

            CrossOriginFocusedElementState.setVal(
                ah.crossOrigin.focusedElement,
                element,
                { isFocusedProgrammatically: beginData.isFocusedProgrammatically }
            );
        }

        return true;
    }

    private static async _makeBlurredResponse(
        ah: Types.AbilityHelpers,
        beginData: CrossOriginElementStateData
    ): Promise<true> {
        if (
            beginData &&
            ((beginData.ownerUId === _focusOwner) || beginData.force) &&
            (!_focusOwnerTimestamp || (_focusOwnerTimestamp < beginData.timestamp))
        ) {
            CrossOriginFocusedElementState.setVal(ah.crossOrigin.focusedElement, undefined, {});
        }

        return true;
    }

    private static async _makeObservedResponse(
        ah: Types.AbilityHelpers,
        beginData: CrossOriginElementStateData
    ): Promise<true> {
        const name = beginData.observedName;
        const element = ElementStateTransaction.createElement(ah, beginData);

        if (name && element) {
            CrossOriginObservedElementState.trigger(
                ah.crossOrigin.observedElement,
                element,
                { name, details: beginData.observedDetails }
            );
        }

        return true;
    }
}

class GetElementTransaction extends CrossOriginTransaction<CrossOriginElementDataIn | undefined, CrossOriginElementDataOut> {
    type = Types.CrossOriginTransactionType.GetElement;

    static shouldSelfRespond = true;

    static findElement(ah: Types.AbilityHelpers, owner: Window, data?: CrossOriginElementDataIn): HTMLElement | null {
        let element: HTMLElement | null | undefined;

        if (data && (!data.ownerId || (data.ownerId === getWindowUId(owner)))) {
            if (data.id) {
                element = owner.document.getElementById(data.id);

                if (element && data.rootId) {
                    const ram = RootAPI.findRootAndModalizer(element);

                    if (!ram || (ram.root.uid !== data.rootId)) {
                        return null;
                    }
                }
            } else if (data.uid) {
                element = elementByUId[data.uid];
            } else if (data.observedName) {
                element = ah.observedElement.getElement(data.observedName);
            }
        }

        return element || null;
    }

    static getElementData(element: HTMLElement, owner: Window, ownerUId: string): CrossOriginElementDataOut {
        const deloser = DeloserAPI.getDeloser(element);
        const ram = RootAPI.findRootAndModalizer(element);
        const ah = getAbilityHelpersOnElement(element);
        const observed = ah && ah.observed;

        return {
            uid: getElementUId(element, owner),
            ownerUId,
            timestamp: Date.now(),
            id: element.id || undefined,
            rootUId: ram ? ram.root.uid : undefined,
            deloserUId: deloser ? getDeloserUID(deloser, owner) : undefined,
            observedName: observed && observed.name,
            observedDetails: observed && observed.details
        };
    }

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<CrossOriginElementDataIn | undefined, CrossOriginElementDataOut>,
        owner: Window,
        ownerUId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<CrossOriginElementDataOut | undefined>
    ): Promise<CrossOriginElementDataOut | undefined> {
        const beginData = data['ah-begin-data'];
        let element: HTMLElement | undefined;
        let dataOut: CrossOriginElementDataOut | undefined;

        if (beginData === undefined) {
            element = ah.focusedElement.getFocusedElement();
        } else if (beginData) {
            element = GetElementTransaction.findElement(ah, owner, beginData) || undefined;
        }

        if (!element && beginData) {
            const name = beginData.observedName;
            const timeout = data['ah-timeout'];

            if (name && timeout) {
                const e: {
                    element?: HTMLElement | null,
                    crossOrigin?: CrossOriginElementDataOut
                } = await (new Promise((resolve, reject) => {
                    let isWaitElementResolved = false;
                    let isForwardResolved = false;
                    let isResolved = false;

                    ah.observedElement.waitElement(name, timeout).then(value => {
                        isWaitElementResolved = true;

                        if (!isResolved && (value || isForwardResolved)) {
                            isResolved = true;
                            resolve({ element: value });
                        }
                    });

                    forwardResult.then(value => {
                        isForwardResolved = true;

                        if (!isResolved && (value || isWaitElementResolved)) {
                            isResolved = true;
                            resolve({ crossOrigin: value });
                        }
                    });
                }));

                if (e.element) {
                    element = e.element;
                } else if (e.crossOrigin) {
                    dataOut = e.crossOrigin;
                }
            }
        }

        return element
            ? GetElementTransaction.getElementData(element, owner, ownerUId)
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

class RestoreFocusInDeloserTransaction extends CrossOriginTransaction<RestoreFocusInDeloserTransactionData, boolean> {
    type = Types.CrossOriginTransactionType.RestoreFocusInDeloser;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<RestoreFocusInDeloserTransactionData, boolean>,
        owner: Window,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResult: Promise<boolean | undefined>
    ): Promise<boolean> {
        const forwardRet = await forwardResult;
        const begin = !forwardRet && data['ah-begin-data'];
        const uid = begin && begin.deloserUId;
        const deloser = uid && _deloserByUId[uid];

        if (begin && deloser) {
            const history = DeloserAPI.getHistory(ah.deloser);

            return begin.reset ? history.resetFocus(deloser) : history.focusAvailable(deloser);
        }

        return !!forwardRet;
    }
}

class PingTransaction extends CrossOriginTransaction<undefined, true> {
    type = Types.CrossOriginTransactionType.Ping;

    static shouldForward() {
        return false;
    }

    static async makeResponse(): Promise<true> {
        return true;
    }
}

interface CrossOriginTransactionWrapper<I, O> {
    transaction: CrossOriginTransaction<I, O>;
    timer: number;
}

class CrossOriginTransactions {
    private _owner: WindowWithUID;
    private _ownerUId: string;
    private _knownTargets: KnownTargets = {};
    private _transactions: { [id: string]: CrossOriginTransactionWrapper<any, any> } = {};
    private _ah: Types.AbilityHelpers;
    private _pingTimer: number | undefined;
    private _isPinging = false;
    private _isSetUp = false;
    sendUp: Types.CrossOriginTransactionSend | undefined;

    constructor(ah: Types.AbilityHelpers, owner: WindowWithUID) {
        this._ah = ah;
        this._owner = owner;
        this._ownerUId = getWindowUId(owner);
    }

    setup(sendUp?: Types.CrossOriginTransactionSend | null): (msg: Types.CrossOriginMessage) => void {
        if (this._isSetUp) {
            if (__DEV__) {
                console.error('CrossOrigin is already set up.');
            }
        } else {
            this._isSetUp = true;

            this.sendUp = sendUp || undefined;

            if (sendUp === undefined) {
                if (this._owner.document) {
                    if (this._owner.parent && (this._owner.parent !== this._owner) && this._owner.parent.postMessage) {
                        this.sendUp = (data: Types.CrossOriginTransactionData<any, any>) => {
                            this._owner.parent.postMessage(JSON.stringify(data), '*');
                        };
                    }

                    this._owner.addEventListener('message', this._onBrowserMessage);
                }
            }

            this._ping();
        }

        return this._onMessage;
    }

    dispose(): void {
        this._owner.removeEventListener('message', this._onBrowserMessage);
    }

    beginTransaction<I, O>(
        Transaction: CrossOriginTransactionClass<I, O>,
        value: I,
        timeout?: number,
        sentTo?: Types.CrossOriginSentTo,
        targetId?: string
    ): Promise<O | undefined> {
        const transaction = new Transaction(this._ah, this._owner, this._knownTargets, value, timeout, sentTo, targetId, this.sendUp);
        let selfResponse: ((data: Types.CrossOriginTransactionData<I, O>) => Promise<O | undefined>) | undefined;

        if (Transaction.shouldSelfRespond) {
            selfResponse = (data: Types.CrossOriginTransactionData<I, O>) => {
                return Transaction.makeResponse(
                    this._ah,
                    data,
                    this._owner,
                    this._ownerUId,
                    this,
                    Promise.resolve(undefined),
                    true
                );
            };
        }

        return this._beginTransaction(transaction, timeout, selfResponse);
    }

    private _beginTransaction<I, O>(
        transaction: CrossOriginTransaction<I, O>,
        timeout?: number,
        selfResponse?: (data: Types.CrossOriginTransactionData<I, O>) => Promise<O | undefined>
    ): Promise<O | undefined> {
        const wrapper: CrossOriginTransactionWrapper<I, O> = {
            transaction,
            timer: this._owner.setTimeout(() => {
                delete wrapper.timer;
                delete this._transactions[transaction.id];
                transaction.end('Cross origin transaction timed out.');
            }, _transactionTimeout + (timeout || 0))
        };

        this._transactions[transaction.id] = wrapper;

        return transaction.begin(selfResponse).finally(() => {
            this._owner.clearTimeout(wrapper.timer);
            delete this._transactions[transaction.id];
        });
    }

    forwardTransaction(data: Types.CrossOriginTransactionData<any, any>): Promise<any> {
        let targetId = data['ah-target'];

        if (targetId === this._ownerUId) {
            return Promise.resolve();
        }

        const Transaction = this._getTransactionClass(data['ah-type']);

        if (Transaction) {
            if ((Transaction.shouldForward === undefined) || (Transaction.shouldForward(this._ah, data, this._owner, this._ownerUId))) {
                const sentTo = data['ah-sentto'];

                if (targetId === _targetIdUp) {
                    targetId = undefined;
                    sentTo[this._ownerUId] = true;
                }

                delete sentTo[_targetIdUp];

                return this._beginTransaction(
                    new Transaction(
                        this._ah,
                        this._owner,
                        this._knownTargets,
                        data['ah-begin-data'],
                        data['ah-timeout'],
                        sentTo,
                        targetId,
                        this.sendUp
                    ),
                    data['ah-timeout']
                );
            } else {
                return Promise.resolve();
            }
        }

        return Promise.reject(`Unknown transaction type ${ data['ah-type'] }`);
    }

    private _getTransactionClass(type: Types.CrossOriginTransactionType): CrossOriginTransactionClass<any, any> | null {
        switch (type) {
            case Types.CrossOriginTransactionType.Bootstrap:
                return BootstrapTransaction;
            case Types.CrossOriginTransactionType.KeyboardNavigationState:
                return KeyboardNavigationStateTransaction;
            case Types.CrossOriginTransactionType.FocusElement:
                return FocusElementTransaction;
            case Types.CrossOriginTransactionType.ElementState:
                return ElementStateTransaction;
            case Types.CrossOriginTransactionType.GetElement:
                return GetElementTransaction;
            case Types.CrossOriginTransactionType.RestoreFocusInDeloser:
                return RestoreFocusInDeloserTransaction;
            case Types.CrossOriginTransactionType.Ping:
                return PingTransaction;
            default:
                return null;
        }
    }

    private _onMessage = (e: Types.CrossOriginMessage) => {
        if (e.data['ah-owner'] === this._ownerUId) {
            return;
        }

        let data: Types.CrossOriginTransactionData<any, any> = e.data;
        let transactionId: string;

        if (
            !data ||
            !((transactionId = data['ah-transaction'])) ||
            !data['ah-type'] ||
            !data['ah-timestamp'] ||
            !data['ah-owner'] ||
            !data['ah-sentto']
        ) {
            return;
        }

        if (!(data['ah-owner'] in this._knownTargets) && e.send && (data['ah-owner'] !== this._ownerUId)) {
            this._knownTargets[data['ah-owner']] = { send: e.send };
        }

        if (data['ah-is-response']) {
            const t = this._transactions[transactionId];

            if (t && t.transaction && (t.transaction.type === data['ah-type'])) {
                t.transaction.onResponse(data);
            }
        } else {
            const Transaction = this._getTransactionClass(data['ah-type']);

            const forwardResult = this.forwardTransaction(data);

            if (Transaction && e.send) {
                Transaction.makeResponse(this._ah, data, this._owner, this._ownerUId, this, forwardResult, false).then(r => {
                    const response: Types.CrossOriginTransactionData<any, any> = {
                        ['ah-transaction']: data['ah-transaction'],
                        ['ah-type']: data['ah-type'],
                        ['ah-is-response']: true,
                        ['ah-timestamp']: Date.now(),
                        ['ah-owner']: this._ownerUId,
                        ['ah-timeout']: data['ah-timeout'],
                        ['ah-sentto']: {},
                        ['ah-target']: (data['ah-target'] === _targetIdUp) ? _targetIdUp : data['ah-owner'],
                        ['ah-end-data']: r
                    };

                    e.send(response);
                });
            }
        }
    }

    private async _ping(): Promise<void> {
        if (this._pingTimer || this._isPinging) {
            return;
        }

        this._isPinging = true;
        let hasDeadWindow = false;
        const targets = Object.keys(this._knownTargets);
        targets.push(_targetIdUp);

        for (let uid of targets) {
            const ret = await this.beginTransaction(PingTransaction, undefined, undefined, undefined, uid).then(() => true, () => false);

            if (!ret) {
               hasDeadWindow = true;
               delete this._knownTargets[uid];
            }
        }

        if (hasDeadWindow) {
            const focused = await this.beginTransaction(GetElementTransaction, undefined);

            if (!focused) {
                await this.beginTransaction(ElementStateTransaction, {
                    ownerUId: this._ownerUId,
                    timestamp: Date.now(),
                    state: CrossOriginElementState.Blurred,
                    force: true
                });

                DeloserAPI.forceRestoreFocus(this._ah.deloser);
            }
        }

        this._isPinging = false;

        this._pingTimer = this._owner.setTimeout(() => {
            this._pingTimer = undefined;
            this._ping();
        }, 3000);
    }

    private _onBrowserMessage = (e: MessageEvent) => {
        if (e.source === this._owner) {
            return;
        }

        const send = (data: Types.CrossOriginTransactionData<any, any>) => {
            if (e.source && e.source.postMessage) {
                (e.source.postMessage as Function)(JSON.stringify(data), '*');
            }
        };

        try {
            this._onMessage({
                data: JSON.parse(e.data),
                send
            });
        } catch (e) { /* Ignore */ }
    }
}

export class CrossOriginElement implements Types.CrossOriginElement {
    private _ah: Types.AbilityHelpers;
    readonly uid: string;
    readonly ownerId: string;
    readonly id?: string;
    readonly rootId?: string;
    readonly observedName?: string;
    readonly observedDetails?: string;

    constructor(
        ah: Types.AbilityHelpers,
        uid: string,
        ownerId: string,
        id?: string,
        rootId?: string,
        observedName?: string,
        observedDetails?: string
    ) {
        this._ah = ah;
        this.uid = uid;
        this.ownerId = ownerId;
        this.id = id;
        this.rootId = rootId;
        this.observedName = observedName;
        this.observedDetails = observedDetails;
    }

    focus(noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): Promise<boolean> {
        return this._ah.crossOrigin.focusedElement.focus(this, noFocusedProgrammaticallyFlag, noAccessibleCheck);
    }
}

export class CrossOriginFocusedElementState
        extends Subscribable<CrossOriginElement | undefined, Types.FocusedElementDetails>
        implements Types.CrossOriginFocusedElementState {

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
        return this._transactions.beginTransaction(FocusElementTransaction, {
            uid: element.uid,
            id: element.id,
            rootId: element.rootId,
            ownerId: element.ownerId,
            observedName: element.observedName,
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck
        }).then(value => !!value);
    }

    async focusById(
        elementId: string,
        rootId?: string,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean> {
        return this._transactions.beginTransaction(FocusElementTransaction, {
            id: elementId,
            rootId,
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck
        }).then(value => !!value);
    }

    async focusByObservedName(
        observedName: string,
        timeout?: number,
        rootId?: string,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean> {
        return this._transactions.beginTransaction(FocusElementTransaction, {
            observedName,
            rootId,
            noFocusedProgrammaticallyFlag,
            noAccessibleCheck
        }, timeout).then(value => !!value);
    }

    static setVal(
        instance: Types.CrossOriginFocusedElementState,
        val: CrossOriginElement | undefined,
        details: Types.FocusedElementDetails
    ): void {
        (instance as CrossOriginFocusedElementState).setVal(val, details);
    }
}

export class CrossOriginObservedElementState
        extends Subscribable<CrossOriginElement, Types.ObservedElementBasicProps>
        implements Types.CrossOriginObservedElementState {

    private _ah: Types.AbilityHelpers;
    private _transactions: CrossOriginTransactions;
    private _lastRequestFocusId = 0;

    constructor(ah: Types.AbilityHelpers, transactions: CrossOriginTransactions) {
        super();
        this._ah = ah;
        this._transactions = transactions;
    }

    async getElement(observedName: string): Promise<CrossOriginElement | null> {
        return this.waitElement(observedName, 0);
    }

    async waitElement(observedName: string, timeout: number): Promise<CrossOriginElement | null> {
        return this._transactions.beginTransaction(GetElementTransaction, {
            observedName: observedName
        }, timeout).then(value => value ? ElementStateTransaction.createElement(this._ah, value) : null);
    }

    async requestFocus(observedName: string, timeout: number): Promise<boolean> {
        let requestId = ++this._lastRequestFocusId;
        return this.waitElement(observedName, timeout).then(element => ((this._lastRequestFocusId === requestId) && element)
            ? this._ah.crossOrigin.focusedElement.focus(element)
            : false
        );
    }

    static trigger(
        instance: Types.CrossOriginObservedElementState,
        element: CrossOriginElement,
        details: Types.ObservedElementBasicProps
    ): void {
        (instance as CrossOriginObservedElementState).trigger(element, details);
    }
}

export class CrossOriginAPI implements Types.CrossOriginAPI {
    private _ah: Types.AbilityHelpers;
    private _initTimer: number | undefined;
    private _mainWindow: WindowWithUID;
    private _transactions: CrossOriginTransactions;
    private _blurTimer: number | undefined;

    focusedElement: Types.CrossOriginFocusedElementState;
    observedElement: Types.CrossOriginObservedElementState;

    constructor(ah: Types.AbilityHelpers, mainWindow: Window) {
        this._ah = ah;
        this._mainWindow = mainWindow;
        this._transactions = new CrossOriginTransactions(ah, mainWindow);
        this.focusedElement = new CrossOriginFocusedElementState(this._transactions);
        this.observedElement = new CrossOriginObservedElementState(ah, this._transactions);
    }

    setup(sendUp?: Types.CrossOriginTransactionSend | null): (msg: Types.CrossOriginMessage) => void {
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
        return this._transactions.setup(sendUp);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._ah.keyboardNavigation.subscribe(this._onKeyboardNavigationStateChanged);
        this._ah.focusedElement.subscribe(this._onElementFocused);
        this._ah.observedElement.subscribe(this._onObserved);

        this._transactions.beginTransaction(BootstrapTransaction, undefined, undefined, undefined, _targetIdUp).then(data => {
            if (data && (this._ah.keyboardNavigation.isNavigatingWithKeyboard() !== data.isNavigatingWithKeyboard)) {
                _ignoreKeyboardNavigationStateUpdate = true;
                KeyboardNavigationState.setVal(this._ah.keyboardNavigation, data.isNavigatingWithKeyboard);
                _ignoreKeyboardNavigationStateUpdate = false;
            }
        });
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._ah.keyboardNavigation.unsubscribe(this._onKeyboardNavigationStateChanged);

        this._transactions.dispose();
    }

    private _onKeyboardNavigationStateChanged = (value: boolean): void => {
        if (!_ignoreKeyboardNavigationStateUpdate) {
            this._transactions.beginTransaction(KeyboardNavigationStateTransaction, value);
        }
    }

    private _onElementFocused = (element: HTMLElementWithUID | undefined, details: Types.FocusedElementDetails): void => {
        let ownerUId = getWindowUId(this._mainWindow);

        if (this._blurTimer) {
            this._mainWindow.clearTimeout(this._blurTimer);
            this._blurTimer = undefined;
        }

        if (element) {
            this._transactions.beginTransaction(
                ElementStateTransaction,
                GetElementTransaction.getElementData(element, this._mainWindow, ownerUId)
            );
        } else if (_focusOwner && (_focusOwner === ownerUId)) {
            this._blurTimer = this._mainWindow.setTimeout(() => {
                this._blurTimer = undefined;

                this._transactions.beginTransaction(GetElementTransaction, undefined).then(value => {
                    if (!value) {
                        this._transactions.beginTransaction(ElementStateTransaction, {
                            ownerUId,
                            timestamp: Date.now(),
                            state: CrossOriginElementState.Blurred,
                            force: false
                        });
                    }
                });
            }, 0);
        }
    }

    private _onObserved = (element: HTMLElement, details: Types.ObservedElementBasicProps): void => {
        const d = GetElementTransaction.getElementData(
            element,
            this._mainWindow,
            getWindowUId(this._mainWindow)
        ) as CrossOriginElementStateData;

        d.state = CrossOriginElementState.Observed;
        d.observedName = details.name;
        d.observedDetails = details.details;

        this._transactions.beginTransaction(ElementStateTransaction, d);
    }
}

function getDeloserUID(deloser: Types.Deloser, window: Window): string {
    const uid = getElementUId(deloser.getElement(), window);

    if (!_deloserByUId[uid]) {
        _deloserByUId[uid] = deloser;
    }

    return uid;
}
