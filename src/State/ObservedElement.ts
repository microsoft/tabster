/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "../Instance";
import * as Types from "../Types";
import {
    ObservedElementAccessibilities,
    ObservedElementRequestStatuses,
} from "../Consts";
import {
    documentContains,
    getElementUId,
    getPromise,
    WeakHTMLElement,
} from "../Utils";
import { Subscribable } from "./Subscribable";

const _conditionCheckTimeout = 100;

interface ObservedElementInfo {
    element: WeakHTMLElement;
    prevNames?: string[];
}

interface ObservedWaiting {
    timer?: number;
    conditionTimer?: number;
    request?: Types.ObservedElementAsyncRequest<HTMLElement | null>;
    resolve?: (value: HTMLElement | null) => void;
    reject?: () => void;
}

export class ObservedElementAPI
    extends Subscribable<HTMLElement, Types.ObservedElementDetails>
    implements Types.ObservedElementAPI
{
    private _win: Types.GetWindow;
    private _tabster: Types.TabsterCore;
    private _waiting: Record<string, ObservedWaiting> = {};
    private _lastRequestFocusId = 0;
    private _observedById: { [uid: string]: ObservedElementInfo } = {};
    private _observedByName: {
        [name: string]: { [uid: string]: ObservedElementInfo };
    } = {};
    private _currentRequest:
        | Types.ObservedElementAsyncRequest<HTMLElement | null>
        | undefined;
    private _currentRequestTimestamp = 0;

    constructor(tabster: Types.TabsterCore) {
        super();
        this._tabster = tabster;
        this._win = tabster.getWindow;

        tabster.queueInit(() => {
            this._tabster.focusedElement.subscribe(this._onFocus);
        });
    }

    dispose(): void {
        this._tabster.focusedElement.unsubscribe(this._onFocus);

        for (const key of Object.keys(this._waiting)) {
            this._rejectWaiting(key);
        }

        this._observedById = {};
        this._observedByName = {};
    }

    private _onFocus = (e: HTMLElement | undefined): void => {
        if (e) {
            const current = this._currentRequest;

            if (current) {
                const delta = Date.now() - this._currentRequestTimestamp;
                const settleTime = 300;

                if (delta >= settleTime) {
                    // Giving some time for the focus to settle before
                    // automatically cancelling the current request on focus change.
                    delete this._currentRequest;
                    current.cancel();
                }
            }
        }
    };

    private _rejectWaiting(key: string, shouldResolve?: boolean): void {
        const w = this._waiting[key];

        if (w) {
            const win = this._win();

            if (w.timer) {
                win.clearTimeout(w.timer);
            }

            if (w.conditionTimer) {
                win.clearTimeout(w.conditionTimer);
            }

            if (!shouldResolve && w.reject) {
                w.reject();
            } else if (shouldResolve && w.resolve) {
                w.resolve(null);
            }

            delete this._waiting[key];
        }
    }

    private _isObservedNamesUpdated(cur: string[], prev?: string[]) {
        if (!prev || cur.length !== prev.length) {
            return true;
        }
        for (let i = 0; i < cur.length; ++i) {
            if (cur[i] !== prev[i]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns existing element by observed name
     *
     * @param observedName An observed name
     * @param accessibility Optionally, return only if the element is accessible or focusable
     * @returns HTMLElement | null
     */
    getElement(
        observedName: string,
        accessibility?: Types.ObservedElementAccessibility
    ): HTMLElement | null {
        const o = this._observedByName[observedName];

        if (o) {
            for (const uid of Object.keys(o)) {
                let el = o[uid].element.get() || null;
                if (el) {
                    if (
                        (accessibility ===
                            ObservedElementAccessibilities.Accessible &&
                            !this._tabster.focusable.isAccessible(el)) ||
                        (accessibility ===
                            ObservedElementAccessibilities.Focusable &&
                            !this._tabster.focusable.isFocusable(el, true))
                    ) {
                        el = null;
                    }
                } else {
                    delete o[uid];
                    delete this._observedById[uid];
                }

                return el;
            }
        }

        return null;
    }

    /**
     * Waits for the element to appear in the DOM and returns it.
     *
     * @param observedName An observed name
     * @param timeout Wait no longer than this timeout
     * @param accessibility Optionally, wait for the element to also become accessible or focusable before returning it
     * @returns Promise<HTMLElement | null>
     */
    waitElement(
        observedName: string,
        timeout: number,
        accessibility?: Types.ObservedElementAccessibility
    ): Types.ObservedElementAsyncRequest<HTMLElement | null> {
        const el = this.getElement(observedName, accessibility);

        if (el) {
            return {
                result: getPromise(this._win).resolve(el),
                cancel: () => {
                    /**/
                },
                status: ObservedElementRequestStatuses.Succeeded,
            };
        }

        let prefix: string;

        if (accessibility === ObservedElementAccessibilities.Accessible) {
            prefix = "a";
        } else if (accessibility === ObservedElementAccessibilities.Focusable) {
            prefix = "f";
        } else {
            prefix = "_";
        }

        const key = prefix + observedName;
        let w = this._waiting[key];

        if (w && w.request) {
            return w.request;
        }

        w = this._waiting[key] = {
            timer: this._win().setTimeout(() => {
                if (w.conditionTimer) {
                    this._win().clearTimeout(w.conditionTimer);
                }

                delete this._waiting[key];

                if (w.request) {
                    w.request.status = ObservedElementRequestStatuses.TimedOut;
                }

                if (w.resolve) {
                    w.resolve(null);
                }
            }, timeout),
        };

        const promise = new (getPromise(this._win))<HTMLElement | null>(
            (resolve, reject) => {
                w.resolve = resolve;
                w.reject = reject;
            }
        ).catch(() => {
            // Ignore the error, it is expected to be rejected when the request is canceled.
            return null;
        });

        const request: Types.ObservedElementAsyncRequest<HTMLElement | null> = {
            result: promise,
            cancel: () => {
                if (request.status === ObservedElementRequestStatuses.Waiting) {
                    // cancel() function is callable by user, someone might call it after request is finished,
                    // we are making sure that status of a finished request is not overriden.
                    request.status = ObservedElementRequestStatuses.Canceled;
                }
                this._rejectWaiting(key, true);
            },
            status: ObservedElementRequestStatuses.Waiting,
        };

        w.request = request;

        if (accessibility && this.getElement(observedName)) {
            // If the observed element is alread in DOM, but not accessible yet,
            // we need to run the wait logic.
            this._waitConditional(observedName);
        }

        return request;
    }

    requestFocus(
        observedName: string,
        timeout: number,
        options: Pick<FocusOptions, "preventScroll"> = {}
    ): Types.ObservedElementAsyncRequest<boolean> {
        const requestId = ++this._lastRequestFocusId;
        const currentRequestFocus = this._currentRequest;

        if (currentRequestFocus) {
            currentRequestFocus.cancel();
        }

        const request = this.waitElement(
            observedName,
            timeout,
            ObservedElementAccessibilities.Focusable
        );

        this._currentRequest = request;
        this._currentRequestTimestamp = Date.now();

        const ret: Types.ObservedElementAsyncRequest<boolean> = {
            result: request.result.then((element) =>
                this._lastRequestFocusId === requestId && element
                    ? this._tabster.focusedElement.focus(
                          element,
                          true,
                          undefined,
                          options.preventScroll
                      )
                    : false
            ),
            cancel: () => {
                request.cancel();
            },
            status: request.status,
        };

        request.result.finally(() => {
            if (this._currentRequest === request) {
                delete this._currentRequest;
            }

            ret.status = request.status;
        });

        return ret;
    }

    onObservedElementUpdate = (element: HTMLElement): void => {
        const observed = getTabsterOnElement(this._tabster, element)?.observed;
        const uid = getElementUId(this._win, element);
        let info: ObservedElementInfo | undefined = this._observedById[uid];

        if (observed && documentContains(element.ownerDocument, element)) {
            if (!info) {
                info = this._observedById[uid] = {
                    element: new WeakHTMLElement(this._win, element),
                };
            }

            observed.names.sort();
            const observedNames = observed.names;
            const prevNames = info.prevNames; // prevNames are already sorted

            if (this._isObservedNamesUpdated(observedNames, prevNames)) {
                if (prevNames) {
                    prevNames.forEach((prevName) => {
                        const obn = this._observedByName[prevName];

                        if (obn && obn[uid]) {
                            if (Object.keys(obn).length > 1) {
                                delete obn[uid];
                            } else {
                                delete this._observedByName[prevName];
                            }
                        }
                    });
                }

                info.prevNames = observedNames;
            }

            observedNames.forEach((observedName) => {
                let obn = this._observedByName[observedName];

                if (!obn) {
                    obn = this._observedByName[observedName] = {};
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                obn[uid] = info!;

                this._waitConditional(observedName);
            });
        } else if (info) {
            const prevNames = info.prevNames;

            if (prevNames) {
                prevNames.forEach((prevName) => {
                    const obn = this._observedByName[prevName];

                    if (obn && obn[uid]) {
                        if (Object.keys(obn).length > 1) {
                            delete obn[uid];
                        } else {
                            delete this._observedByName[prevName];
                        }
                    }
                });
            }

            delete this._observedById[uid];
        }
    };

    private _waitConditional(observedName: string): void {
        const waitingElementKey = "_" + observedName;
        const waitingAccessibleElementKey = "a" + observedName;
        const waitingFocusableElementKey = "f" + observedName;
        const waitingElement = this._waiting[waitingElementKey];
        const waitingAccessibleElement =
            this._waiting[waitingAccessibleElementKey];
        const waitingFocusableElement =
            this._waiting[waitingFocusableElementKey];
        const win = this._win();

        const resolve = (
            element: HTMLElement,
            key: string,
            waiting: ObservedWaiting,
            accessibility: Types.ObservedElementAccessibility
        ) => {
            const observed = getTabsterOnElement(
                this._tabster,
                element
            )?.observed;

            if (!observed || !observed.names.includes(observedName)) {
                return;
            }

            if (waiting.timer) {
                win.clearTimeout(waiting.timer);
            }

            delete this._waiting[key];

            if (waiting.request) {
                waiting.request.status =
                    ObservedElementRequestStatuses.Succeeded;
            }

            if (waiting.resolve) {
                waiting.resolve(element);
            }

            this.trigger(element, {
                names: [observedName],
                details: observed.details,
                accessibility,
            });
        };

        if (waitingElement) {
            const element = this.getElement(observedName);

            if (element && documentContains(element.ownerDocument, element)) {
                resolve(
                    element,
                    waitingElementKey,
                    waitingElement,
                    ObservedElementAccessibilities.Any
                );
            }
        }

        if (
            waitingAccessibleElement &&
            !waitingAccessibleElement.conditionTimer
        ) {
            const resolveAccessible = () => {
                const element = this.getElement(observedName);

                if (
                    element &&
                    documentContains(element.ownerDocument, element) &&
                    this._tabster.focusable.isAccessible(element)
                ) {
                    resolve(
                        element,
                        waitingAccessibleElementKey,
                        waitingAccessibleElement,
                        ObservedElementAccessibilities.Accessible
                    );
                } else {
                    waitingAccessibleElement.conditionTimer = win.setTimeout(
                        resolveAccessible,
                        _conditionCheckTimeout
                    );
                }
            };

            resolveAccessible();
        }

        if (
            waitingFocusableElement &&
            !waitingFocusableElement.conditionTimer
        ) {
            const resolveFocusable = () => {
                const element = this.getElement(observedName);

                if (
                    element &&
                    documentContains(element.ownerDocument, element) &&
                    this._tabster.focusable.isFocusable(element, true)
                ) {
                    resolve(
                        element,
                        waitingFocusableElementKey,
                        waitingFocusableElement,
                        ObservedElementAccessibilities.Focusable
                    );
                } else {
                    waitingFocusableElement.conditionTimer = win.setTimeout(
                        resolveFocusable,
                        _conditionCheckTimeout
                    );
                }
            };

            resolveFocusable();
        }
    }
}
