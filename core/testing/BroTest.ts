/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EvaluateFn, SerializableOrJSHandle } from 'puppeteer';

function buildAttributesString(attributes: {[name: string]: string}): string {
    const nameOverrides: {[name: string]: string} = {
        className: 'class'
    };

    return Object.keys(attributes).map(name => {
        if (typeof attributes[name] === 'string') {
            return`${ nameOverrides[name] || name }="${ attributes[name].replace(/"/g, '&quot;') }"`;
        } else if (typeof attributes[name] === 'number') {
            return`${ nameOverrides[name] || name }="${attributes[name]}"`;
        } else if (typeof attributes[name] === 'boolean') {
            return`${ nameOverrides[name] || name }="${attributes[name] ? 'true' : 'false'}"`;
        }

        throw new Error(`unknown attribute: ${name}`);
    }).join(' ');
}

export function createElementString(tagName: string, attributes: {[name: string]: string} | null, ...children: any[]): string {
    return `<${ tagName }${ attributes ? ` ${ buildAttributesString(attributes) }` : ''}>${ children.join('') }</${ tagName }>`;
}

declare var __tabsterInstance: any;

async function goToPageWithRetry(url: string, times: number) {
    if (times === 0) {
        throw new Error('Failed to connect to the page after multiple retries');
    }

    try {
        await page.goto(`http://localhost:${process.env.PORT ?? '8080'}`);
    } catch (err) {
        console.error('failed to connect to test page', url);
        console.error(err);
        await new Promise((res, rej) => setTimeout(res, 3000));
        await goToPageWithRetry(url, times - 1);
    }
}

export async function bootstrapTabsterPage() {
    // TODO configure this easier
    const url = `http://localhost:${process.env.PORT ?? '8080'}`;
    await goToPageWithRetry(url, 4);
    await expect(page.title()).resolves.toMatch('Tabster Test');

    // Waiting for the test app to set Tabster up.
    await page.evaluate(() => {
        return new Promise((resolve) => {
            setTimeout(check, 100);

            function check() {
                if (__tabsterInstance) {
                    resolve(true);
                } else {
                    setTimeout(check, 100);
                }
            }
        });
    }, 5000);
}

async function sleep(time: number) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(true); }, time);
    });
}

interface BrowserElement {
    tag: string;
    textContent: string | null;
    attributes: { [name: string]: string };
}

abstract class BroTestItem {
    abstract run(): Promise<any>;
}

class BroTestItemEval extends BroTestItem {
    private _func: EvaluateFn<any>;
    private _args: SerializableOrJSHandle[];
    private _setLastEval: (lastEval: any) => void;

    constructor(func: EvaluateFn<any>, args: SerializableOrJSHandle[], setLastEval: (lastEval: any) => void) {
        super();
        this._func = func;
        this._args = args;
        this._setLastEval = setLastEval;
    }

    async run() {
        const lastEval = await page.evaluate(this._func, ...this._args);
        this._setLastEval(lastEval);
    }
}

class BroTestItemWait extends BroTestItem {
    private _time: number;

    constructor(time: number) {
        super();
        this._time = time;
    }

