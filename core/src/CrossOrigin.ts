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

const _transactionTimeout = 1000;
const _postMessageTimeout = 500;

let _ignoreKeyboardNavigationStateUpdate = false;
let _focusOwner: string | undefined;
let _focusOwnerTimestamp: number | undefined;
const _crossOriginDeloserMap: { [uid: string]: Types.Deloser } = {};
const _crossOriginElementMap: { [uid: string]: HTMLElementWithUID } = {};

interface KnownWindows {
    [id: string]: {
        window: Window;
        timeout?: number;
    };
}

interface SentTo {
    [id: string]: true;
}

enum CrossOriginTransactionType {
    Bootstrap = 1,
    KeyboardNavigationState = 2,
    FocusElement = 3,
    FocusedElementState = 4,
    BlurredElementState = 5,
    GetFocusedElement = 6,
    RestoreFocusInDeloser = 7,
    Ping = 8
}

interface CrossOriginTransactionData<I, O> {
    ['ah-transaction']: string;
    ['ah-type']: CrossOriginTransactionType;
    ['ah-timestamp']: number;
    ['ah-owner']: string;
    ['ah-sentto']: SentTo;
    ['ah-target']?: string;
    ['ah-begin-data']?: I;
    ['ah-end-data']?: O;
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
    abstract type: CrossOriginTransactionType;
    readonly id: string;
    readonly beginData: I;
    protected ah: Types.AbilityHelpers;
    protected endData: O | undefined;
    protected owner: Window;
    protected ownerId: string;
    private _promise: Promise<O>;
    protected _resolve: ((endData?: O) => void) | undefined;
    private _reject: ((reason: string) => void) | undefined;
    private _knownWindows: KnownWindows;
    private _sentTo: SentTo;
    protected targetId: string | undefined;
    private _inProgress: { [id: string]: number } = {};
    private _isDone = false;

