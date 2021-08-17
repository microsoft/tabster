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
                expect(el?.textContent).toEqual('Button2');
            })
            .removeElement()
            .wait(300)
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button3');
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
                expect(el?.textContent).toEqual('Button2');
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
                expect(el?.textContent).toEqual('Button2');
            })
            .removeElement()
            .wait(300)
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1');
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
                expect(el?.textContent).toEqual('Button2');
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
                expect(el?.textContent).toEqual('Button1');
            });
    });

    it('should restore focus in the middle of a limited groupper', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({ groupper: { tabbability: Types.GroupperTabbabilities.LimitedTrapFocus } })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({ groupper: { tabbability: Types.GroupperTabbabilities.LimitedTrapFocus } })}
                    >
                        <button className='button-4'>Button4</button>
                        <button className='button-5'>Button5</button>
                        <button className='button-6'>Button6</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button4Button5Button6');
            })
            .pressEnter()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button4');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button5');
            })
            .removeElement()
            .wait(300)
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button4');
            });
    });
});
