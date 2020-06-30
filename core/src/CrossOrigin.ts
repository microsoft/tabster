/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DeloserAPI, DeloserHistoryByRootBase, DeloserItemBase } from './Deloser';
import { KeyboardNavigationState } from './State/KeyboardNavigation';
import { RootAPI } from './Root';
import { Subscribable } from './State/Subscribable';
import * as Types from './Types';
import { getElementUId as getElementUIDBase, getUId, getWindowUId, HTMLElementWithUID, WindowWithUID } from './Utils';

const _transactionTimeout = 1500;

const _targetIdUp = 'up';

let _ignoreKeyboardNavigationStateUpdate = false;
let _focusOwner: string | undefined;
let _focusOwnerTimestamp: number | undefined;
const _crossOriginDeloserMap: { [uid: string]: Types.Deloser } = {};
const _crossOriginElementMap: { [uid: string]: HTMLElementWithUID } = {};

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
    private _sent = 0;
    private _deliveded = 0;

    constructor(
        ah: Types.AbilityHelpers,
        owner: WindowWithUID,
        knownTargets: KnownTargets,
        value: I,
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

    begin(before?: (data: Types.CrossOriginTransactionData<I, O>) => Promise<any>): Promise<O | undefined> {
        const targets = this.getTargets(this._knownTargets);

        if (!targets) {
            this.end();
            return this._promise;
        }

        const sentTo: Types.CrossOriginSentTo = { ...this._sentTo };

        for (let id of Object.keys(targets)) {
            sentTo[id] = true;
        }

        const data: Types.CrossOriginTransactionData<I, O> = {
            ['ah-transaction']: this.id,
            ['ah-type']: this.type,
            ['ah-is-response']: false,
            ['ah-timestamp']: Date.now(),
            ['ah-owner']: this.ownerId,
            ['ah-sentto']: sentTo,
            ['ah-begin-data']: this.beginData
        };

        if (this.targetId) {
            data['ah-target'] = this.targetId;
        }

        const send = () => {
            let isSent = false;

            for (let id of Object.keys(targets)) {
                if (!(id in this._sentTo)) {
                    isSent = true;
                    this._send(targets[id].send, id, data);
                }
            }

            if (!isSent) {
                this.end();
            }
        };

        if (before) {
            before(data).then(send);
        } else {
            send();
        }

        return this._promise;
    }

    private _send(
        send: (data: Types.CrossOriginTransactionData<I, O>) => void,
        targetId: string,
        data: Types.CrossOriginTransactionData<I, O>
    ) {
        if (this._inProgress[targetId] === undefined) {
            this._sent++;
            this._inProgress[targetId] = true;

            send(data);
        }
    }

    protected end(): void {
        if (this._isDone) {
            return;
        }

        if (!this.isSuccessful()) {
            this.reject('No successful targets.');
        } else if (this._resolve) {
            this._isDone = true;
            this._resolve(this.endData);
        }
    }

    reject(reason: string) {
        if (this._isDone) {
            return;
        }

        this._isDone = true;

        if (this._reject) {
            this._reject(reason);
        }
    }

    onResponse(data: Types.CrossOriginTransactionData<I, O>): void {
        if (data['ah-end-data'] !== undefined) {
            this.endData = data['ah-end-data'];
        }

        const inProgressId = (data['ah-target'] === _targetIdUp) ? _targetIdUp : data['ah-owner'];

        if (this._inProgress[inProgressId]) {
            this._inProgress[inProgressId] = false;

            this._deliveded++;

            if (this.isSuccessful()) {
                this.end();
            }
        }
    }

    isDone(): boolean {
        return this._isDone;
    }

    isSuccessful(): boolean {
        return (this._sent === 0) || (this._deliveded > 0);
    }
}

interface CrossOriginTransactionClass<I, O> {
    new (
        ah: Types.AbilityHelpers,
        owner: WindowWithUID,
        knownTargets: KnownTargets,
        value: I,
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
        forwardResponse?: O,
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

interface FocusElementData {
    uid?: string;
    id?: string;
    rootId?: string;
    ownerId?: string;
}

class FocusElementTransaction extends CrossOriginTransaction<FocusElementData, true> {
    type = Types.CrossOriginTransactionType.FocusElement;

    begin(before?: (data: Types.CrossOriginTransactionData<FocusElementData, true>) => Promise<any>): Promise<true | undefined> {
        const el = FocusElementTransaction.findElement(this.ah, this.owner, this.beginData);

        if (el && this.ah.focusedElement.focus(el)) {
            this.end();
            return Promise.resolve(true);
        }

        return super.begin(before);
    }

    static findElement(ah: Types.AbilityHelpers, owner: Window, data?: FocusElementData): HTMLElement | null {
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
                element = _crossOriginElementMap[data.uid];
            }
        }

        return element || null;
    }

