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

    it('should allow to go outside of the application when tabbing and the uncontrolled element is the last', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-hidden='true'>Button1</button>
                    <button>Button2</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden='true'>Button3</button>
                        <button>Button4</button>
                    </div>
                </div>
            )
        )
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
                expect(el?.textContent).toBeUndefined();
            });
    });

    it('should allow to go outside of the application when tabbing backwards and the uncontrolled element is first', async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button>Button2</button>
                    </div>
                    <button>Button3</button>
                    <button>Button4</button>
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
