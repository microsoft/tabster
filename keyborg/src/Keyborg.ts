/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { disposeFocusEvent, KeyborgFocusInEvent, KEYBORG_FOCUSIN, setupFocusEvent } from './FocusEvent';

interface WindowWithKeyborg extends Window {
    __keyborg?: {
        core: KeyborgCore,
        refs: { [id: string]: Keyborg }
    };
}

const KeyTab = 9;
const KeyEsc = 27;

const _dismissTimeout = 500; // When Esc is pressed and the focused is not moved
                             // during _dismissTimeout time, dismiss the keyboard
                             // navigation mode.

let _lastId = 0;

const _hasWeakRef = typeof WeakRef !== 'undefined';

export type KeyborgCallback = (isNavigatingWithKeyboard: boolean) => void;

export class KeyborgStorage {
    private _k: { [id: string]: KeyborgRef } = {};
    private _val = false;

    add(keyborg: KeyborgCore): void {
        const id = keyborg.id;

        if (!(id in this._k)) {
            this._k[id] = new KeyborgRef(keyborg);
        }
    }

    remove(id: string): void {
        delete this._k[id];

        if (Object.keys(this._k).length === 0) {
            this._val = false;
        }
    }

    setVal(isNavigatingWithKeyboard: boolean): void {
        if (this._val !== isNavigatingWithKeyboard) {
            this._val = isNavigatingWithKeyboard;

            for (let id of Object.keys(this._k)) {
                const ref = this._k[id];
                const keyborg = ref.deref();

                if (keyborg) {
                    keyborg.update(isNavigatingWithKeyboard);
                } else {
                    this.remove(id);
                }
            }
        }
    }

    getVal(): boolean {
        return this._val;
    }
}

const _storage = new KeyborgStorage();

export class KeyborgRef {
    private _id: string;
    private _target?: KeyborgCore;
    private _weakRef?: WeakRef<KeyborgCore>;

    constructor(target: KeyborgCore) {
        this._id = target.id;

        if (_hasWeakRef) {
            this._weakRef = new WeakRef(target);
        } else {
            this._target = target;
        }
    }

    deref(): KeyborgCore | undefined {
        let target: KeyborgCore | undefined;

        if (_hasWeakRef) {
            target = this._weakRef?.deref();

            if (!target) {
                delete this._weakRef;
            }
        } else {
            target = this._target;

            if (target && target.isDisposed()) {
                delete this._target;
            }
        }

        if (!target) {
            _storage.remove(this._id);
        }

        return target;
    }
}

class KeyborgCore {
    readonly id: string;

    private _win?: WindowWithKeyborg;
    private _isMouseUsed = false;
    private _dismissTimer: number | undefined;

    constructor(win: WindowWithKeyborg) {
        this.id = 'c' + ++_lastId;
        this._win = win;
        const doc = win.document;

        doc.addEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true); // Capture!
        doc.addEventListener('mousedown', this._onMouseDown, true); // Capture!
        win.addEventListener('keydown', this._onKeyDown, true); // Capture!

        setupFocusEvent(win);

