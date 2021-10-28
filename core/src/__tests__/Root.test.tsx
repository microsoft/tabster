/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types as TabsterTypes } from '../Tabster';

xdescribe('Root', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it('should insert dummy inputs as first and last children', async () => {
        await new BroTest.BroTest(
            (
                <div id='root' {...getTabsterAttribute({ root: {} })}>
                    <button>Button</button>
                </div>
            )
        )
            .eval((dummyAttribute) => {
                return document.querySelectorAll(`[${dummyAttribute}]`).length;
            }, TabsterTypes.TabsterDummyInputAttributeName)
            .check((dummyCount: number) => {
                expect(dummyCount).toBe(2);
            })
            .eval((dummyAttribute) => {
                const first = document.getElementById('root')?.children[0].hasAttribute(dummyAttribute);
                const second = document.getElementById('root')?.children[2].hasAttribute(dummyAttribute);
                return first && second;
            }, TabsterTypes.TabsterDummyInputAttributeName)
            .check((areFirstAndLast: boolean) => {
                expect(areFirstAndLast).toBe(true);
            });
    });

    it('should allow to go outside of the application when tabbing forward', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                </div>
            )
        )
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button2');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button3');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it('should allow to go outside of the application when tabbing backwards', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                </div>
            )
        )
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button2');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button3');
            })
            .pressTab(true)
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button2');
            })
            .pressTab(true)
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1');
            })
            .pressTab(true)
            .activeElement(el => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1');
            });
    });
});
