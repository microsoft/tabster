/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { MUTATION_EVENT_NAME, MutationEvent } from './MutationEvent';
import { Subscribable } from './State/Subscribable';
import * as Types from './Types';
import { getElementUId } from './Utils';

interface ObservedElementInfo {
    element: HTMLElement;
    triggeredName?: string;
}

const _observedById: { [uid: string]: ObservedElementInfo } = {};
export const observedByName: { [name: string]: { [uid: string]: ObservedElementInfo } } = {};

export class ObservedElementAPI
        extends Subscribable<HTMLElement, Types.ObservedElementBasicProps> implements Types.ObservedElementAPI {

    private _mainWindow: Window;
    private _initTimer: number | undefined;
    private _waiting: {
        [name: string]: {
            timer?: number,
            promise?: Promise<HTMLElement | null>,
            resolve?: (value: HTMLElement | null) => void,
            reject?: () => void }
    } = {};

    constructor(mainWindow: Window) {
        super();
        this._mainWindow = mainWindow;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;
        this._mainWindow.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._mainWindow.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation, true); // Capture!

        for (let name of Object.keys(this._waiting)) {
            const w = this._waiting[name];

            if (w.timer) {
                this._mainWindow.clearTimeout(w.timer);
            }

            if (w.reject) {
                w.reject();
            }

            delete this._waiting[name];
        }
    }

    add(element: HTMLElement, basic?: Types.ObservedElementBasicProps, extended?: Types.ObservedElementExtendedProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.observed) {
            if (__DEV__) {
                console.error('Element is already observed.', element);
            }
            return;
        }

        setAbilityHelpersOnElement(element, { observed: { ...basic, ...extended } });
        this._onObservedElementUpdate(element);
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (!ah || !ah.observed) {
            if (__DEV__) {
                console.error('Element is not observed.', element);
            }
            return;
        }

        setAbilityHelpersOnElement(element, { observed: undefined });
        this._onObservedElementUpdate(element);
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);
        const ahTo = getAbilityHelpersOnElement(to);
        const observed = ahFrom && ahFrom.observed;

        if (observed) {
            setAbilityHelpersOnElement(from, { observed: undefined });
            this._onObservedElementUpdate(from);

            if (ahTo && ahTo.observed) {
                if (__DEV__) {
                    console.error('Element is already observed', to);
                }
                return;
            }

            setAbilityHelpersOnElement(to, { observed });
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
        const ah = getAbilityHelpersOnElement(element);
        const observed = ah && ah.observed;

        if (!observed) {
            if (__DEV__) {
                console.error('Element is not observed.', element);
            }
            return;
        }

        setAbilityHelpersOnElement(element, { observed: { ...observed, ...basic, ...extended } });
        this._onObservedElementUpdate(element);
    }

    getElementByName(name: string): HTMLElement | null {
        const o = observedByName[name];

        if (o) {
            for (let uid of Object.keys(o)) {
                return o[uid].element;
            }
        }

        return null;
    }

    waitElementByName(name: string, timeout: number): Promise<HTMLElement | null> {
        const el = this.getElementByName(name);

        if (el) {
            return Promise.resolve(el);
        }

        let w = this._waiting[name];

        if (w && w.promise) {
            return w.promise;
        }

        w = this._waiting[name] = {
            timer: this._mainWindow.setTimeout(() => {
                w.timer = undefined;

                delete this._waiting[name];

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

    private _onObservedElementUpdate(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);
        const observed = ah && ah.observed;
        const uid = getElementUId(element, this._mainWindow);
        const isInDocument = element.ownerDocument && element.ownerDocument.contains(element);
        let info: ObservedElementInfo | undefined = _observedById[uid];

        if (observed && isInDocument) {
            if (!info) {
                info = _observedById[uid] = {
                    element
                };
            }

            if (observed.name && (observed.name !== info.triggeredName)) {
                if (info.triggeredName) {
                    const obn = observedByName[info.triggeredName];

                    if (obn && obn[uid]) {
                        if (Object.keys(obn).length > 1) {
                            delete obn[uid];
                        } else {
                            delete observedByName[info.triggeredName];
                        }
                    }
                }

                info.triggeredName = observed.name;

                let obn = observedByName[info.triggeredName];

                if (!obn) {
                    obn = observedByName[info.triggeredName] = {};
                }

                obn[uid] = info;

                this._trigger(element, {
                    name: observed.name,
                    details: observed.details
                });
            }
        } else if (info) {
            if (info.triggeredName) {
                const obn = observedByName[info.triggeredName];

                if (obn && obn[uid]) {
                    if (Object.keys(obn).length > 1) {
                        delete obn[uid];
                    } else {
                        delete observedByName[info.triggeredName];
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
                this._mainWindow.clearTimeout(w.timer);
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
