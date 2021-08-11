/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute} from '../Tabster';

describe('Root', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
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
                expect(el?.textContent).toContain('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button3');
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
                expect(el?.textContent).toContain('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button3');
            })
            .pressTab(true)
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            })
            .pressTab(true)
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            })
            .pressTab(true)
            .activeElement(el => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            });
    });
});
