/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Deloser", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ deloser: true }, { lite: true });
    });

    it("should restore focus after active element removal", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                <button>Button1</button>
                <button>Button2</button>
                <button>Button3</button>
            </div>
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .removeElement()
            .wait(200)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });
});
