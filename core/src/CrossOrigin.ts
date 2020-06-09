/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { KeyboardNavigationState } from './State/KeyboardNavigation';
import { Subscribable } from './State/Subscribable';
import * as Types from './Types';

const _transactionTimeout = 1000;
const _postMessageTimeout = 500;

let _uidCounter = 0;

let _ignoreKeyboardNavigationStateUpdate = false;
let _focusOwner: string | undefined;
let _focusOwnerTimestamp: number | undefined;

interface KnownWindows {
    [id: string]: {
        window: Window;
        timeout?: number;
    };
}

interface SentTo {
    [id: string]: true;
}

interface WindowWithUID extends Window {
    __ahCrossOriginWindowUID?: string;
}

interface HTMLElementWithUID extends HTMLElement {
    __ahCrossOriginElementUID?: string;
}

enum CrossOriginTransactionType {
    Bootstrap = 1,
    KeyboardNavigationState = 2,
    FocusElement = 3,
    FocusedElementState = 4,
    BlurredElementState = 5,
    GetFocusedElement = 6
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

abstract class CrossOriginTransaction<I, O> {
    abstract type: CrossOriginTransactionType;
    readonly id: string;
    readonly beginData: I;
    protected endData: O | undefined;
    protected owner: Window;
    protected ownerId: string;
    private _promise: Promise<O>;
    protected _resolve: ((endData?: O) => void) | undefined;
    private _reject: ((reason: string) => void) | undefined;
    private _knownWindows: KnownWindows;
    private _sentTo: SentTo;
    private _targetId: string | undefined;
    private _inProgress: { [id: string]: number } = {};
    private _isDone = false;

