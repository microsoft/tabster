/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Keys } from '../Keys';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';

const _dismissTimeout = 500; // When Esc is pressed and the focused is not moved
                             // during _dismissTimeout time, dismiss the keyboard
                             // navigation mode.

export class KeyboardNavigationState extends Subscribable<boolean> implements Types.KeyboardNavigationState {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _dismissTimer: number | undefined;
    private _initTimer: number | undefined;
    private _isMouseUsed = false;

    constructor(tabster: Types.TabsterCore, getWindow: Types.GetWindow) {
        super();

        this._tabster = tabster;
        this._win = getWindow;
        this._initTimer = getWindow().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        const win = this._win();

        win.document.body.addEventListener('mousedown', this._onMouseDown, true); // Capture!
        win.addEventListener('keydown', this._onKeyDown, true); // Capture!

        this._tabster.focusedElement.subscribe(this._onFocus);
    }

    protected dispose(): void {
        super.dispose();

        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._dismissTimer) {
            win.clearTimeout(this._dismissTimer);
            this._dismissTimer = undefined;
        }

        win.document.body.removeEventListener('mousedown', this._onMouseDown, true);
        win.removeEventListener('keydown', this._onKeyDown, true);

        this._tabster.focusedElement.unsubscribe(this._onFocus);
    }

    static dispose(instance: Types.KeyboardNavigationState): void {
        (instance as KeyboardNavigationState).dispose();
    }

    isNavigatingWithKeyboard(): boolean {
        return this.getVal() || false;
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

        this.setVal(false, undefined);
    }

    private _onKeyDown = (e: KeyboardEvent): void => {
        const isNavigatingWithKeyboard = this.isNavigatingWithKeyboard();

        if (!isNavigatingWithKeyboard && (e.keyCode === Keys.Tab)) {
            this.setVal(true, undefined);
        } else if (isNavigatingWithKeyboard && (e.keyCode === Keys.Esc)) {
            this._scheduleDismiss();
        }
    }

    private _onFocus = (e: HTMLElement | undefined, d: Types.FocusedElementDetails): void => {
        if (!e) {
            return;
        }

        if (this._isMouseUsed) {
            this._isMouseUsed = false;

            return;
        }

        if (this.isNavigatingWithKeyboard()) {
            return;
        }

        if (!d.relatedTarget) {
            return;
        }

        if (d.isFocusedProgrammatically || (d.isFocusedProgrammatically === undefined)) {
            // The element is focused programmatically, or the programmatic focus detection
            // is not working.
            return;
        }

        this.setVal(true, undefined);
    }

    private _scheduleDismiss(): void {
        const win = this._win();

        if (this._dismissTimer) {
            win.clearTimeout(this._dismissTimer);
            this._dismissTimer = undefined;
        }

        const was = this._tabster.focusedElement.getFocusedElement();

        this._dismissTimer = win.setTimeout(() => {
            this._dismissTimer = undefined;

            const cur = this._tabster.focusedElement.getFocusedElement();

            if (was && cur && (was === cur)) {
                // Esc was pressed, currently focused element hasn't changed.
                // Just dismiss the keyboard navigation mode.
                this.setVal(false, undefined);
            }
        }, _dismissTimeout);
    }

    static setVal(instance: Types.KeyboardNavigationState, val: boolean): void {
        (instance as KeyboardNavigationState).setVal(val, undefined);
    }
}
