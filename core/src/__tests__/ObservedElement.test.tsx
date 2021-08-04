/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types } from '../Tabster';

interface WindowWithTabsterInternal extends Window {
    __tabsterInstance: Types.TabsterInternal;
}

describe('Focusable', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it('should request focus for element with tabindex -1', async () => {
        const name = 'test';
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button
                        {...getTabsterAttribute({ observed: { name } })}
                        tabIndex={-1}
                    >
                        Button2
                    </button>
                </div>
            )
        )
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            })
            .eval(name => {
                return ((window as unknown) as WindowWithTabsterInternal).__tabsterInstance.observedElement?.requestFocus(
                    name,
                    0
                ).result;
            }, name)
            .check((res: boolean) => expect(res).toBe(true))
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            });
    });

    it('should request focus for non-existent element with tabindex -1', async () => {
        const name = 'test';
        await new BroTest.BroTest(
            (<div id='root' {...getTabsterAttribute({ root: {} })}></div>)
        )
            .eval(name => {
                const request = ((window as unknown) as WindowWithTabsterInternal).__tabsterInstance.observedElement?.requestFocus(
                    name,
                    5000
                ).result;

                const observedButton = document.createElement('button');
                observedButton.textContent = name;
                document.getElementById('root')?.appendChild(observedButton);
                ((window as unknown) as WindowWithTabsterInternal).__tabsterInstance.observedElement?.add(
                    observedButton,
                    { name }
                );

                return request;
            }, name)
            .check((res: boolean) => expect(res).toBe(true))
            .activeElement(el => {
                expect(el?.textContent).toContain(name);
            });
    });

    it('should cancel the focus request when the next one is happened', async () => {
        await new BroTest.BroTest(
            (<div id='root'></div>)
        )
            .eval(() => {
                return new Promise((resolve => {
                    const request1 = ((window as unknown) as WindowWithTabsterInternal).__tabsterInstance.observedElement?.requestFocus(
                        'button1',
                        10005000
                    );

                    setTimeout(() => {
                        const request2 = ((window as unknown) as WindowWithTabsterInternal).__tabsterInstance.observedElement?.requestFocus(
                            'button2',
                            10005000
                        );

                        setTimeout(() => {
                            const button1 = document.createElement('button');
                            button1.setAttribute('data-tabster', '{"observed":{"name": "button1"}}');
                            button1.textContent = 'Button1';

                            const root = document.getElementById('root');

                            root?.appendChild(button1);

                            setTimeout(() => {
                                const button2 = document.createElement('button');
                                button2.setAttribute('data-tabster', '{"observed":{"name": "button2"}}');
                                button2.textContent = 'Button2';
                                root?.appendChild(button2);

                                Promise.all([request1?.result, request2?.result]).then(onfulfilled => {
                                    resolve(onfulfilled);
                                });
                            }, 100);
                        }, 100);
                    }, 100);
                }));
            })
            .check((result: [boolean, boolean]) => {
                expect(result[0]).toBe(false);
                expect(result[1]).toBe(true);
            })
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            });
    });
});