    constructor(owner: WindowWithUID, knownWindows: KnownWindows, value: I, sentTo?: SentTo, targetId?: string) {
        this.owner = owner;
        this.ownerId = getWindowUID(owner);
        this.id = getUID(owner);
        this.beginData = value;
        this._knownWindows = knownWindows;
        this._sentTo = sentTo || { [this.ownerId]: true };
        this._targetId = targetId;
        this._promise = new Promise<O>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    protected getWindows(knownWindows: KnownWindows): KnownWindows | null {
        return knownWindows;
    }

    begin(before?: (data: CrossOriginTransactionData<I, O>) => void): Promise<O | undefined> {
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

        if (this._targetId) {
            data['ah-target'] = this._targetId;
        }

        let message: string | undefined;

        if (before) {
            before(data);
        }

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

        return this._promise;
    }

    private _postMessage(target: Window, targetId: string, message: string) {
        if (!this._inProgress[targetId]) {
            if (target && target.postMessage) {
                target.postMessage(message, '*');
            }

            this._inProgress[targetId] = this.owner.setTimeout(() => {
                delete this._inProgress[targetId];

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
        owner: WindowWithUID,
        knownWindows: KnownWindows,
        value: I,
        sentTo?: SentTo,
        targetId?: string
    ): CrossOriginTransaction<I, O>;
    shouldForward?(ah: Types.AbilityHelpers, data: CrossOriginTransactionData<I, O>, owner: Window, ownerId: string): boolean;
    makeResponse(ah: Types.AbilityHelpers, data: CrossOriginTransactionData<I, O>, owner: Window, ownerId: string, forwardResponse?: O): O;
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

    static makeResponse(ah: Types.AbilityHelpers): BootstrapTransactionContents {
        return { isNavigatingWithKeyboard: ah.keyboardNavigation.isNavigatingWithKeyboard() };
    }
}

class KeyboardNavigationStateTransaction extends CrossOriginTransaction<boolean, true> {
    type = CrossOriginTransactionType.KeyboardNavigationState;

    static makeResponse(ah: Types.AbilityHelpers, data: CrossOriginTransactionData<boolean, true>): true {
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
}

class FocusElementTransaction extends CrossOriginTransaction<FocusElementData, true> {
    type = CrossOriginTransactionType.FocusElement;

    static shouldForward(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<FocusElementData, true>,
        owner: Window,
        ownerId: string
    ): boolean {
        const fd = data['ah-begin-data'];
        let el: HTMLElement | null | undefined;

        if (fd && fd.id && ((el = owner.document.getElementById(fd.id)))) {
            if (ah.focusedElement.focus(el)) {
                return false;
            }
        }

        return true;
    }

    static makeResponse(): true {
        return true;
    }
}

interface FocusedElementStateData {
    uid: string;
    ownerId: string;
    timestamp: number;
    id?: string;
    rootId?: string;
    deloserId?: string;
    isFocusedProgrammatically?: boolean;
}

class FocusedElementStateTransaction extends CrossOriginTransaction<FocusedElementStateData, true> {
    type = CrossOriginTransactionType.FocusedElementState;

    static makeSelfResponse = true;

    static makeResponse(ah: Types.AbilityHelpers, data: CrossOriginTransactionData<FocusedElementStateData, true>): true {
        const beginData = data['ah-begin-data'];

        if (beginData && (beginData.ownerId)) {
            _focusOwner = beginData.ownerId;
            _focusOwnerTimestamp = beginData.timestamp;

            const element = new CrossOriginElement(ah, null, beginData.uid, beginData.ownerId, beginData.id, beginData.rootId);

            CrossOriginAPI.setVal(ah.crossOrigin, element, { isFocusedProgrammatically: beginData.isFocusedProgrammatically });
        }

        return true;
    }
}

class GetFocusedElementTransaction extends CrossOriginTransaction<undefined, FocusedElementStateData> {
    type = CrossOriginTransactionType.GetFocusedElement;

    static makeResponse(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<undefined, FocusedElementStateData>,
        owner: Window,
        ownerId: string,
        forwarded: FocusedElementStateData | undefined
    ): FocusedElementStateData | undefined {
        const focused = ah.focusedElement.getFocusedElement();

        if (focused) {
            return {
                uid: getElementUID(focused, owner),
                ownerId,
                timestamp: Date.now(),
                id: focused.id,
                rootId: undefined, // TODO
                deloserId: undefined, // TODO
            };
        }

        return forwarded;
    }
}

interface BlurredElementStateData {
    ownerId: string;
    timestamp: number;
}

class BlurredElementStateTransaction extends CrossOriginTransaction<BlurredElementStateData, true> {
    type = CrossOriginTransactionType.BlurredElementState;

    static makeSelfResponse = true;

    static makeResponse(
        ah: Types.AbilityHelpers,
        data: CrossOriginTransactionData<BlurredElementStateData, true>
    ): true {
        const beginData = data['ah-begin-data'];

        if (
            beginData &&
            (beginData.ownerId === _focusOwner) &&
            (!_focusOwnerTimestamp || (_focusOwnerTimestamp < beginData.timestamp))
        ) {
            CrossOriginAPI.setVal(ah.crossOrigin, undefined, {});
        }

        return true;
    }
}

interface CrossOriginTransactionWrapper<I, O> {
    transaction: CrossOriginTransaction<I, O>;
    timeout: number;
}

class CrossOriginTransactions {
    private _owner: WindowWithUID;
    private _ownerId: string;
    private _knownWindows: KnownWindows = {};
    private _transactions: { [id: string]: CrossOriginTransactionWrapper<any, any> } = {};
    private _ah: Types.AbilityHelpers;

    constructor(ah: Types.AbilityHelpers, owner: WindowWithUID) {
        this._ah = ah;
        this._owner = owner;
        this._ownerId = getWindowUID(owner);
    }

    init(): void {
        if (this._owner.document) {
            this._owner.addEventListener('message', this._onMessage);
        }
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
        const transaction = new Transaction(this._owner, this._knownWindows, value, sentTo, targetId);
        let before: ((data: CrossOriginTransactionData<I, O>) => void) | undefined;

        if (Transaction.makeSelfResponse) {
            before = (data: CrossOriginTransactionData<I, O>) => {
                Transaction.makeResponse(this._ah, data, this._owner, this._ownerId);
            };
        }

        return this._beginTransaction(transaction, before);
    }

    private _beginTransaction<I, O>(
        transaction: CrossOriginTransaction<I, O>,
        before?: (data: CrossOriginTransactionData<I, O>) => void
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
        const Transaction = this._getTransactionClass(data['ah-type']);

        if (Transaction) {
            return ((Transaction.shouldForward === undefined) || (Transaction.shouldForward(this._ah, data, this._owner, this._ownerId)))
                ? this._beginTransaction(
                    new Transaction(
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
            default:
                return null;
        }
    }

    private _onMessage = (e: MessageEvent) => {
        if (e.source === this._owner) {
            console.error('Self messaging!');
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
            data['ah-sentto'] = { [this._ownerId]: true };
        }

        if (!(data['ah-owner'] in this._knownWindows) && e.source && (e.source !== this._owner) && e.source.postMessage) {
            this._knownWindows[data['ah-owner']] = e.source as Window;
        }

        const t = this._transactions[transactionId];

        if (t) {
            if (t.transaction.type === data['ah-type']) {
                t.transaction.onMessage(data);
            }
        } else if (data['ah-target'] !== this._ownerId) {
            const Transaction = this._getTransactionClass(data['ah-type']);

            this.forwardTransaction(data).then(value => {
                if (Transaction && e.source && e.source.postMessage) {
                    const response: CrossOriginTransactionData<any, any> = {
                        ['ah-transaction']: data['ah-transaction'],
                        ['ah-type']: data['ah-type'],
                        ['ah-timestamp']: Date.now(),
                        ['ah-owner']: this._ownerId,
                        ['ah-sentto']: {},
                        ['ah-target']: data['ah-owner'],
                        ['ah-end-data']: Transaction.makeResponse(this._ah, data, this._owner, this._ownerId, value)
                    };

                    (e.source.postMessage as Function)(JSON.stringify(response), '*');
                }
            });
        }
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
        let ownerId = getWindowUID(this._mainWindow);

        if (this._blurTimer) {
            this._mainWindow.clearTimeout(this._blurTimer);
            this._blurTimer = undefined;
        }

        if (value) {
            const fed: FocusedElementStateData = {
                uid: getElementUID(value, this._mainWindow),
                ownerId,
                timestamp: Date.now(),
                id: value.id || undefined,
                rootId: undefined, // TODO
                deloserId: undefined, // TODO
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
                            timestamp: Date.now()
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

function getUID(wnd: Window & { msCrypto?: Crypto }): string {
    const rnd = new Uint32Array(4);

    if (wnd.crypto && wnd.crypto.getRandomValues) {
        wnd.crypto.getRandomValues(rnd);
    } else if (wnd.msCrypto && wnd.msCrypto.getRandomValues) {
        wnd.msCrypto.getRandomValues(rnd);
    } else {
        for (let i = 0; i < rnd.length; i++) {
            rnd[i] = 0xffffffff * Math.random();
        }
    }

    const srnd: string[] = [];

    for (let i = 0; i < rnd.length; i++) {
        srnd.push(rnd[i].toString(36));
    }

    srnd.push('|');
    srnd.push((++_uidCounter).toString(36));
    srnd.push('|');
    srnd.push(Date.now().toString(36));

    return srnd.join('');
}

function getElementUID(element: HTMLElementWithUID, window: Window): string {
    let uid = element.__ahCrossOriginElementUID;

    if (!uid) {
        uid = element.__ahCrossOriginElementUID = getUID(window);
    }

    return uid;
}

function getWindowUID(window: WindowWithUID): string {
    let uid = window.__ahCrossOriginWindowUID;

    if (!uid) {
        uid = window.__ahCrossOriginWindowUID = getUID(window);
    }

    return uid;
}
