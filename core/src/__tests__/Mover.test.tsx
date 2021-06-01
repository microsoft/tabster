/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types } from '../Tabster';

describe('Mover', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    const getTestHtml = (attr: ReturnType<typeof getTabsterAttribute>) => {
        const rootAttr = getTabsterAttribute({ root: {} });

        return (
            <div {...rootAttr}>
                <button>Ignore</button>
                <div {...attr}>
                    <button id='first'>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                    <button id='last'>Button4</button>
                </div>
                <button>Ignore</button>
            </div>
        );
    };

    it.each<
        [
            string,
            Types.MoverAxis,
            'pressDown' | 'pressRight',
            'pressUp' | 'pressLeft'
        ]
    >([
        ['vertical', Types.MoverAxis.Vertical, 'pressDown', 'pressUp'],
        ['horizontal', Types.MoverAxis.Horizontal, 'pressRight', 'pressLeft']
    ])('should use arrow keys on %s axis', async (_, axis, next, previous) => {
        const attr = getTabsterAttribute({
            focusable: {
                mover: {
                    axis,
                    navigationType: Types.MoverKeys.Arrows
                }
            }
        });

        await new BroTest.BroTest(getTestHtml(attr))
            .focusElement('#first')
            // move forward
            [next]()
            .activeElement(el => expect(el?.textContent).toContain('2'))
            [next]()
            .activeElement(el => expect(el?.textContent).toContain('3'))
            [next]()
            .activeElement(el => expect(el?.textContent).toContain('4'))
            // move backwards
            [previous]()
            .activeElement(el => expect(el?.textContent).toContain('3'))
            [previous]()
            .activeElement(el => expect(el?.textContent).toContain('2'))
            [previous]()
            .activeElement(el => expect(el?.textContent).toContain('1'));
    });

    it.each<
        [
            string,
            Types.MoverAxis,
            'pressDown' | 'pressRight',
            'pressUp' | 'pressLeft'
        ]
    >([
        ['vertical', Types.MoverAxis.Vertical, 'pressDown', 'pressUp'],
        ['horizontal', Types.MoverAxis.Horizontal, 'pressRight', 'pressLeft']
    ])(
        'should not escape boundaries with arrow keys on %s axis',
        async (_, axis, next, previous) => {
            const attr = getTabsterAttribute({
                focusable: {
                    mover: {
                        axis,
                        navigationType: Types.MoverKeys.Arrows
                    }
                }
            });

            await new BroTest.BroTest(getTestHtml(attr))
                .focusElement('#first')
                [previous]()
                .activeElement(el => expect(el?.textContent).toContain('1'))
                .focusElement('#last')
                [next]()
                .activeElement(el => expect(el?.textContent).toContain('4'));
        }
    );

    it.each<
        [
            string,
            Types.MoverAxis,
            'pressDown' | 'pressRight',
            'pressUp' | 'pressLeft'
        ]
    >([
        ['vertical', Types.MoverAxis.Vertical, 'pressDown', 'pressUp'],
        ['horizontal', Types.MoverAxis.Horizontal, 'pressRight', 'pressLeft']
    ])(
        'should allow circular navigation on %s axis',
        async (_, axis, next, previous) => {
            const attr = getTabsterAttribute({
                focusable: {
                    mover: {
                        axis,
                        navigationType: Types.MoverKeys.Arrows,
                        cyclic: true
                    }
                }
            });

            await new BroTest.BroTest(getTestHtml(attr))
                .focusElement('#first')
                [previous]()
                .activeElement(el => expect(el?.textContent).toContain('4'))
                .focusElement('#last')
                [next]()
                .activeElement(el => expect(el?.textContent).toContain('1'));
        }
    );

    it('should navigate using tab keys', async () => {
        const attr = getTabsterAttribute({
            focusable: {
                mover: {
                    axis: Types.MoverAxis.Horizontal,
                    navigationType: Types.MoverKeys.Tab,
                }
            }
        });

        await new BroTest.BroTest(getTestHtml(attr))
            .focusElement('#first')
            // move forward
            .pressTab()
            .activeElement(el => expect(el?.textContent).toContain('2'))
            .pressTab()
            .activeElement(el => expect(el?.textContent).toContain('3'))
            .pressTab()
            .activeElement(el => expect(el?.textContent).toContain('4'))
            // move backwards
            .pressTab(true)
            .activeElement(el => expect(el?.textContent).toContain('3'))
            .pressTab(true)
            .activeElement(el => expect(el?.textContent).toContain('2'))
            .pressTab(true)
            .activeElement(el => expect(el?.textContent).toContain('1'));
    });

    it('should leave the mover using tab if navigation type is arrows only', async () => {
        const attr = getTabsterAttribute({
            focusable: {
                mover: {
                    axis: Types.MoverAxis.Vertical,
                    navigationType: Types.MoverKeys.Arrows,
                }
            }
        });

        await new BroTest.BroTest(getTestHtml(attr))
            .focusElement('#last')
            .pressTab()
            .activeElement(el => expect(el?.textContent).toContain('Ignore'))
            .focusElement('#first')
            .pressTab(true)
            .activeElement(el => expect(el?.textContent).toContain('Ignore'));
    });
});

describe('NestedMovers', () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    const getTestHtml = (
        parentAttr: ReturnType<typeof getTabsterAttribute>,
        nestedAttr: ReturnType<typeof getTabsterAttribute>
    ) => {
        const rootAttr = getTabsterAttribute({ root: {} });

        return (
            <div {...rootAttr}>
                <button>Ignore</button>
                <div {...parentAttr}>
                    <button id='parentFirst'>Parent1</button>
                    <button>Parent2</button>
                    <button>Parent3</button>
                    <button id='parentLast'>Parent4</button>
                    <div {...nestedAttr}>
                        <button id='nestedFirst'>Nested1</button>
                        <button>Nested2</button>
                        <button>Nested3</button>
                        <button id='nestedLast'>Nested4</button>
                    </div>
                </div>
                <button>Ignore</button>
            </div>
        );
    };

    it('should move from from parent to nested mover with arrow keys', async () => {
        const attr = getTabsterAttribute({
            focusable: {
                mover: {
                    axis: Types.MoverAxis.Vertical,
                    navigationType: Types.MoverKeys.Arrows
                }
            }
        });

        await new BroTest.BroTest(getTestHtml(attr, attr))
            .focusElement('#parentLast')
            .pressDown()
            .activeElement(el => expect(el?.textContent).toContain('Nested1'));
    });

    it('should not move from from nested to parent mover with arrow keys', async () => {
        const attr = getTabsterAttribute({
            focusable: {
                mover: {
                    axis: Types.MoverAxis.Vertical,
                    navigationType: Types.MoverKeys.Arrows
                }
            }
        });

        await new BroTest.BroTest(getTestHtml(attr, attr))
            .focusElement('#nestedFirst')
            .pressUp()
            .activeElement(el => expect(el?.textContent).toContain('Nested1'));
    });

    it('should not move from from nested to parent mover with arrow keys with circular navigation', async () => {
        const attr = getTabsterAttribute({
            focusable: {
                mover: {
                    axis: Types.MoverAxis.Vertical,
                    navigationType: Types.MoverKeys.Arrows,
                    cyclic: true,
                }
            }
        });

        await new BroTest.BroTest(getTestHtml(attr, attr))
            .focusElement('#nestedLast')
            .pressDown()
            .activeElement(el => expect(el?.textContent).toContain('Nested1'))
            .focusElement('#nestedFirst')
            .pressUp()
            .activeElement(el => expect(el?.textContent).toContain('Nested4'));
    });
});
