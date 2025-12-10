/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "../Instance";
import * as Types from "../Types";
import {
    ObservedElementAccessibilities,
    ObservedElementRequestStatuses,
    ObservedElementFailureReasons,
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
    onObservedElementChange?: (change: Types.ObservedElementChange) => void;

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
        this.onObservedElementChange = undefined;
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

                    // Provide callback to access focused element using WeakRef to avoid memory leaks
                    const elementRef = new WeakRef(e);
                    current.diagnostics.getCancelTriggeringElement = () =>
                        elementRef.deref() ?? null;
                    current.diagnostics.reason =
                        ObservedElementFailureReasons.CanceledFocusChange;
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

    private _populateTimeoutDiagnostics(
        request: Types.ObservedElementAsyncRequest<HTMLElement | null>,
        observedName: string,
        timeout: number,
        startTime: number
    ): void {
        const elementInDOM = this.getElement(observedName);
        const inDOM = !!elementInDOM;
        let isAccessible: boolean | undefined;
        let isFocusable: boolean | undefined;
        let reason: Types.ObservedElementFailureReason;

        if (!elementInDOM) {
            reason = ObservedElementFailureReasons.TimeoutElementNotInDOM;
        } else {
            isAccessible = this._tabster.focusable.isAccessible(elementInDOM);
            isFocusable = this._tabster.focusable.isFocusable(
                elementInDOM,
                true
            );

            if (!isAccessible) {
                reason =
                    ObservedElementFailureReasons.TimeoutElementNotAccessible;
            } else if (!isFocusable) {
                reason =
                    ObservedElementFailureReasons.TimeoutElementNotFocusable;
            } else {
                reason = ObservedElementFailureReasons.TimeoutElementNotReady;
            }
        }

        request.diagnostics.reason = reason;
        request.diagnostics.waitForElementDuration = Date.now() - startTime;
        request.diagnostics.targetState = {
            inDOM,
            isAccessible,
            isFocusable,
        };
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

    private _notifyObservedElementChange(
        element: HTMLElement,
        observedNames: string[],
        prevNames: string[] | undefined,
        isNewElement: boolean
    ): void {
        if (!this.onObservedElementChange) {
            return;
        }

        const addedNames = observedNames.filter(
            (name) => !prevNames || !prevNames.includes(name)
        );
        const removedNames = prevNames
            ? prevNames.filter((name) => !observedNames.includes(name))
            : [];

        if (isNewElement) {
            // Brand new element added
            this.onObservedElementChange({
                element,
                type: "added",
                names: observedNames,
                addedNames: observedNames,
            });
        } else if (addedNames.length > 0 || removedNames.length > 0) {
            // Existing element with names updated
            this.onObservedElementChange({
                element,
                type: "updated",
                names: observedNames,
                addedNames: addedNames.length > 0 ? addedNames : undefined,
                removedNames:
                    removedNames.length > 0 ? removedNames : undefined,
            });
        }
    }

    /**
     * Returns all registered observed names with their respective elements and full names arrays
     *
     * @returns Map<string, Array<{ element: HTMLElement; names: string[] }>> A map where keys are observed names
     * and values are arrays of objects containing the element and its complete names array (in the order they were defined)
     */
    getAllObservedElements(): Map<
        string,
        Array<{ element: HTMLElement; names: string[] }>
    > {
        const result = new Map<
            string,
            Array<{ element: HTMLElement; names: string[] }>
        >();

        for (const name of Object.keys(this._observedByName)) {
            const elementsWithNames: Array<{
                element: HTMLElement;
                names: string[];
            }> = [];
            const observed = this._observedByName[name];

            for (const uid of Object.keys(observed)) {
                const el = observed[uid].element.get();
                if (el) {
                    const info = this._observedById[uid];
                    elementsWithNames.push({
                        element: el,
                        names: info?.prevNames || [],
                    });
                }
            }

            if (elementsWithNames.length > 0) {
                result.set(name, elementsWithNames);
            }
        }

        return result;
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
        const startTime = Date.now();
        const el = this.getElement(observedName, accessibility);

        if (el) {
            return {
                result: getPromise(this._win).resolve(el),
                cancel: () => {
                    /**/
                },
                status: ObservedElementRequestStatuses.Succeeded,
                diagnostics: {
                    waitForElementDuration: Date.now() - startTime,
                },
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
                    this._populateTimeoutDiagnostics(
                        w.request,
                        observedName,
                        timeout,
                        startTime
                    );
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
                    request.diagnostics.waitForElementDuration =
                        Date.now() - startTime;
                }
                this._rejectWaiting(key, true);
            },
            status: ObservedElementRequestStatuses.Waiting,
            diagnostics: {},
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
            currentRequestFocus.diagnostics.reason =
                ObservedElementFailureReasons.SupersededByNewRequest;
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
            result: request.result.then((element) => {
                if (this._lastRequestFocusId !== requestId || !element) {
                    return false;
                }

                const focusResult = this._tabster.focusedElement.focus(
                    element,
                    true,
                    undefined,
                    options.preventScroll
                );

                if (!focusResult) {
                    // Focus call failed
                    request.diagnostics.reason =
                        ObservedElementFailureReasons.FocusCallFailed;
                }

                return focusResult;
            }),
            cancel: () => {
                request.cancel();
            },
            status: request.status,
            diagnostics: request.diagnostics,
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
            const isNewElement = !info;

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

                this._notifyObservedElementChange(
                    element,
                    observedNames,
                    prevNames,
                    isNewElement
                );
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

                this.onObservedElementChange?.({
                    element,
                    type: "removed",
                    names: [],
                    removedNames: prevNames,
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
