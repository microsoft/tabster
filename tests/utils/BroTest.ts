/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { PassThrough } from "stream";
import { EvaluateFunc, Page, Frame, KeyInput, ElementHandle } from "puppeteer";
import {
    createTabster,
    disposeTabster,
    getCrossOrigin,
    getDeloser,
    getDummyInputContainer,
    getGroupper,
    getModalizer,
    getMover,
    getObservedElement,
    getOutline,
    getRestorer,
    getTabster,
    getTabsterAttribute,
    makeNoOp,
    mergeTabsterProps,
    setTabsterAttribute,
    Types,
} from "tabster";

const domKey = process.env.SHADOWDOM ? "shadowDOM" : "dom";

// jest.setTimeout(900000000);

import type {
    PipeableStream,
    RenderToPipeableStreamOptions,
} from "react-dom/server";

import type * as Events from "../../src/Events";

// Importing the production version so that React doesn't complain in the test output.
const renderToPipeableStream: (
    element: React.ReactElement,
    options?: RenderToPipeableStreamOptions
) => PipeableStream =
    require("../../node_modules/react-dom/cjs/react-dom-server.node.production.min").renderToPipeableStream;

function renderToStringFromStream(
    element: React.ReactElement
): Promise<string> {
    return new Promise((resolve, reject) => {
        const stream = new PassThrough();
        let html = "";

        const { pipe } = renderToPipeableStream(element, {
            onShellReady() {
                pipe(stream);
            },
            onError(err) {
                reject(err);
            },
        });

        stream.on("data", (chunk) => {
            html += chunk.toString();
        });

        stream.on("end", () => {
            resolve(html);
        });

        stream.on("error", (err) => {
            reject(err);
        });
    });
}

declare const page: Page;

type TabsterParts = Partial<{
    modalizer: boolean;
    deloser: boolean;
    outline: boolean;
    mover: boolean;
    groupper: boolean;
    observed: boolean;
    crossOrigin: boolean;
    restorer: boolean;
}>;

let _lastRnd = 0;

async function goToPageWithRetry(url: string, times: number) {
    if (times === 0) {
        throw new Error("Failed to connect to the page after multiple retries");
    }

    try {
        await page.goto(url);
    } catch (err) {
        console.error("failed to connect to test page", url);
        console.error(err);
        await new Promise((res) => setTimeout(res, 3000));
        await goToPageWithRetry(url, times - 1);
    }
}

interface WindowWithConsoleErrors extends Window {
    __consoleErrors?: any[][];
}

async function waitPageReadyAndDecorateConsoleError(
    frame: Page | Frame
): Promise<void> {
    await frame.$("body");

    await frame.evaluate(() => {
        const win = window as WindowWithConsoleErrors;

        if (!win.__consoleErrors) {
            win.__consoleErrors = [];

            const origConsoleError = console.error;

            console.error = function (...args: any[]) {
                origConsoleError.apply(console, args);
                win.__consoleErrors?.push(args.map((a) => `${a}`));
            };
        }

        return new Promise((resolve) => {
            window.setTimeout(check, 10);

            function check() {
                if (typeof getTabsterTestVariables !== "undefined") {
                    resolve(true);
                } else {
                    window.setTimeout(check, 10);
                }
            }
        });
    });
}

export interface BroTestTabsterTestVariables {
    disposeTabster?: typeof disposeTabster;
    createTabster?: typeof createTabster;
    getTabster?: typeof getTabster;
    getCrossOrigin?: typeof getCrossOrigin;
    getDeloser?: typeof getDeloser;
    getGroupper?: typeof getGroupper;
    getModalizer?: typeof getModalizer;
    getMover?: typeof getMover;
    getRestorer?: typeof getRestorer;
    getObservedElement?: typeof getObservedElement;
    getOutline?: typeof getOutline;
    makeNoOp?: typeof makeNoOp;
    getTabsterAttribute?: typeof getTabsterAttribute;
    setTabsterAttribute?: typeof setTabsterAttribute;
    mergeTabsterProps?: typeof mergeTabsterProps;
    getDummyInputContainer?: typeof getDummyInputContainer;
    core?: Types.Tabster;
    modalizer?: Types.ModalizerAPI;
    deloser?: Types.DeloserAPI;
    outline?: Types.OutlineAPI;
    mover?: Types.MoverAPI;
    groupper?: Types.GroupperAPI;
    observedElement?: Types.ObservedElementAPI;
    crossOrigin?: Types.CrossOriginAPI;
    dom?: Types.DOMAPI;
    shadowDOM?: Types.DOMAPI;
    Events?: typeof Events;
}