    static shouldForward(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<FocusElementData, true>,
        owner: Window,
        ownerId: string
    ): boolean {
        const el = FocusElementTransaction.findElement(ah, owner, data['ah-begin-data']);
        return (el && ah.focusedElement.focus(el)) ? false : true;
    }

    static async makeResponse(): Promise<true> {
        return true;
    }
}

interface FocusedElementStateData {
    uid: string;
    ownerUId: string;
    timestamp: number;
    id?: string;
    rootUId?: string;
    deloserUId?: string;
    isFocusedProgrammatically?: boolean;
}

class FocusedElementStateTransaction extends CrossOriginTransaction<FocusedElementStateData, true> {
    type = Types.CrossOriginTransactionType.FocusedElementState;

    static shouldSelfRespond = true;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<FocusedElementStateData, true>,
        owner: Window,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResponse?: true,
        isSelfResponse?: boolean
    ): Promise<true> {
        const beginData = data['ah-begin-data'];

        if (beginData && (beginData.ownerUId)) {
            _focusOwner = beginData.ownerUId;
            _focusOwnerTimestamp = beginData.timestamp;

            const element = new CrossOriginElement(ah, null, beginData.uid, beginData.ownerUId, beginData.id, beginData.rootUId);

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
}

interface BlurredElementStateData {
    ownerId: string;
    timestamp: number;
    force: boolean;
}

class BlurredElementStateTransaction extends CrossOriginTransaction<BlurredElementStateData, true> {
    type = Types.CrossOriginTransactionType.BlurredElementState;

    static shouldSelfRespond = true;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<BlurredElementStateData, true>
    ): Promise<true> {
        const beginData = data['ah-begin-data'];

        if (
            beginData &&
            ((beginData.ownerId === _focusOwner) || beginData.force) &&
            (!_focusOwnerTimestamp || (_focusOwnerTimestamp < beginData.timestamp))
        ) {
            CrossOriginFocusedElementState.setVal(ah.crossOrigin.focusedElement, undefined, {});
        }

        return true;
    }
}

