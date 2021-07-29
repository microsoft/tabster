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
        // TODO: Fix the unlimited scenarios.
        // ['Unlimited', Types.GroupperTabbabilities.Unlimited],
        // ['undefined', undefined]
    ])('should properly move the focus when focusable grouppers with %s tabbability are in mover', async (_, tabbability) => {
        await new BroTest.BroTest(
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
                expect(el?.textContent).toContain('Button1Button2');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button3Button4');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button5Button6');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button3Button4');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1Button2');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button7');
            });
    });

    it.each<
        [
            string,
            Types.GroupperTabbability | undefined
        ]
    >([
        ['Limited', Types.GroupperTabbabilities.Limited],
        ['LimitedTrapFocus', Types.GroupperTabbabilities.LimitedTrapFocus],
        // TODO: Fix the unlimited scenarios.
        // ['Unlimited', Types.GroupperTabbabilities.Unlimited],
        // ['undefined', undefined]
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
                expect(el?.textContent).toContain('Button1');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            })
            .pressDown()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button3');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            })
            .pressUp()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button4');
            });
    });
});
