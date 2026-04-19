/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Observed", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ observed: true }, { lite: true });
    });

    it("should request focus to observed element", async () => {
        const name = "lite-observed";

        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button>Before</button>
                <button
                    tabIndex={-1}
                    {...getTabsterAttribute({ observed: { names: [name] } })}
                >
                    Observed
                </button>
            </div>
        )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Before"))
            .eval(async (observedName) => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        observedName,
                        0
                    );

                return request ? await request.result : false;
            }, name)
            .check((res) => expect(res).toBe(true))
            .activeElement((el) => expect(el?.textContent).toEqual("Observed"));
    });
});