class GetFocusedElementTransaction extends CrossOriginTransaction<undefined, FocusedElementStateData> {
    type = Types.CrossOriginTransactionType.GetFocusedElement;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: Types.CrossOriginTransactionData<undefined, FocusedElementStateData>,
        owner: Window,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwarded: FocusedElementStateData | undefined
    ): Promise<FocusedElementStateData | undefined> {
        const focused = ah.focusedElement.getFocusedElement();

        if (focused) {
            const deloser = DeloserAPI.getDeloser(focused);
            const ram = RootAPI.findRootAndModalizer(focused);

            return {
                uid: getElementUID(focused, owner),
                ownerUId: ownerId,
                timestamp: Date.now(),
                id: focused.id,
                rootUId: ram ? ram.root.uid : undefined,
                deloserUId: deloser ? getDeloserUID(deloser, owner) : undefined,
            };
        }

        return forwarded;
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
        forwarded: boolean | undefined
    ): Promise<boolean> {
        const begin = !forwarded && data['ah-begin-data'];
        const uid = begin && begin.deloserUId;
        const deloser = uid && _crossOriginDeloserMap[uid];

        if (begin && deloser) {
            const history = DeloserAPI.getHistory(ah.deloser);

            return begin.reset ? history.resetFocus(deloser) : history.focusAvailable(deloser);
        }

        return !!forwarded;
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
    timeout: number;
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
        sentTo?: Types.CrossOriginSentTo,
        targetId?: string
    ): Promise<O | undefined> {
        const transaction = new Transaction(this._ah, this._owner, this._knownTargets, value, sentTo, targetId, this.sendUp);
        let before: ((data: Types.CrossOriginTransactionData<I, O>) => Promise<any>) | undefined;

        if (Transaction.shouldSelfRespond) {
            before = (data: Types.CrossOriginTransactionData<I, O>) => {
                return Transaction.makeResponse(this._ah, data, this._owner, this._ownerUId, this, data['ah-end-data'], true);
            };
        }

        return this._beginTransaction(transaction, before);
    }

    private _beginTransaction<I, O>(
        transaction: CrossOriginTransaction<I, O>,
        before?: (data: Types.CrossOriginTransactionData<I, O>) => Promise<any>
    ): Promise<O | undefined> {
        const wrapper: CrossOriginTransactionWrapper<I, O> = {
            transaction,
            timeout: this._owner.setTimeout(() => {
                delete wrapper.timeout;
                delete this._transactions[transaction.id];

                if (!transaction.isDone() && !transaction.isSuccessful()) {
                    transaction.reject('Cross origin transaction timed out.');
                }
            }, _transactionTimeout)
        };

        this._transactions[transaction.id] = wrapper;

        return transaction.begin(before).finally(() => {
            this._owner.clearTimeout(wrapper.timeout);
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
                        sentTo,
                        targetId,
                        this.sendUp
                    )
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
            case Types.CrossOriginTransactionType.FocusedElementState:
                return FocusedElementStateTransaction;
            case Types.CrossOriginTransactionType.BlurredElementState:
                return BlurredElementStateTransaction;
            case Types.CrossOriginTransactionType.GetFocusedElement:
                return GetFocusedElementTransaction;
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

            if (t.transaction.type === data['ah-type']) {
                t.transaction.onResponse(data);
            }
        } else {
            const Transaction = this._getTransactionClass(data['ah-type']);

            this.forwardTransaction(data).then(value => {
                if (Transaction && e.send) {
                    Transaction.makeResponse(this._ah, data, this._owner, this._ownerUId, this, value, false).then(r => {
                        const response: Types.CrossOriginTransactionData<any, any> = {
                            ['ah-transaction']: data['ah-transaction'],
                            ['ah-type']: data['ah-type'],
                            ['ah-is-response']: true,
                            ['ah-timestamp']: Date.now(),
                            ['ah-owner']: this._ownerUId,
                            ['ah-sentto']: {},
                            ['ah-target']: (data['ah-target'] === _targetIdUp) ? _targetIdUp : data['ah-owner'],
                            ['ah-end-data']: r
                        };

                        e.send(response);
                    });
                }
            });
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
            const ret = await this.beginTransaction(PingTransaction, undefined, undefined, uid).then(() => true, () => false);

            if (!ret) {
               hasDeadWindow = true;
               delete this._knownTargets[uid];
            }
        }

        if (hasDeadWindow) {
            const focused = await this.beginTransaction(GetFocusedElementTransaction, undefined);

            if (!focused) {
                await this.beginTransaction(BlurredElementStateTransaction, {
                    ownerId: this._ownerUId,
                    timestamp: Date.now(),
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
    private _element: HTMLElement | null;
    readonly uid: string;
    readonly ownerId: string;
    readonly id?: string;
    readonly rootId?: string;

    constructor(ah: Types.AbilityHelpers, element: HTMLElement | null, uid: string, ownerId: string, id?: string, rootId?: string) {
        this._ah = ah;
        this._element = element;
        this.uid = uid;
        this.ownerId = ownerId;
        this.id = id;
        this.rootId = rootId;
    }

    focus(noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): Promise<boolean> {
        return this._ah.crossOrigin.focusedElement.focus(this, noFocusedProgrammaticallyFlag, noAccessibleCheck);
    }

    getHTMLElement(): HTMLElement | null {
        return this._element;
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

    focus(element: Types.CrossOriginElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        });
    }

    focusById(elementId: string, rootId?: string, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): Promise<boolean> {
        return this._transactions.beginTransaction(FocusElementTransaction, { id: elementId, rootId }).then(value => {
            return !!value;
        });
    }

        // getFocusedElement(): Types.CrossOriginElement | undefined {
    //     return undefined;
    // }

    // getLastFocusedElement(): Types.CrossOriginElement | undefined {
    //     return undefined;
    // }

    // getPrevFocusedElement(): Types.CrossOriginElement | undefined {
    //     return undefined;
    // }

    // focusDefault(container: Types.CrossOriginElement): Promise<boolean> {
    //     return new Promise<boolean>((resolve, reject) => {
    //         resolve(false);
    //     });
    // }

    // focusFirst(container: Types.CrossOriginElement): Promise<boolean> {
    //     return new Promise<boolean>((resolve, reject) => {
    //         resolve(false);
    //     });
    // }

    // resetFocus(container: Types.CrossOriginElement): Promise<boolean> {
    //     return new Promise<boolean>((resolve, reject) => {
    //         resolve(false);
    //     });
    // }

    // isFocusable(
    //     element: Types.CrossOriginElement,
    //     includeProgrammaticallyFocusable?: boolean,
    //     noVisibleCheck?: boolean,
    //     noAccessibleCheck?: boolean
    // ): Promise<boolean> {
    //     return new Promise<boolean>((resolve, reject) => {
    //         resolve(false);
    //     });
    // }

    // isVisible(element: Types.CrossOriginElement): Promise<boolean> {
    //     return new Promise<boolean>((resolve, reject) => {
    //         resolve(false);
    //     });
    // }

    // isAccessible(element: Types.CrossOriginElement): Promise<boolean> {
    //     return new Promise<boolean>((resolve, reject) => {
    //         resolve(false);
    //     });
    // }

    static setVal(
        instance: Types.CrossOriginFocusedElementState,
        val: CrossOriginElement | undefined,
        details: Types.FocusedElementDetails
    ): void {
        (instance as CrossOriginFocusedElementState).setVal(val, details);
    }
}

export class CrossOriginAPI implements Types.CrossOriginAPI {
    private _ah: Types.AbilityHelpers;
    private _initTimer: number | undefined;
    private _mainWindow: WindowWithUID;
    private _transactions: CrossOriginTransactions;
    private _blurTimer: number | undefined;

    focusedElement: Types.CrossOriginFocusedElementState;

    constructor(ah: Types.AbilityHelpers, mainWindow: Window) {
        this._ah = ah;
        this._mainWindow = mainWindow;
        this._transactions = new CrossOriginTransactions(ah, mainWindow);
        this.focusedElement = new CrossOriginFocusedElementState(this._transactions);
    }

    setup(sendUp?: Types.CrossOriginTransactionSend | null): (msg: Types.CrossOriginMessage) => void {
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
        return this._transactions.setup(sendUp);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._ah.keyboardNavigation.subscribe(this._onKeyboardNavigationStateChanged);
        this._ah.focusedElement.subscribe(this._onElementFocused);

        this._transactions.beginTransaction(BootstrapTransaction, undefined, undefined, _targetIdUp).then(data => {
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

    private _onElementFocused = (value: HTMLElementWithUID | undefined, details: Types.FocusedElementDetails): void => {
        let ownerId = getWindowUId(this._mainWindow);

        if (this._blurTimer) {
            this._mainWindow.clearTimeout(this._blurTimer);
            this._blurTimer = undefined;
        }

        if (value) {
            const deloser = DeloserAPI.getDeloser(value);
            const ram = RootAPI.findRootAndModalizer(value);

            const fed: FocusedElementStateData = {
                uid: getElementUID(value, this._mainWindow),
                ownerUId: ownerId,
                timestamp: Date.now(),
                id: value.id || undefined,
                rootUId: ram ? ram.root.uid : undefined,
                deloserUId: deloser ? getDeloserUID(deloser, this._mainWindow) : undefined,
                isFocusedProgrammatically: details.isFocusedProgrammatically
            };

            this._transactions.beginTransaction(FocusedElementStateTransaction, fed);
        } else if (_focusOwner && (_focusOwner === ownerId)) {
            this._blurTimer = this._mainWindow.setTimeout(() => {
                this._blurTimer = undefined;

                this._transactions.beginTransaction(GetFocusedElementTransaction, undefined).then(value => {
                    if (!value) {
                        this._transactions.beginTransaction(BlurredElementStateTransaction, {
                            ownerId,
                            timestamp: Date.now(),
                            force: false
                        });
                    }
                });
            }, 0);
        }
    }

    findElement(locator: Types.CrossOriginElementLocator): Promise<Types.CrossOriginElement | null> {
        return new Promise<Types.CrossOriginElement | null>((resolve, reject) => {
            resolve(null);
        });
    }
}

function getDeloserUID(deloser: Types.Deloser, window: Window): string {
    const uid = getElementUIDBase(deloser.getElement(), window);

    if (!_crossOriginDeloserMap[uid]) {
        _crossOriginDeloserMap[uid] = deloser;
    }

    return uid;
}

function getElementUID(element: HTMLElementWithUID, window: Window): string {
    const uid = getElementUIDBase(element, window);

    if (!_crossOriginElementMap[uid]) {
        _crossOriginElementMap[uid] = element;
    }

    return uid;
}
