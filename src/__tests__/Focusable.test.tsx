/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from "../../testing/BroTest";
import { getTabsterAttribute } from "../Tabster";
import { runIfControlled } from "./test-utils";

runIfControlled("Focusable", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should allow aria-disabled elements to be focused", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-disabled="true">Button1</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should not allow aria-hidden elements to be focused", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-hidden="true">Button1</button>
                    <button>Button2</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });
});
