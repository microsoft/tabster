/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types } from '../Tabster';

describe('Deloser', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it('should restore focus', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                    <button>Button4</button>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toBe('Button2');
            })
            .removeElement()
            .wait(300)
            .activeElement(el => {
                expect(el?.textContent).toBe('Button3');
            });
    });

    it('should not restore focus if focus is not inside the deloser', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ deloser: {} })}>
                        <button>Button1</button>
                    </div>
                    <button>Button2</button>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toBe('Button2');
            })
            .removeElement()
            .wait(300)
            .activeElement(el => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it('should not restore focus by deloser history', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button {...getTabsterAttribute({ deloser: {} })}>
                        Button1
                    </button>
                    <button {...getTabsterAttribute({ deloser: {} })}>
                        Button2
                    </button>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toBe('Button2');
            })
            .removeElement()
            .wait(300)
            .activeElement(el => {
                expect(el?.textContent).toBe('Button1');
            });
    });

    it('should be activated immediately if focus is inside', async () => {
        const tabsterAttr = getTabsterAttribute(
            {
                deloser: {}
            },
            true
        ) as string;
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button {...getTabsterAttribute({ deloser: {} })}>
                        Button1
                    </button>
                    <button id='newDeloser'>Button2</button>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toBe('Button2');
            })
            .eval(
                (attrName, tabsterAttr) => {
                    const newDeloser = document.getElementById('newDeloser');
                    newDeloser?.setAttribute(attrName, tabsterAttr);
                },
                Types.TabsterAttributeName,
                tabsterAttr
            )
            .removeElement('#newDeloser')
            .wait(300)
            .activeElement(el => {
                expect(el?.textContent).toBe('Button1');
            });
    });
});
