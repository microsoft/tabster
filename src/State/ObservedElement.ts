/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "../Instance.js";
import type * as Types from "../Types.js";
import {
    ObservedElementAccessibilities,
    ObservedElementRequestStatuses,
    ObservedElementFailureReasons,
} from "../Consts.js";
import { documentContains, getElementUId, WeakHTMLElement } from "../Utils.js";
import { createSubscribable } from "./Subscribable.js";

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

export function createObservedElementAPI(
    tabster: Types.TabsterCore
): Types.ObservedElementAPI {
    const sub = createSubscribable<HTMLElement, Types.ObservedElementDetails>();
    const win = tabster.getWindow;
    const waiting: Record<string, ObservedWaiting> = {};
    let lastRequestFocusId = 0;
    let observedById: { [uid: string]: ObservedElementInfo } = {};
    let observedByName: {
        [name: string]: { [uid: string]: ObservedElementInfo };
    } = {};
    let currentRequest:
        | Types.ObservedElementAsyncRequest<HTMLElement | null>
        | undefined;
    let currentRequestTimestamp = 0;

    const onFocus = (e: HTMLElement | undefined): void => {
        if (e) {
            if (currentRequest) {
                const delta = Date.now() - currentRequestTimestamp;
                const settleTime = 300;

                if (delta >= settleTime) {
                    // Giving some time for the focus to settle before
                    // automatically cancelling the current request on focus change.
                    const current = currentRequest;
                    currentRequest = undefined;

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

    const rejectWaiting = (key: string, shouldResolve?: boolean): void => {
        const w = waiting[key];

        if (w) {
            const w2 = win();

            if (w.timer) {
                w2.clearTimeout(w.timer);
            }

            if (w.conditionTimer) {
                w2.clearTimeout(w.conditionTimer);
            }

            if (!shouldResolve && w.reject) {
                w.reject();
            } else if (shouldResolve && w.resolve) {
                w.resolve(null);
            }

            delete waiting[key];
        }
    };

    const populateTimeoutDiagnostics = (
        request: Types.ObservedElementAsyncRequest<HTMLElement | null>,
        observedName: string,
        timeout: number,
        startTime: number
    ): void => {
        const elementInDOM = api.getElement(observedName);
        const inDOM = !!elementInDOM;
        let isAccessible: boolean | undefined;
        let isFocusable: boolean | undefined;
        let reason: Types.ObservedElementFailureReason;

        if (!elementInDOM) {
            reason = ObservedElementFailureReasons.TimeoutElementNotInDOM;
        } else {
            isAccessible = tabster.focusable.isAccessible(elementInDOM);
            isFocusable = tabster.focusable.isFocusable(elementInDOM, true);

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
    };

    const isObservedNamesUpdated = (cur: string[], prev?: string[]) => {
        if (!prev || cur.length !== prev.length) {
            return true;
        }
        for (let i = 0; i < cur.length; ++i) {
            if (cur[i] !== prev[i]) {
                return true;
            }
        }
        return false;
    };

    const notifyObservedElementChange = (
        element: HTMLElement,
        observedNames: string[],
        prevNames: string[] | undefined,
        isNewElement: boolean
    ): void => {
        if (!api.onObservedElementChange) {
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
            api.onObservedElementChange({
                element,
                type: "added",
                names: observedNames,
                addedNames: observedNames,
            });
        } else if (addedNames.length > 0 || removedNames.length > 0) {
            // Existing element with names updated
            api.onObservedElementChange({
                element,
                type: "updated",
                names: observedNames,
                addedNames: addedNames.length > 0 ? addedNames : undefined,
                removedNames:
                    removedNames.length > 0 ? removedNames : undefined,
            });
        }
    };

    const waitConditional = (observedName: string): void => {
        const waitingElementKey = "_" + observedName;
        const waitingAccessibleElementKey = "a" + observedName;
        const waitingFocusableElementKey = "f" + observedName;
        const waitingElement = waiting[waitingElementKey];
        const waitingAccessibleElement = waiting[waitingAccessibleElementKey];
        const waitingFocusableElement = waiting[waitingFocusableElementKey];
        const w = win();

        const resolve = (
            element: HTMLElement,
            key: string,
            wait: ObservedWaiting,
            accessibility: Types.ObservedElementAccessibility
        ) => {
            const observed = getTabsterOnElement(tabster, element)?.observed;

            if (!observed || !observed.names.includes(observedName)) {
                return;
            }

            if (wait.timer) {
                w.clearTimeout(wait.timer);
            }

            delete waiting[key];

            if (wait.request) {
                wait.request.status = ObservedElementRequestStatuses.Succeeded;
            }

            if (wait.resolve) {
                wait.resolve(element);
            }

            sub.trigger(element, {
                names: [observedName],
                details: observed.details,
                accessibility,
            });
        };

        if (waitingElement) {
            const element = api.getElement(observedName);

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
                const element = api.getElement(observedName);

                if (
                    element &&
                    documentContains(element.ownerDocument, element) &&
                    tabster.focusable.isAccessible(element)
                ) {
                    resolve(
                        element,
                        waitingAccessibleElementKey,
                        waitingAccessibleElement,
                        ObservedElementAccessibilities.Accessible
                    );
                } else {
                    waitingAccessibleElement.conditionTimer = w.setTimeout(
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
                const element = api.getElement(observedName);

                if (
                    element &&
                    documentContains(element.ownerDocument, element) &&
                    tabster.focusable.isFocusable(element, true)
                ) {
                    resolve(
                        element,
                        waitingFocusableElementKey,
                        waitingFocusableElement,
                        ObservedElementAccessibilities.Focusable
                    );
                } else {
                    waitingFocusableElement.conditionTimer = w.setTimeout(
                        resolveFocusable,
                        _conditionCheckTimeout
                    );
                }
            };

            resolveFocusable();
        }
    };

    tabster.queueInit(() => {
        tabster.focusedElement.subscribe(onFocus);
    });

    const api: Types.ObservedElementAPI = {
        onObservedElementChange: undefined,

        subscribe: sub.subscribe,
        subscribeFirst: sub.subscribeFirst,
        unsubscribe: sub.unsubscribe,

        dispose(): void {
            tabster.focusedElement.unsubscribe(onFocus);

            for (const key of Object.keys(waiting)) {
                rejectWaiting(key);
            }

            observedById = {};
            observedByName = {};
            api.onObservedElementChange = undefined;
            sub.dispose();
        },

        /**
         * Returns all registered observed names with their respective elements and full names arrays
         */
        getAllObservedElements(): Map<
            string,
            Array<{ element: HTMLElement; names: string[] }>
        > {
            const result = new Map<
                string,
                Array<{ element: HTMLElement; names: string[] }>
            >();

            for (const name of Object.keys(observedByName)) {
                const elementsWithNames: Array<{
                    element: HTMLElement;
                    names: string[];
                }> = [];
                const observed = observedByName[name];

                for (const uid of Object.keys(observed)) {
                    const el = observed[uid].element.get();
                    if (el) {
                        const info = observedById[uid];
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
        },

        /**
         * Returns existing element by observed name
         */
        getElement(
            observedName: string,
            accessibility?: Types.ObservedElementAccessibility
        ): HTMLElement | null {
            const o = observedByName[observedName];

            if (o) {
                for (const uid of Object.keys(o)) {
                    let el = o[uid].element.get() || null;
                    if (el) {
                        if (
                            (accessibility ===
                                ObservedElementAccessibilities.Accessible &&
                                !tabster.focusable.isAccessible(el)) ||
                            (accessibility ===
                                ObservedElementAccessibilities.Focusable &&
                                !tabster.focusable.isFocusable(el, true))
                        ) {
                            el = null;
                        }
                    } else {
                        delete o[uid];
                        delete observedById[uid];
                    }

                    return el;
                }
            }

            return null;
        },

        /**
         * Waits for the element to appear in the DOM and returns it.
         */
        waitElement(
            observedName: string,
            timeout: number,
            accessibility?: Types.ObservedElementAccessibility
        ): Types.ObservedElementAsyncRequest<HTMLElement | null> {
            const startTime = Date.now();
            const el = api.getElement(observedName, accessibility);

            if (el) {
                return {
                    result: Promise.resolve(el),
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
            } else if (
                accessibility === ObservedElementAccessibilities.Focusable
            ) {
                prefix = "f";
            } else {
                prefix = "_";
            }

            const key = prefix + observedName;
            let w = waiting[key];

            if (w && w.request) {
                return w.request;
            }

            w = waiting[key] = {
                timer: win().setTimeout(() => {
                    if (w.conditionTimer) {
                        win().clearTimeout(w.conditionTimer);
                    }

                    delete waiting[key];

                    if (w.request) {
                        w.request.status =
                            ObservedElementRequestStatuses.TimedOut;
                        populateTimeoutDiagnostics(
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

            const promise = new Promise<HTMLElement | null>(
                (resolve, reject) => {
                    w.resolve = resolve;
                    w.reject = reject;
                }
            ).catch(() => {
                // Ignore the error, it is expected to be rejected when the request is canceled.
                return null;
            });

            const request: Types.ObservedElementAsyncRequest<HTMLElement | null> =
                {
                    result: promise,
                    cancel: () => {
                        if (
                            request.status ===
                            ObservedElementRequestStatuses.Waiting
                        ) {
                            // cancel() function is callable by user, someone might call it after request is finished,
                            // we are making sure that status of a finished request is not overriden.
                            request.status =
                                ObservedElementRequestStatuses.Canceled;
                            request.diagnostics.waitForElementDuration =
                                Date.now() - startTime;
                        }
                        rejectWaiting(key, true);
                    },
                    status: ObservedElementRequestStatuses.Waiting,
                    diagnostics: {},
                };

            w.request = request;

            if (accessibility && api.getElement(observedName)) {
                // If the observed element is alread in DOM, but not accessible yet,
                // we need to run the wait logic.
                waitConditional(observedName);
            }

            return request;
        },

        requestFocus(
            observedName: string,
            timeout: number,
            options: Pick<FocusOptions, "preventScroll"> = {}
        ): Types.ObservedElementAsyncRequest<boolean> {
            const requestId = ++lastRequestFocusId;
            const currentRequestFocus = currentRequest;

            if (currentRequestFocus) {
                currentRequestFocus.diagnostics.reason =
                    ObservedElementFailureReasons.SupersededByNewRequest;
                currentRequestFocus.cancel();
            }

            const request = api.waitElement(
                observedName,
                timeout,
                ObservedElementAccessibilities.Focusable
            );

            currentRequest = request;
            currentRequestTimestamp = Date.now();

            const ret: Types.ObservedElementAsyncRequest<boolean> = {
                result: request.result.then((element) => {
                    if (lastRequestFocusId !== requestId) {
                        request.diagnostics.reason =
                            ObservedElementFailureReasons.SupersededByNewRequest;
                        return false;
                    }

                    if (!element) {
                        // Element was not found - reason should already be set by timeout or cancellation
                        // If not set, default to timeout reason
                        if (request.diagnostics.reason === undefined) {
                            request.diagnostics.reason =
                                ObservedElementFailureReasons.TimeoutElementNotInDOM;
                        }
                        return false;
                    }

                    const focusResult = tabster.focusedElement.focus(
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
                if (currentRequest === request) {
                    currentRequest = undefined;
                }

                ret.status = request.status;
            });

            return ret;
        },

        onObservedElementUpdate(element: HTMLElement): void {
            const observed = getTabsterOnElement(tabster, element)?.observed;
            const uid = getElementUId(win, element);
            let info: ObservedElementInfo | undefined = observedById[uid];

            if (observed && documentContains(element.ownerDocument, element)) {
                const isNewElement = !info;

                if (!info) {
                    info = observedById[uid] = {
                        element: new WeakHTMLElement(element),
                    };
                }

                observed.names.sort();
                const observedNames = observed.names;
                const prevNames = info.prevNames; // prevNames are already sorted

                if (isObservedNamesUpdated(observedNames, prevNames)) {
                    if (prevNames) {
                        prevNames.forEach((prevName) => {
                            const obn = observedByName[prevName];

                            if (obn && obn[uid]) {
                                if (Object.keys(obn).length > 1) {
                                    delete obn[uid];
                                } else {
                                    delete observedByName[prevName];
                                }
                            }
                        });
                    }

                    info.prevNames = observedNames;

                    notifyObservedElementChange(
                        element,
                        observedNames,
                        prevNames,
                        isNewElement
                    );
                }

                observedNames.forEach((observedName) => {
                    let obn = observedByName[observedName];

                    if (!obn) {
                        obn = observedByName[observedName] = {};
                    }

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    obn[uid] = info!;

                    waitConditional(observedName);
                });
            } else if (info) {
                const prevNames = info.prevNames;

                if (prevNames) {
                    prevNames.forEach((prevName) => {
                        const obn = observedByName[prevName];

                        if (obn && obn[uid]) {
                            if (Object.keys(obn).length > 1) {
                                delete obn[uid];
                            } else {
                                delete observedByName[prevName];
                            }
                        }
                    });

                    api.onObservedElementChange?.({
                        element,
                        type: "removed",
                        names: [],
                        removedNames: prevNames,
                    });
                }

                delete observedById[uid];
            }
        },
    };

    return api;
}
