/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from '../Instance';
import { MutationEvent, MUTATION_EVENT_NAME } from '../MutationEvent';
import { Subscribable } from './Subscribable';
import * as Types from '../Types';
import { documentContains, getElementUId } from '../Utils';

interface ObservedElementInfo {
    element: HTMLElement;
    triggeredName?: string;
}

const _observedById: { [uid: string]: ObservedElementInfo } = {};
const _observedByName: { [name: string]: { [uid: string]: ObservedElementInfo } } = {};

export class ObservedElementAPI
        extends Subscribable<HTMLElement, Types.ObservedElementBasicProps> implements Types.ObservedElementAPI {

    private _win: Types.GetWindow;
    private _ah: Types.AbilityHelpers;
    private _initTimer: number | undefined;
    private _waiting: {
        [name: string]: {
            timer?: number,
            promise?: Promise<HTMLElement | null>,
            resolve?: (value: HTMLElement | null) => void,
            reject?: () => void }
    } = {};
    private _lastRequestFocusId = 0;

    constructor(ah: Types.AbilityHelpers, getWindow: Types.GetWindow) {
        super();
        this._ah = ah;
        this._win = getWindow;
        this._initTimer = getWindow().setTimeout(this._init, 0);
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
    }

    static dispose(instance: Types.ObservedElementAPI): void {
        (instance as ObservedElementAPI).dispose();
    }

    add(element: HTMLElement, basic?: Types.ObservedElementBasicProps, extended?: Types.ObservedElementExtendedProps): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);

        if (ah && ah.observed) {
            if (__DEV__) {
                console.error('Element is already observed.', element);
            }
            return;
        }

        setAbilityHelpersOnElement(this._ah, element, { observed: { ...basic, ...extended } });
        this._onObservedElementUpdate(element);
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);

        if (!ah || !ah.observed) {
            if (__DEV__) {
                console.error('Element is not observed.', element);
            }
            return;
        }

        setAbilityHelpersOnElement(this._ah, element, { observed: undefined });
        this._onObservedElementUpdate(element);
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(this._ah, from);
        const ahTo = getAbilityHelpersOnElement(this._ah, to);
        const observed = ahFrom && ahFrom.observed;

        if (observed) {
            setAbilityHelpersOnElement(this._ah, from, { observed: undefined });
            this._onObservedElementUpdate(from);

            if (ahTo && ahTo.observed) {
                if (__DEV__) {
                    console.error('Element is already observed', to);
                }
                return;
            }

            setAbilityHelpersOnElement(this._ah, to, { observed });
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
        const ah = getAbilityHelpersOnElement(this._ah, element);
        const observed = ah && ah.observed;

        if (!observed) {
            if (__DEV__) {
                console.error('Element is not observed.', element);
            }
            return;
        }

        setAbilityHelpersOnElement(this._ah, element, { observed: { ...observed, ...basic, ...extended } });
        this._onObservedElementUpdate(element);
    }

    getElement(observedName: string): HTMLElement | null {
        const o = _observedByName[observedName];

        if (o) {
            for (let uid of Object.keys(o)) {
                return o[uid].element;
            }
        }

        return null;
    }

    waitElement(observedName: string, timeout: number): Promise<HTMLElement | null> {
        const el = this.getElement(observedName);

        if (el) {
            return Promise.resolve(el);
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

        const promise = new Promise<HTMLElement | null>((resolve, reject) => {
            w.resolve = resolve;
            w.reject = reject;
        });

        w.promise = promise;

        return promise;
    }

    async requestFocus(observedName: string, timeout: number): Promise<boolean> {
        let requestId = ++this._lastRequestFocusId;
        return this.waitElement(observedName, timeout).then(element => ((this._lastRequestFocusId === requestId) && element)
            ? this._ah.focusedElement.focus(element)
            : false
        );
    }

    private _onObservedElementUpdate(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(this._ah, element);
        const observed = ah && ah.observed;
        const uid = getElementUId(element, this._win());
        const isInDocument = documentContains(element.ownerDocument, element);
        let info: ObservedElementInfo | undefined = _observedById[uid];

        if (observed && isInDocument) {
            if (!info) {
                info = _observedById[uid] = {
                    element
                };
            }

            if (observed.name && (observed.name !== info.triggeredName)) {
                if (info.triggeredName) {
                    const obn = _observedByName[info.triggeredName];

                    if (obn && obn[uid]) {
                        if (Object.keys(obn).length > 1) {
                            delete obn[uid];
                        } else {
                            delete _observedByName[info.triggeredName];
                        }
                    }
                }

                info.triggeredName = observed.name;

                let obn = _observedByName[info.triggeredName];

                if (!obn) {
                    obn = _observedByName[info.triggeredName] = {};
                }

                obn[uid] = info;

                this._trigger(element, {
                    name: observed.name,
                    details: observed.details
                });
            }
        } else if (info) {
            if (info.triggeredName) {
                const obn = _observedByName[info.triggeredName];

                if (obn && obn[uid]) {
                    if (Object.keys(obn).length > 1) {
                        delete obn[uid];
                    } else {
                        delete _observedByName[info.triggeredName];
                    }
                }
            }

            delete _observedById[uid];
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