        _storage.add(this);
    }

    dispose(): void {
        const win = this._win;

        if (win) {
            if (this._dismissTimer) {
                win.clearTimeout(this._dismissTimer);
                this._dismissTimer = undefined;
            }

            disposeFocusEvent(win);

            const doc = win.document;

            doc.removeEventListener(KEYBORG_FOCUSIN, this._onFocusIn, true); // Capture!
            doc.removeEventListener('mousedown', this._onMouseDown, true); // Capture!
            win.removeEventListener('keydown', this._onKeyDown, true); // Capture!

            delete this._win;

            _storage.remove(this.id);
        }
    }

    isDisposed(): boolean {
        return !!this._win;
    }

    update(isNavigatingWithKeyboard: boolean): void {
        const keyborgs = this._win?.__keyborg?.refs;

        if (keyborgs) {
            for (let id of Object.keys(keyborgs)) {
                Keyborg.update(keyborgs[id], isNavigatingWithKeyboard);
            }
        }
    }

    private _onFocusIn = (e: KeyborgFocusInEvent) => {
        if (this._isMouseUsed) {
            this._isMouseUsed = false;

            return;
        }

        if (_storage.getVal()) {
            return;
        }

        const details = e.details;

        if (!details.relatedTarget) {
            return;
        }

        if (details.isFocusedProgrammatically || (details.isFocusedProgrammatically === undefined)) {
            // The element is focused programmatically, or the programmatic focus detection
            // is not working.
            return;
        }

        _storage.setVal(true);
    }

    private _onMouseDown = (e: MouseEvent): void => {
        if ((e.buttons === 0) ||
            ((e.clientX === 0) && (e.clientY === 0) &&
             (e.screenX === 0) && (e.screenY === 0))) {
            // This is most likely an event triggered by the screen reader to perform
            // an action on an element, do not dismiss the keyboard navigation mode.
            return;
        }

        this._isMouseUsed = true;

        _storage.setVal(false);
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        const isNavigatingWithKeyboard = _storage.getVal();

        if (!isNavigatingWithKeyboard && (e.keyCode === KeyTab)) {
            _storage.setVal(true);
        } else if (isNavigatingWithKeyboard && (e.keyCode === KeyEsc)) {
            this._scheduleDismiss();
        }
    }

    private _scheduleDismiss(): void {
        const win = this._win;

        if (win) {
            if (this._dismissTimer) {
                win.clearTimeout(this._dismissTimer);
                this._dismissTimer = undefined;
            }

            const was = win.document.activeElement;

            this._dismissTimer = win.setTimeout(() => {
                this._dismissTimer = undefined;

                const cur = win.document.activeElement;

                if (was && cur && (was === cur)) {
                    // Esc was pressed, currently focused element hasn't changed.
                    // Just dismiss the keyboard navigation mode.
                    _storage.setVal(false);
                }
            }, _dismissTimeout);
        }
    }
}

export class Keyborg {
    private _id: string;
    private _win?: WindowWithKeyborg;
    private _core?: KeyborgCore;
    private _cb: KeyborgCallback[] = [];

    static create(win: WindowWithKeyborg): Keyborg {
        return new Keyborg(win);
    }

    static dispose(instance: Keyborg): void {
        instance.dispose();
    }

    static update(instance: Keyborg, isNavigatingWithKeyboard: boolean): void {
        instance._cb.forEach(callback => callback(isNavigatingWithKeyboard));
    }

    private constructor(win: WindowWithKeyborg) {
        this._id = 'k' + ++_lastId;
        this._win = win;

        const current = win.__keyborg;

        if (current) {
            this._core = current.core;
            current.refs[this._id] = this;
        } else {
            this._core = new KeyborgCore(win);
            win.__keyborg = {
                core: this._core,
                refs: { [this._id]: this }
            };
        }
    }

    private dispose(): void {
        const current = this._win?.__keyborg;

        if (current?.refs[this._id]) {
            delete current.refs[this._id];

            if (Object.keys(current.refs).length === 0) {
                current.core.dispose();
                delete this._win!!!.__keyborg;
            }
        } else if (__DEV__) {
            console.error(`Keyborg instance ${ this._id } is being disposed incorrectly.`);
        }

        this._cb = [];
        delete this._core;
        delete this._win;
    }

    isNavigatingWithKeyboard(): boolean {
        return _storage.getVal();
    }

    subscribe(callback: KeyborgCallback): void {
        this._cb.push(callback);
    }

    unsubscribe(callback: KeyborgCallback): void {
        const index = this._cb.indexOf(callback);

        if (index >= 0) {
            this._cb.splice(index, 1);
        }
    }

    setVal(isNavigatingWithKeyboard: boolean): void {
        _storage.setVal(isNavigatingWithKeyboard);
    }
}

export function createKeyborg(win: Window): Keyborg {
    return Keyborg.create(win);
}

export function disposeKeyborg(instance: Keyborg) {
    Keyborg.dispose(instance);
}
