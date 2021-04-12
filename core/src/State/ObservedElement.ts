/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement, setTabsterOnElement } from '../Instance';
import { MutationEvent, MUTATION_EVENT_NAME } from '../MutationEvent';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';
import { documentContains, getElementUId, getPromise, WeakHTMLElement } from '../Utils';

interface ObservedElementInfo {
    element: WeakHTMLElement;
    triggeredName?: string;
}

export class ObservedElementAPI
        extends Subscribable<HTMLElement, Types.ObservedElementBasicProps> implements Types.ObservedElementAPI {

    private _win: Types.GetWindow;
    private _tabster: Types.TabsterCore;
    private _initTimer: number | undefined;
    private _waiting: {
        [name: string]: {
            timer?: number,
            promise?: Promise<HTMLElement | null>,
            resolve?: (value: HTMLElement | null) => void,
            reject?: () => void }
    } = {};
    private _lastRequestFocusId = 0;
    private _observedById: { [uid: string]: ObservedElementInfo } = {};
    private _observedByName: { [name: string]: { [uid: string]: ObservedElementInfo } } = {};

    constructor(tabster: Types.TabsterCore) {
        super();
        this._tabster = tabster;
        this._win = (tabster as unknown as Types.TabsterInternal).getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;
        this._win().document.addEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
    }

    protected dispose(): void {
        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        win.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!

        for (let name of Object.keys(this._waiting)) {
            const w = this._waiting[name];

            if (w.timer) {
                win.clearTimeout(w.timer);
            }

            if (w.reject) {
                w.reject();
            }

            delete this._waiting[name];
        }

        this._observedById = {};
        this._observedByName = {};
    }

    static dispose(instance: Types.ObservedElementAPI): void {
        (instance as ObservedElementAPI).dispose();
    }

    add(element: HTMLElement, basic: Types.ObservedElementBasicProps, extended?: Types.ObservedElementExtendedProps): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (tabsterOnElement && tabsterOnElement.observed) {
            if (__DEV__) {
                console.error('Element is already observed.', element);
            }
            return;
        }

        setTabsterOnElement(this._tabster, element, { observed: { ...basic, ...extended } });
        this._onObservedElementUpdate(element);
    }

    remove(element: HTMLElement): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

        if (!tabsterOnElement || !tabsterOnElement.observed) {
            if (__DEV__) {
                console.error('Element is not observed.', element);
            }
            return;
        }

        setTabsterOnElement(this._tabster, element, { observed: undefined });
        this._onObservedElementUpdate(element);
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const tabsterOnElementFrom = getTabsterOnElement(this._tabster, from);
        const tabsterOnElementTo = getTabsterOnElement(this._tabster, to);
        const observed = tabsterOnElementFrom && tabsterOnElementFrom.observed;

        if (observed) {
            setTabsterOnElement(this._tabster, from, { observed: undefined });
            this._onObservedElementUpdate(from);

            if (tabsterOnElementTo && tabsterOnElementTo.observed) {
                if (__DEV__) {
                    console.error('Element is already observed', to);
                }
                return;
            }

            setTabsterOnElement(this._tabster, to, { observed });
            this._onObservedElementUpdate(to);
        } else if (__DEV__) {
            console.error('Element is not observed.', from);
        }
    }

    setProps(
        element: HTMLElement,
        basic?: Partial<Types.ObservedElementBasicProps>,
        extended?: Partial<Types.ObservedElementExtendedProps>
    ): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        const observed = tabsterOnElement && tabsterOnElement.observed;

        if (!observed) {
            if (__DEV__) {
                console.error('Element is not observed.', element);
            }
            return;
        }

        setTabsterOnElement(this._tabster, element, { observed: { ...observed, ...basic, ...extended } });
        this._onObservedElementUpdate(element);
    }

    getElement(observedName: string): HTMLElement | null {
        const o = this._observedByName[observedName];

        if (o) {
            for (let uid of Object.keys(o)) {
                const el = o[uid].element.get() || null;

                if (!el) {
                    delete o[uid];
                    delete this._observedById[uid];
                }

                return el;
            }
        }

        return null;
    }

    waitElement(observedName: string, timeout: number): Promise<HTMLElement | null> {
        const el = this.getElement(observedName);

        if (el) {
            return getPromise(this._win).resolve(el);
        }

        let w = this._waiting[observedName];

        if (w && w.promise) {
            return w.promise;
        }

        w = this._waiting[observedName] = {
            timer: this._win().setTimeout(() => {
                w.timer = undefined;

                delete this._waiting[observedName];

                if (w.resolve) {
                    w.resolve(null);
                }
            }, timeout)
        };

        const promise = new (getPromise(this._win))<HTMLElement | null>((resolve, reject) => {
            w.resolve = resolve;
            w.reject = reject;
        });

        w.promise = promise;

        return promise;
    }

    async requestFocus(observedName: string, timeout: number): Promise<boolean> {
        let requestId = ++this._lastRequestFocusId;
        return this.waitElement(observedName, timeout).then(element => ((this._lastRequestFocusId === requestId) && element)
            ? this._tabster.focusedElement.focus(element)
            : false
        );
    }

    private _onObservedElementUpdate(element: HTMLElement): void {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);
        const observed = tabsterOnElement && tabsterOnElement.observed;
        const uid = getElementUId(this._win, element);
        const isInDocument = documentContains(element.ownerDocument, element);
        let info: ObservedElementInfo | undefined = this._observedById[uid];

        if (observed && isInDocument) {
            if (!info) {
                info = this._observedById[uid] = {
                    element: new WeakHTMLElement(this._win, element)
                };
            }

            if (observed.name && (observed.name !== info.triggeredName)) {
                if (info.triggeredName) {
                    const obn = this._observedByName[info.triggeredName];

                    if (obn && obn[uid]) {
                        if (Object.keys(obn).length > 1) {
                            delete obn[uid];
                        } else {
                            delete this._observedByName[info.triggeredName];
                        }
                    }
                }

                info.triggeredName = observed.name;

                let obn = this._observedByName[info.triggeredName];

                if (!obn) {
                    obn = this._observedByName[info.triggeredName] = {};
                }

                obn[uid] = info;

                this._trigger(element, {
                    name: observed.name,
                    details: observed.details
                });
            }
        } else if (info) {
            if (info.triggeredName) {
                const obn = this._observedByName[info.triggeredName];

                if (obn && obn[uid]) {
                    if (Object.keys(obn).length > 1) {
                        delete obn[uid];
                    } else {
                        delete this._observedByName[info.triggeredName];
                    }
                }
            }

            delete this._observedById[uid];
        }
    }

    private _trigger(val: HTMLElement, details: Types.ObservedElementBasicProps): void {
        this.trigger(val, details);

        const name = details.name;
        const w = name && this._waiting[name];

        if (w) {
            if (w.timer) {
                this._win().clearTimeout(w.timer);
            }

            delete this._waiting[name!!!];

            if (w.resolve) {
                w.resolve(val);
            }
        }
    }

    private _onMutation = (e: MutationEvent): void => {
        if (!e.target || !e.details.observed) {
            return;
        }

        this._onObservedElementUpdate(e.details.observed);
    }
}
