/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, MoverDirections } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Mover", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true }, { lite: true });
    });

    it("should navigate with arrow keys", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div
                    {...getTabsterAttribute({
                        mover: { direction: MoverDirections.Vertical },
                    })}
                >
                    <button id="first">Button1</button>
                    <button>Button2</button>
                    <button id="last">Button3</button>
                </div>
            </div>
        )
            .focusElement("#first")
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressUp()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"));
    });
});