    constructor(ah: Types.AbilityHelpers, owner: WindowWithUID, knownWindows: KnownWindows, value: I, sentTo?: SentTo, targetId?: string) {
        this.ah = ah;
        this.owner = owner;
        this.ownerId = getWindowUId(owner);
        this.id = getUId(owner);
        this.beginData = value;
        this._knownWindows = knownWindows;
        this._sentTo = sentTo || { [this.ownerId]: true };
        this.targetId = targetId;
        this._promise = new Promise<O>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    protected getWindows(knownWindows: KnownWindows): KnownWindows | null {
        return knownWindows;
    }

    begin(before?: (data: CrossOriginTransactionData<I, O>) => Promise<any>): Promise<O | undefined> {
        const windows = this.getWindows(this._knownWindows);

        if (!windows) {
            this.end();
            return this._promise;
        }

        const sentTo: SentTo = { ...this._sentTo };

        for (let id of Object.keys(windows)) {
            sentTo[id] = true;
        }

        const data: CrossOriginTransactionData<I, O> = {
            ['ah-transaction']: this.id,
            ['ah-type']: this.type,
            ['ah-timestamp']: Date.now(),
            ['ah-owner']: this.ownerId,
            ['ah-sentto']: sentTo,
            ['ah-begin-data']: this.beginData
        };

        if (this.targetId) {
            data['ah-target'] = this.targetId;
        }

        let message: string | undefined;

        const post = () => {
            for (let id of Object.keys(windows)) {
                if (!(id in this._sentTo)) {
                    if (!message) {
                        message  = JSON.stringify(data);
                    }

                    this._postMessage(windows[id].window, id, message);
                }
            }

            if (!message) {
                this.end();
            }
        };

        if (before) {
            before(data).then(() => post());
        } else {
            post();
        }

        return this._promise;
    }

    private _postMessage(target: Window, targetId: string, message: string) {
        if (!this._inProgress[targetId]) {
            if (target && target.postMessage) {
                target.postMessage(message, '*');
            }

            this._inProgress[targetId] = this.owner.setTimeout(() => {
                delete this._inProgress[targetId];

                console.error(84848, 'timeout', targetId);

                if (!this._isDone && (Object.keys(this._inProgress).length === 0)) {
                    this.end();
                }
            }, _postMessageTimeout);
        }
    }

    protected end(): void {
        if (this._isDone) {
            return;
        }

        this._isDone = true;

        if (this._resolve) {
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

    onMessage(data: CrossOriginTransactionData<I, O>): void {
        if (data['ah-end-data']) {
            this.endData = data['ah-end-data'];
        }

        const id = data['ah-owner'];

        if (this._inProgress[id]) {
            this.owner.clearTimeout(this._inProgress[id]);

            delete this._inProgress[id];

            if (!this._isDone && (Object.keys(this._inProgress).length === 0)) {
                this.end();
            }
        }
    }

    isDone(): boolean {
        return this._isDone;
    }
}

interface CrossOriginTransactionClass<I, O> {
    new (
        ah: Types.AbilityHelpers,
        owner: WindowWithUID,
        knownWindows: KnownWindows,
        value: I,
        sentTo?: SentTo,
        targetId?: string
    ): CrossOriginTransaction<I, O>;
    shouldForward?(ah: Types.AbilityHelpers, data: CrossOriginTransactionData<I, O>, owner: Window, ownerId: string): boolean;
    makeResponse(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<I, O>,
        owner: Window,
        ownerId: string,
        transactions: CrossOriginTransactions,
        forwardResponse?: O,
        isSelfResponse?: boolean
    ): Promise<O>;
    makeSelfResponse?: boolean;
}

interface BootstrapTransactionContents {
    isNavigatingWithKeyboard: boolean;
}

class BootstrapTransaction extends CrossOriginTransaction<undefined, BootstrapTransactionContents> {
    type = CrossOriginTransactionType.Bootstrap;

    static shouldForward() {
        return false;
    }

    protected getWindows(knownWindows: KnownWindows): KnownWindows {
        return this.owner.parent && (this.owner.parent !== this.owner)
            ? { 'parent': { window: this.owner.parent } }
            : {};
    }

    static async makeResponse(ah: Types.AbilityHelpers): Promise<BootstrapTransactionContents> {
        return { isNavigatingWithKeyboard: ah.keyboardNavigation.isNavigatingWithKeyboard() };
    }
}

class KeyboardNavigationStateTransaction extends CrossOriginTransaction<boolean, true> {
    type = CrossOriginTransactionType.KeyboardNavigationState;

    static async makeResponse(ah: Types.AbilityHelpers, data: CrossOriginTransactionData<boolean, true>): Promise<true> {
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
    type = CrossOriginTransactionType.FocusElement;

    begin(before?: (data: CrossOriginTransactionData<FocusElementData, true>) => Promise<any>): Promise<true | undefined> {
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
        data: CrossOriginTransactionData<FocusElementData, true>,
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
    type = CrossOriginTransactionType.FocusedElementState;

    static makeSelfResponse = true;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<FocusedElementStateData, true>,
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

                console.error(77778, owner.document, history);
            }

            CrossOriginAPI.setVal(ah.crossOrigin, element, { isFocusedProgrammatically: beginData.isFocusedProgrammatically });
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
    type = CrossOriginTransactionType.BlurredElementState;

    static makeSelfResponse = true;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<BlurredElementStateData, true>
    ): Promise<true> {
        const beginData = data['ah-begin-data'];

        if (
            beginData &&
            ((beginData.ownerId === _focusOwner) || beginData.force) &&
            (!_focusOwnerTimestamp || (_focusOwnerTimestamp < beginData.timestamp))
        ) {
            CrossOriginAPI.setVal(ah.crossOrigin, undefined, {});
        }

        return true;
    }
}

class GetFocusedElementTransaction extends CrossOriginTransaction<undefined, FocusedElementStateData> {
    type = CrossOriginTransactionType.GetFocusedElement;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<undefined, FocusedElementStateData>,
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
    type = CrossOriginTransactionType.RestoreFocusInDeloser;

    static async makeResponse(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<RestoreFocusInDeloserTransactionData, boolean>,
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
    type = CrossOriginTransactionType.Ping;

    protected getWindows(knownWindows: KnownWindows): KnownWindows {
        return (this.targetId && knownWindows[this.targetId])
            ? { [this.targetId]: { window: knownWindows[this.targetId].window } }
            : {};
    }

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
    private _knownWindows: KnownWindows = {};
    private _transactions: { [id: string]: CrossOriginTransactionWrapper<any, any> } = {};
    private _ah: Types.AbilityHelpers;
    private _pingTimer: number | undefined;
    private _isPinging = false;

    constructor(ah: Types.AbilityHelpers, owner: WindowWithUID) {
        this._ah = ah;
        this._owner = owner;
        this._ownerUId = getWindowUId(owner);
    }

    init(): void {
        if (this._owner.document) {
            this._owner.addEventListener('message', this._onMessage);
        }

        this._ping();
    }

    dispose(): void {
        this._owner.removeEventListener('message', this._onMessage);
    }

    beginTransaction<I, O>(
        Transaction: CrossOriginTransactionClass<I, O>,
        value: I,
        sentTo?: SentTo,
        targetId?: string
    ): Promise<O | undefined> {
        const transaction = new Transaction(this._ah, this._owner, this._knownWindows, value, sentTo, targetId);
        let before: ((data: CrossOriginTransactionData<I, O>) => Promise<any>) | undefined;

        if (Transaction.makeSelfResponse) {
            before = (data: CrossOriginTransactionData<I, O>) => {
                return Transaction.makeResponse(this._ah, data, this._owner, this._ownerUId, this, data['ah-end-data'], true);
            };
        }

        return this._beginTransaction(transaction, before);
    }

    private _beginTransaction<I, O>(
        transaction: CrossOriginTransaction<I, O>,
        before?: (data: CrossOriginTransactionData<I, O>) => Promise<any>
    ): Promise<O | undefined> {
        const wrapper: CrossOriginTransactionWrapper<I, O> = {
            transaction,
            timeout: this._owner.setTimeout(() => {
                delete wrapper.timeout;
                if (!transaction.isDone()) {
                    transaction.reject('Cross origin transaction timed out.');
                }
                delete this._transactions[transaction.id];
            }, _transactionTimeout)
        };

        this._transactions[transaction.id] = wrapper;

        return transaction.begin(before);
    }

    forwardTransaction(data: CrossOriginTransactionData<any, any>): Promise<any> {
        if (data['ah-target'] === this._ownerUId) {
            return Promise.resolve();
        }

        const Transaction = this._getTransactionClass(data['ah-type']);

        if (Transaction) {
            return ((Transaction.shouldForward === undefined) || (Transaction.shouldForward(this._ah, data, this._owner, this._ownerUId)))
                ? this._beginTransaction(
                    new Transaction(
                        this._ah,
                        this._owner,
                        this._knownWindows,
                        data['ah-begin-data'],
                        data['ah-sentto'],
                        data['ah-target']
                    )
                )
                : Promise.resolve();
        }

        return Promise.reject(`Unknown transaction type ${ data['ah-type'] }`);
    }

    private _getTransactionClass(type: CrossOriginTransactionType): CrossOriginTransactionClass<any, any> | null {
        switch (type) {
            case CrossOriginTransactionType.Bootstrap:
                return BootstrapTransaction;
            case CrossOriginTransactionType.KeyboardNavigationState:
                return KeyboardNavigationStateTransaction;
            case CrossOriginTransactionType.FocusElement:
                return FocusElementTransaction;
            case CrossOriginTransactionType.FocusedElementState:
                return FocusedElementStateTransaction;
            case CrossOriginTransactionType.BlurredElementState:
                return BlurredElementStateTransaction;
            case CrossOriginTransactionType.GetFocusedElement:
                return GetFocusedElementTransaction;
            case CrossOriginTransactionType.RestoreFocusInDeloser:
                return RestoreFocusInDeloserTransaction;
            case CrossOriginTransactionType.Ping:
                return PingTransaction;
            default:
                return null;
        }
    }

    private _onMessage = (e: MessageEvent) => {
        if (e.source === this._owner) {
            return;
        }

        let data: CrossOriginTransactionData<any, any>;
        let transactionId: string;

        try {
            data = JSON.parse(e.data);
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
        } catch (e) {
            return;
        }

        if (data['ah-sentto'].parent) {
            data['ah-sentto'] = { [this._ownerUId]: true };
        }

        if (!(data['ah-owner'] in this._knownWindows) && e.source && (e.source !== this._owner) && e.source.postMessage) {
            this._knownWindows[data['ah-owner']] = e.source as Window;
        }

        const t = this._transactions[transactionId];

        if (t) {
            if (t.transaction.type === data['ah-type']) {
                t.transaction.onMessage(data);
            }
        } else {
            const Transaction = this._getTransactionClass(data['ah-type']);

            this.forwardTransaction(data).then(value => {
                const src = e.source;

                if (Transaction && src && src.postMessage) {
                    Transaction.makeResponse(this._ah, data, this._owner, this._ownerUId, this, value, false).then(r => {
                        const response: CrossOriginTransactionData<any, any> = {
                            ['ah-transaction']: data['ah-transaction'],
                            ['ah-type']: data['ah-type'],
                            ['ah-timestamp']: Date.now(),
                            ['ah-owner']: this._ownerUId,
                            ['ah-sentto']: {},
                            ['ah-target']: data['ah-owner'],
                            ['ah-end-data']: r
                        };

                        (src.postMessage as Function)(JSON.stringify(response), '*');
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

        for (let uid of Object.keys(this._knownWindows)) {
            const ret = await this.beginTransaction(PingTransaction, undefined, undefined, uid);

            if (!ret) {
                console.error(88711114, 'window timed out', uid);
                hasDeadWindow = true;
                delete this._knownWindows[uid];
            }
        }

        if (hasDeadWindow) {
            const focused = await this.beginTransaction(GetFocusedElementTransaction, undefined);

            if (!focused) {
                console.error(88711114, 'dead window had focus!');

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
        }, 2000);
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
        return this._ah.crossOrigin.focus(this, noFocusedProgrammaticallyFlag, noAccessibleCheck);
    }

    getHTMLElement(): HTMLElement | null {
        return this._element;
    }
}

export class CrossOriginAPI
        extends Subscribable<Types.CrossOriginElement | undefined, Types.FocusedElementDetails> implements Types.CrossOriginAPI {

    private _ah: Types.AbilityHelpers;
    private _initTimer: number | undefined;
    private _mainWindow: WindowWithUID;
    private _transactions: CrossOriginTransactions;
    private _blurTimer: number | undefined;

    constructor(ah: Types.AbilityHelpers, mainWindow: Window) {
        super();

        this._ah = ah;
        this._mainWindow = mainWindow;
        this._transactions = new CrossOriginTransactions(ah, mainWindow);
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._transactions.init();

        this._ah.keyboardNavigation.subscribe(this._onKeyboardNavigationStateChanged);
        this._ah.focusedElement.subscribe(this._onElementFocused);

        if (this._mainWindow.parent && (this._mainWindow.parent !== this._mainWindow)) {
            this._transactions.beginTransaction(BootstrapTransaction, undefined).then(data => {
                if (data && (this._ah.keyboardNavigation.isNavigatingWithKeyboard() !== data.isNavigatingWithKeyboard)) {
                    _ignoreKeyboardNavigationStateUpdate = true;
                    KeyboardNavigationState.setVal(this._ah.keyboardNavigation, data.isNavigatingWithKeyboard);
                    _ignoreKeyboardNavigationStateUpdate = false;
                }
            });
        }
    }

    protected dispose(): void {
        super.dispose();

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

    findElement(id: string, rootId?: string): Promise<Types.CrossOriginElement | null> {
        return new Promise<Types.CrossOriginElement | null>((resolve, reject) => {
            resolve(null);
        });
    }

    getFocusedElement(): Types.CrossOriginElement | undefined {
        return undefined;
    }

    getLastFocusedElement(): Types.CrossOriginElement | undefined {
        return undefined;
    }

    getPrevFocusedElement(): Types.CrossOriginElement | undefined {
        return undefined;
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

    focusDefault(container: Types.CrossOriginElement): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        });
    }

    focusFirst(container: Types.CrossOriginElement): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        });
    }

    resetFocus(container: Types.CrossOriginElement): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        });
    }

    isFocusable(
        element: Types.CrossOriginElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        });
    }

    isVisible(element: Types.CrossOriginElement): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        });
    }

    isAccessible(element: Types.CrossOriginElement): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        });
    }

    static setVal(instance: Types.CrossOriginAPI, val: CrossOriginElement | undefined, details: Types.FocusedElementDetails): void {
        (instance as CrossOriginAPI).setVal(val, details);
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