export function getTestPageURL(parts?: TabsterParts): string {
    const port = parseInt(process.env.PORT || "0", 10) || 8080;
    const enableShadowDOM = !!process.env.SHADOWDOM;
    const controlTab = !process.env.STORYBOOK_UNCONTROLLED;
    const rootDummyInputs = !!process.env.STORYBOOK_ROOT_DUMMY_INPUTS;
    return `http://localhost:${port}/?shadowdom=${enableShadowDOM}&controlTab=${controlTab}&rootDummyInputs=${rootDummyInputs}${
        parts
            ? `&parts=${Object.keys(parts)
                  .filter((part: keyof TabsterParts) => parts[part])
                  .join(",")}`
            : ""
    }&rnd=${++_lastRnd}`;
}

export async function bootstrapTabsterPage(parts?: TabsterParts) {
    await goToPageWithRetry(getTestPageURL(parts), 4);
    await expect(page.title()).resolves.toMatch("Tabster Test");
    await waitPageReadyAndDecorateConsoleError(page);
}

async function sleep(time: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, time);
    });
}

export interface BrowserElement {
    tag: string;
    textContent: string | null;
    attributes: { [name: string]: string };
}

interface BroTestFrameStackItem {
    id: string;
    frame: Page | Frame;
}

abstract class BroTestItem {
    protected _frameStack: BroTestFrameStackItem[];

    constructor(frameStack: BroTestFrameStackItem[]) {
        this._frameStack = frameStack;
    }

    abstract run(): Promise<any>;
}

class BroTestItemEval extends BroTestItem {
    private _func: EvaluateFunc<any>;
    private _args: unknown[];
    private _setLastEval: (lastEval: any) => void;

    constructor(
        frameStack: BroTestFrameStackItem[],
        func: EvaluateFunc<any>,
        args: unknown[],
        setLastEval: (lastEval: any) => void
    ) {
        super(frameStack);
        this._func = func;
        this._args = args;
        this._setLastEval = setLastEval;
    }

    async run() {
        const lastEval = await this._frameStack[0].frame.evaluate(
            this._func,
            ...this._args
        );
        this._setLastEval(lastEval);
    }
}

class BroTestItemWait extends BroTestItem {
    private _time: number;

    constructor(frameStack: BroTestFrameStackItem[], time: number) {
        super(frameStack);
        this._time = time;
    }

    async run() {
        await this._frameStack[0].frame.evaluate((wait) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(true);
                }, wait);
            });
        }, this._time);
    }
}

class BroTestItemCallback extends BroTestItem {
    private _callback: () => Promise<void>;

    constructor(
        frameStack: BroTestFrameStackItem[],
        callback: () => Promise<void>
    ) {
        super(frameStack);
        this._callback = callback;
    }

    async run() {
        await this._callback();
    }
}

class BroTestItemHTML extends BroTestItem {
    private _html: JSX.Element;

    constructor(frameStack: BroTestFrameStackItem[], html: JSX.Element) {
        super(frameStack);
        this._html = html;
    }

    async run() {
        const frame = this._frameStack[0].frame;

        await frame.evaluate(
            (enabeShadowDOM, el, html) => {
                const shadowHost = document.createElement("div");

                if (enabeShadowDOM) {
                    shadowHost.attachShadow({ mode: "open" });

                    const shadowRoot = shadowHost.shadowRoot;

                    if (shadowRoot) {
                        shadowRoot.innerHTML = html;
                    }
                } else {
                    shadowHost.innerHTML = html;
                }

                if (el) {
                    el.appendChild(shadowHost);
                }
            },
            process.env.SHADOWDOM,
            await frame.evaluateHandle(
                (domKey: "dom" | "shadowDOM") =>
                    getTabsterTestVariables()[domKey]?.querySelector(
                        document,
                        "body"
                    ),
                domKey
            ),
            await renderToStringFromStream(this._html)
        );
        await sleep(100);
    }
}

class BroTestItemFrame extends BroTestItem {
    private _id: string;

    constructor(frameStack: BroTestFrameStackItem[], id: string) {
        super(frameStack);
        this._id = id;
    }

