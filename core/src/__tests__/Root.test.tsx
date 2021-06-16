/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from '../../testing/BroTest';
import { getTabsterAttribute, Types as TabsterTypes } from '../Tabster';

describe('Root', () => {
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
});
