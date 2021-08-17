/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types } from '../Tabster';

describe('MoverGroupper', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it.each<
        [
            string,
            Types.GroupperTabbability | undefined
        ]
    >([
        ['Limited', Types.GroupperTabbabilities.Limited],
        ['LimitedTrapFocus', Types.GroupperTabbabilities.LimitedTrapFocus],
        ['Unlimited', Types.GroupperTabbabilities.Unlimited],
        ['undefined', undefined]
    ])('should properly move the focus when focusable grouppers with %s tabbability are in mover', async (_, tabbability) => {
        let broTest = new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <div tabIndex={0} {...getTabsterAttribute({ groupper: { tabbability } })}>
                            <button>Button1</button>
                            <button>Button2</button>
                        </div>
                        <div tabIndex={0} {...getTabsterAttribute({ groupper: { tabbability } })}>
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                        <div tabIndex={0} {...getTabsterAttribute({ groupper: { tabbability } })}>
                            <button>Button5</button>
                            <button>Button6</button>
                        </div>
                    </div>
                    <button>Button7</button>
                </div>
            )
        )
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1Button2');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button3Button4');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button5Button6');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button3Button4');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1Button2');
            })
            .pressTab();

        if (!tabbability) {
            broTest = broTest
                .activeElement(el => {
                    expect(el?.textContent).toEqual('Button1');
                })
                .pressTab()
                .activeElement(el => {
                    expect(el?.textContent).toEqual('Button2');
                })
                .pressTab();
        }

        broTest = broTest
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button7');
            });

        await broTest;
    });

    it.each<
        [
            string,
            Types.GroupperTabbability | undefined
        ]
    >([
        ['Limited', Types.GroupperTabbabilities.Limited],
        ['LimitedTrapFocus', Types.GroupperTabbabilities.LimitedTrapFocus],
        ['Unlimited', Types.GroupperTabbabilities.Unlimited],
        ['undefined', undefined]
    ])('should properly move the focus when not focusable grouppers with %s tabbability are in mover', async (_, tabbability) => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <div {...getTabsterAttribute({ groupper: { tabbability } })}>
                            <button>Button1</button>
                        </div>
                        <div {...getTabsterAttribute({ groupper: { tabbability } })}>
                            <button>Button2</button>
                        </div>
                        <div {...getTabsterAttribute({ groupper: { tabbability } })}>
                            <button>Button3</button>
                        </div>
                    </div>
                    <button>Button4</button>
                </div>
            )
        )
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button2');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button3');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button2');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button4');
            });
    });

    it('should move between grouppers inside mover with dynamically appearing first focusable', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <style>
                        { '.groupper .hidden { display: none; }' }
                        { '.groupper:focus-within .hidden { display: inline; }' }
                    </style>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <div className='groupper' {...getTabsterAttribute({ groupper: {} })}>
                            <button className='hidden'>Button1</button>
                            <button>Button2</button>
                            <button>Button3</button>
                        </div>
                        <div className='groupper' {...getTabsterAttribute({ groupper: {} })}>
                            <button className='hidden'>Button4</button>
                            <button>Button5</button>
                            <button>Button6</button>
                        </div>
                    </div>
                    <button>Button7</button>
                </div>
            )
        )
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button2');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button5');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button2');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button3');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button7');
            });
    });

    it('should move between grouppers with focusable container inside mover with dynamically appearing first focusable', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <style>
                        { '.groupper .hidden { display: none; }' }
                        { '.groupper:focus-within .hidden { display: inline; }' }
                    </style>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <div tabIndex={0} className='groupper' {...getTabsterAttribute({ groupper: {} })}>
                            <button className='hidden'>Button1</button>
                            <button>Button2</button>
                            <button>Button3</button>
                        </div>
                        <div tabIndex={0} className='groupper' {...getTabsterAttribute({ groupper: {} })}>
                            <button className='hidden'>Button4</button>
                            <button>Button5</button>
                            <button>Button6</button>
                        </div>
                    </div>
                    <button>Button7</button>
                </div>
            )
        )
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1Button2Button3');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button4Button5Button6');
            })
            .pressEnter()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button4');
            })
            .pressEsc()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button4Button5Button6');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toEqual('Button1Button2Button3');
            })
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
                expect(el?.textContent).toEqual('Button7');
            });
    });
});