    async run() {
        await page.evaluate((wait) => {
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

    constructor(callback: () => Promise<void>) {
        super();
        this._callback = callback;
    }

    async run() {
        await this._callback();
    }
}

export class BroTest implements PromiseLike<undefined> {
    private _chain: BroTestItem[] = [];
    private _nextTimer: number | undefined;
    private _promise: Promise<undefined>;
    private _resolve: ((value?: undefined | PromiseLike<undefined>) => void) | undefined;
    private _reject: ((reason?: any) => void) | undefined;
    private _lastEval: any;

    [Symbol.toStringTag]: 'promise';

    constructor(html: JSX.Element) {
        this._promise = new Promise<undefined>((resolve, reject) => {
            this._resolve = resolve;
            this._reject! = reject;
        });

        this._init(html);
    }

    then<TResult1 = undefined, TResult2 = never>(
        onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
        return this._promise.then(onfulfilled, onrejected);
    }

    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): Promise<undefined | TResult> {
        return this._promise.catch(onrejected);
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<undefined> {
        return this._promise.finally(onfinally);
    }

    private async _init(html: JSX.Element) {
        await page.evaluate((el, html) => (el.innerHTML = html), await page.$('body'), `${ html }`);
        await sleep(100);
        this._next();
    }

    private _next() {
        if (this._nextTimer) {
            clearTimeout(this._nextTimer);
        }

        this._nextTimer = setTimeout(async () => {
            delete this._nextTimer;

            const item = this._chain.shift();

            if (item) {
                await item.run();
                this._next();
            } else if (this._resolve) {
                this._resolve();
            }
        }, 0) as any;
    }

    wait(time: number) {
        this._chain.push(new BroTestItemWait(time));
        return this;
    }

    /**
     * @param time - in milliseconds
     */
    debug(time: number = 3600000) {
        jest.setTimeout(time);
        return this.wait(time);
    }

    eval(func: EvaluateFn<any>, ...args: SerializableOrJSHandle[]): BroTest {
        this._chain.push(new BroTestItemEval(func, args, (lastEval) => this._lastEval = lastEval));
        return this;
    }

    check(callback: (lastEval: any) => void) {
        this._chain.push(new BroTestItemCallback(async () => {
            callback(this._lastEval);
        }));

        return this;
    }

    press(key: string, options?: { text?: string | undefined; delay?: number | undefined; } | undefined) {
        this._chain.push(new BroTestItemCallback(async () => {
            await page.keyboard.press(key, options);
        }));

        return this;
    }

    private _pressKey(key: string, shift?: boolean) {
        this._chain.push(new BroTestItemCallback(async () => {
            if (shift) {
                await page.keyboard.down('Shift');
            }

            await page.keyboard.press(key);

            if (shift) {
                await page.keyboard.up('Shift');
            }
        }));

        return this;
    }

    /**
     * Simulates user click on an element
     * This cannot be `element.click()` because native clicks on focusable elements will focus them
     */
    click(selector: string) {
        this._chain.push(new BroTestItemCallback(async() => {
            await page.click(selector);
        }));

        return this;
    }

    pressTab(shift?: boolean) { return this._pressKey('Tab', shift); }
    pressEsc(shift?: boolean) { return this._pressKey('Escape', shift); }
    pressEnter(shift?: boolean) { return this._pressKey('Enter', shift); }
    pressUp(shift?: boolean) { return this._pressKey('ArrowUp', shift); }
    pressDown(shift?: boolean) { return this._pressKey('ArrowDown', shift); }
    pressLeft(shift?: boolean) { return this._pressKey('ArrowLeft', shift); }
    pressRight(shift?: boolean) { return this._pressKey('ArrowRight', shift); }

    activeElement(callback: (activeElement: BrowserElement | null) => void) {
        this._chain.push(new BroTestItemCallback(async () => {
            const activeElement = await page.evaluate(() => {
                const ae = document.activeElement;

                if (ae && (ae !== document.body)) {
                    const attributes: BrowserElement['attributes'] = {};

                    for (let name of ae.getAttributeNames()) {
                        const val = ae.getAttribute(name);

                        if (val !== null) {
                            attributes[name] = val;
                        }
                    }

                    const ret: BrowserElement = {
                        tag: ae.tagName.toLowerCase(),
                        textContent: ae.textContent,
                        attributes
                    };
                    return ret;
                }

                return null;
            });

            callback(activeElement);
        }));

        return this;
    }

    removeElement(selector?: string, async: boolean = false) {
        this._chain.push(new BroTestItemCallback(async () => {
            await page.evaluate((selector: string, async?: boolean) => {
                const el = selector ? document.querySelector(selector) : document.activeElement;

                if (el && el.parentElement) {
                    if (async) {
                        setTimeout(() => el.parentElement?.removeChild(el), 0);
                    } else {
                        el.parentElement.removeChild(el);
                    }
                }
            }, selector || '', async);
        }));

        return this;
    }

    focusElement(selector: string) {
        this._chain.push(new BroTestItemCallback(async() => {
            await page.evaluate((selector: string) => {
                const el = document.querySelector(selector);
                if (!el) {
                    throw new Error(`focusElement: could not find element with selector ${selector}`);
                }

                // TODO remove this if ever switching to cypress
                // tslint:disable-next-line
                // https://github.com/cypress-io/cypress/blob/56234e52d6d1cbd292acdfd5f5d547f0c4706b51/packages/driver/src/cy/focused.js#L101
                let hasFocused = false;
                const onFocus = () => hasFocused = true;

                el.addEventListener('focus', onFocus);
                (el as HTMLElement).focus();
                el.removeEventListener('focus', onFocus);

                // only simulate the focus events if the element was sucessfully focused
                if (!hasFocused && document.activeElement === el) {
                    const focusinEvt = new FocusEvent('focusin', {
                        bubbles: true,
                        view: window,
                        relatedTarget: null,
                    });

                    const focusEvt = new FocusEvent('focus', {
                        view: window,
                        relatedTarget: null,
                    });

                    el.dispatchEvent(focusinEvt);
                    el.dispatchEvent(focusEvt);
                }

            }, selector);
        }));

        return this;
    }
}