    async run() {
        const frameHandle = (await this._frameStack[0].frame.evaluateHandle(
            (id, domKey: "dom" | "shadowDOM") =>
                getTabsterTestVariables()[domKey]?.querySelector(
                    document,
                    `iframe[id='${id}']`
                ),
            this._id,
            domKey
        )) as ElementHandle<HTMLIFrameElement> | null;

        if (frameHandle) {
            const frame = await frameHandle.contentFrame();

            if (frame) {
                this._frameStack.unshift({ id: this._id, frame });
                await waitPageReadyAndDecorateConsoleError(frame);
                return;
            }
        }

        throw new Error(
            `<iframe id="${this._id}"> is not available${
                this._frameStack.length > 1
                    ? ` in <iframe id="${this._frameStack[0].id}">`
                    : ""
            }`
        );
    }
}

class BroTestItemUnframe extends BroTestItem {
    private _levels: number;

    constructor(frameStack: BroTestFrameStackItem[], levels = 1) {
        super(frameStack);
        this._levels = levels;
    }

    async run() {
        while (this._levels-- > 0) {
            if (this._frameStack.length > 1) {
                this._frameStack.shift();
            } else {
                throw new Error("Not enough levels to unframe");
            }
        }
    }
}

class BroTestItemReportConsoleErrors extends BroTestItem {
    private _throwError?: boolean;

    constructor(frameStack: BroTestFrameStackItem[], throwError?: boolean) {
        super(frameStack);
        this._throwError = throwError;
    }

    async run() {
        const consoleErrors = await this._frameStack[0].frame.evaluate(() => {
            const win = window as WindowWithConsoleErrors;
            const ret = win.__consoleErrors || [];
            win.__consoleErrors = [];
            return ret;
        });

        if (consoleErrors && consoleErrors.length) {
            const errorMessage = `Had ${
                consoleErrors.length
            } console.error() calls in the browser:\n${consoleErrors
                .map(
                    (err: any[], index: number) =>
                        `${index + 1}. ${err.join(" ")}`
                )
                .join("\n")}`;

            console.error(errorMessage);

            if (this._throwError) {
                throw new Error(errorMessage);
            }
        }
    }
}

export class BroTest implements PromiseLike<undefined> {
    private _chain: BroTestItem[] = [];
    private _nextTimer: number | undefined;
    private _promise: Promise<undefined>;
    private _resolve:
        | ((value?: undefined | PromiseLike<undefined>) => void)
        | undefined;
    private _reject: ((reason?: any) => void) | undefined;
    private _lastEval: any;
    private _frameStack: BroTestFrameStackItem[];

    constructor(html?: JSX.Element) {
        this._promise = new Promise<undefined>((resolve, reject) => {
            this._resolve = resolve;
            this._reject! = reject;
        });

        this._frameStack = [{ id: "_top", frame: page }];

        if (html) {
            this.html(html);
        }

        this._next();
    }

    then<TResult1 = undefined, TResult2 = never>(
        onfulfilled?:
            | ((value: any) => TResult1 | PromiseLike<TResult1>)
            | undefined
            | null,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | undefined
            | null
    ): Promise<TResult1 | TResult2> {
        return this._promise.then(onfulfilled, onrejected);
    }

