/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute } from '../Tabster';

describe('Uncontrolled', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it('should allow aria-hidden element to be focused', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button aria-hidden='true'>Button2</button>
                        <button>Button3</button>
                    </div>
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
            });
    });

    it('should allow custom tab key behaviour', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div id='container' {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                        <button id='destination'>Button4</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                document.getElementById('container')?.addEventListener('keydown', e => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        document.getElementById('destination')?.focus();
                    }
                });
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button4');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button4');
            });
    });

    it('should allow to go outside of the application even if the uncontrolled element is the first/last in the application', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                    </div>
                    <button>Button2</button>
                    <button>Button3</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button4</button>
                    </div>
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
                expect(el?.textContent).toContain('Button4');
            })
            .pressTab()
            .activeElement(el => {
                // For some reason, the Puppeeteer testing environment doesn't
                // move the focus to the address bar. In the real world, we should
                // have undefined here, but the testing environment moves the focus
                // to the first button.
                expect(el?.textContent).toContain('Button1');
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button2');
            })
            .pressTab(true)
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            })
            .pressTab(true)
            .activeElement(el => {
                // Tabbing backwards in the testing environment however does move
                // the focus outside of the app.
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement(el => {
                expect(el?.textContent).toContain('Button1');
            });
    });
});
