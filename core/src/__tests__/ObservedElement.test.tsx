/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types } from '../Tabster';

interface WindowWithTabsterInternal extends Window { __tabsterInstance: Types.TabsterInternal; }

describe('Focusable', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it('should not request focus tabindex -1 by default', async () => {
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
                return (window as unknown as WindowWithTabsterInternal).__tabsterInstance?.observedElement?.requestFocus(
                    name,
                    0
                );
            }, name)
            .check((res: boolean) => expect(res).toBe(false))
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            });
    });

    it('should request focus for any element', async () => {
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
            .eval((name, accessibility) => {
                // @ts-ignore
                return (window as unknwon as WindowWithTabsterInternal).__tabsterInstance.observedElement.requestFocus(
                    name,
                    0,
                    accessibility
                );
            }, name, Types.ObservedElementAccesibilities.Any)
            .check((res: boolean) => expect(res).toBe(true))
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            });
    });
});