    catch<TResult = never>(
        onrejected?:
            | ((reason: any) => TResult | PromiseLike<TResult>)
            | undefined
            | null
    ): Promise<undefined | TResult> {
        return this._promise.catch(onrejected);
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<undefined> {
        return this._promise.finally(onfinally);
    }

    private _next() {
        if (this._nextTimer) {
            clearTimeout(this._nextTimer);
        }

        this._nextTimer = setTimeout(async () => {
            delete this._nextTimer;

            const item = this._chain.shift();

            if (item) {
                await item.run().catch((reason) => {
                    if (this._reject) {
                        this._reject(reason);
                    }
                });
                this._next();
            } else if (this._resolve) {
                this._resolve();
            }
        }, 0) as any;
    }

    private _reportConsoleErrors(throwError?: boolean): void {
        this._chain.push(
            new BroTestItemReportConsoleErrors(this._frameStack, throwError)
        );
    }

    html(html: JSX.Element) {
        this._chain.push(new BroTestItemHTML(this._frameStack, html));
        return this;
    }

    frame(...id: string[]) {
        for (const i of id) {
            this._chain.push(new BroTestItemFrame(this._frameStack, i));
        }
        return this;
    }

    unframe(levels = 1) {
        this._chain.push(new BroTestItemUnframe(this._frameStack, levels));
        return this;
    }

    wait(time: number) {
        this._chain.push(new BroTestItemWait(this._frameStack, time));
        this._reportConsoleErrors(true);
        return this;
    }

    /**
     * @param time - in milliseconds
     */
    debug(time = 3600000) {
        jest.setTimeout(time);
        return this.wait(time);
    }

    eval(func: EvaluateFunc<any>, ...args: unknown[]): BroTest {
        this._chain.push(
            new BroTestItemEval(
                this._frameStack,
                func,
                args,
                (lastEval) => (this._lastEval = lastEval)
            )
        );

        this._reportConsoleErrors(true);

        return this;
    }

    check(callback: (lastEval: any) => void) {
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                callback(this._lastEval);
            })
        );

        return this;
    }

    press(
        key: KeyInput,
        options?:
            | {
                  text?: string | undefined;
                  delay?: number | undefined;
                  ctrl?: boolean;
                  shift?: boolean;
                  alt?: boolean;
                  meta?: boolean;
              }
            | undefined
    ) {
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                const { shift, ctrl, alt, meta } = options ?? {};

                if (shift) {
                    await page.keyboard.down("Shift");
                }

                if (ctrl) {
                    await page.keyboard.down("Control");
                }

                if (alt) {
                    await page.keyboard.down("Alt");
                }

                if (meta) {
                    await page.keyboard.down("Meta");
                }

                await page.keyboard.press(key, options);

                if (shift) {
                    await page.keyboard.up("Shift");
                }

                if (ctrl) {
                    await page.keyboard.up("Control");
                }

                if (alt) {
                    await page.keyboard.up("Alt");
                }

                if (meta) {
                    await page.keyboard.up("Meta");
                }
            })
        );

        this._reportConsoleErrors(true);

        return this;
    }

    private _pressKey(
        key: KeyInput,
        shift?: boolean,
        ctrl?: boolean,
        alt?: boolean,
        meta?: boolean
    ) {
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                if (shift) {
                    await page.keyboard.down("Shift");
                }

                if (ctrl) {
                    await page.keyboard.down("Control");
                }

                if (alt) {
                    await page.keyboard.down("Alt");
                }

                if (meta) {
                    await page.keyboard.down("Meta");
                }

                await page.keyboard.press(key);

                if (shift) {
                    await page.keyboard.up("Shift");
                }

                if (ctrl) {
                    await page.keyboard.up("Control");
                }

                if (alt) {
                    await page.keyboard.up("Alt");
                }

                if (meta) {
                    await page.keyboard.up("Meta");
                }
            })
        );

        // Sometimes the next action in chain happens too fast.
        this._chain.push(new BroTestItemWait(this._frameStack, 0));

        this._reportConsoleErrors(true);

        return this;
    }

    /**
     * Simulates user click on an element
     * This cannot be `element.click()` because native clicks on focusable elements will focus them
     */
    click(selector: string) {
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                const el = (await this._frameStack[0].frame.evaluateHandle(
                    (selector, domKey: "dom" | "shadowDOM") =>
                        getTabsterTestVariables()[domKey]?.querySelector(
                            document,
                            selector
                        ),
                    selector,
                    domKey
                )) as ElementHandle<Element> | null;
                await el?.click();
            })
        );

        this._reportConsoleErrors();

        return this;
    }

    pressTab(
        shiftKey?: boolean,
        ctrlKey?: boolean,
        altKey?: boolean,
        metaKey?: boolean
    ) {
        return this._pressKey("Tab", shiftKey, ctrlKey, altKey, metaKey);
    }
    pressEsc(
        shiftKey?: boolean,
        ctrlKey?: boolean,
        altKey?: boolean,
        metaKey?: boolean
    ) {
        return this._pressKey("Escape", shiftKey, ctrlKey, altKey, metaKey);
    }
    pressEnter(
        shiftKey?: boolean,
        ctrlKey?: boolean,
        altKey?: boolean,
        metaKey?: boolean
    ) {
        return this._pressKey("Enter", shiftKey, ctrlKey, altKey, metaKey);
    }
    pressUp(
        shiftKey?: boolean,
        ctrlKey?: boolean,
        altKey?: boolean,
        metaKey?: boolean
    ) {
        return this._pressKey("ArrowUp", shiftKey, ctrlKey, altKey, metaKey);
    }
    pressDown(
        shiftKey?: boolean,
        ctrlKey?: boolean,
        altKey?: boolean,
        metaKey?: boolean
    ) {
        return this._pressKey("ArrowDown", shiftKey, ctrlKey, altKey, metaKey);
    }
    pressLeft(
        shiftKey?: boolean,
        ctrlKey?: boolean,
        altKey?: boolean,
        metaKey?: boolean
    ) {
        return this._pressKey("ArrowLeft", shiftKey, ctrlKey, altKey, metaKey);
    }
    pressRight(
        shiftKey?: boolean,
        ctrlKey?: boolean,
        altKey?: boolean,
        metaKey?: boolean
    ) {
        return this._pressKey("ArrowRight", shiftKey, ctrlKey, altKey, metaKey);
    }

    scrollTo(selector: string, x: number, y: number) {
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                await page.waitForFunction(
                    (selector, domKey: "dom" | "shadowDOM") =>
                        getTabsterTestVariables()[domKey]?.querySelector(
                            document,
                            selector
                        ),
                    {},
                    selector,
                    domKey
                );
                await page.evaluate(
                    (
                        selector: string,
                        x: number,
                        y: number,
                        domKey: "dom" | "shadowDOM"
                    ) => {
                        const scrollContainer: Element | null | undefined =
                            getTabsterTestVariables()[domKey]?.querySelector(
                                document,
                                selector
                            );
                        scrollContainer?.scroll(x, y);
                    },
                    selector,
                    x,
                    y,
                    domKey
                );
            })
        );

        return this;
    }

    activeElement(callback: (activeElement: BrowserElement | null) => void) {
        this._chain.push(new BroTestItemWait(this._frameStack, 0));
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                const activeElement = await this._frameStack[0].frame.evaluate(
                    (domKey: "dom" | "shadowDOM") => {
                        const ae =
                            getTabsterTestVariables()[domKey]?.getActiveElement(
                                document
                            );

                        if (ae && ae !== document.body) {
                            const attributes: BrowserElement["attributes"] = {};

                            for (const name of ae.getAttributeNames()) {
                                const val = ae.getAttribute(name);

                                if (val !== null) {
                                    attributes[name] = val;
                                }
                            }

                            const ret: BrowserElement = {
                                tag: ae.tagName.toLowerCase(),
                                textContent: ae.textContent,
                                attributes,
                            };
                            return ret;
                        }

                        return null;
                    },
                    domKey
                );

                callback(activeElement);
            })
        );

        this._reportConsoleErrors(true);

        return this;
    }

    removeElement(selector?: string, async = false) {
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                await this._frameStack[0].frame.evaluate(
                    (
                        domKey: "dom" | "shadowDOM",
                        selector: string,
                        async?: boolean
                    ) => {
                        const el = selector
                            ? getTabsterTestVariables()[domKey]?.querySelector(
                                  document,
                                  selector
                              )
                            : getTabsterTestVariables()[
                                  domKey
                              ]?.getActiveElement(document);

                        if (el && el.parentNode) {
                            if (async) {
                                setTimeout(
                                    () => el.parentNode?.removeChild(el),
                                    0
                                );
                            } else {
                                el.parentNode.removeChild(el);
                            }
                        }
                    },
                    domKey,
                    selector || "",
                    async
                );
            })
        );

        this._reportConsoleErrors(true);

        return this;
    }

    focusElement(selector: string) {
        this._chain.push(
            new BroTestItemCallback(this._frameStack, async () => {
                await this._frameStack[0].frame.evaluate(
                    (domKey: "dom" | "shadowDOM", selector: string) => {
                        const el = getTabsterTestVariables()[
                            domKey
                        ]?.querySelector(document, selector);

                        if (!el) {
                            throw new Error(
                                `focusElement: could not find element with selector ${selector}`
                            );
                        }

                        // TODO remove this if ever switching to cypress
                        // tslint:disable-next-line
                        // https://github.com/cypress-io/cypress/blob/56234e52d6d1cbd292acdfd5f5d547f0c4706b51/packages/driver/src/cy/focused.js#L101
                        let hasFocused = false;
                        const onFocus = () => (hasFocused = true);

                        el.addEventListener("focus", onFocus);
                        (el as HTMLElement).focus();
                        el.removeEventListener("focus", onFocus);

                        // only simulate the focus events if the element was sucessfully focused
                        if (
                            !hasFocused &&
                            getTabsterTestVariables()[domKey]?.getActiveElement(
                                document
                            ) === el
                        ) {
                            const focusinEvt = new FocusEvent("focusin", {
                                bubbles: true,
                                view: window,
                                relatedTarget: null,
                                composed: true,
                            });

                            const focusEvt = new FocusEvent("focus", {
                                view: window,
                                relatedTarget: null,
                                composed: true,
                            });

                            el.dispatchEvent(focusinEvt);
                            el.dispatchEvent(focusEvt);
                        }
                    },
                    domKey,
                    selector
                );
            })
        );

        this._reportConsoleErrors(true);

        return this;
    }
}
