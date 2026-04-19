/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Modalizer", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true }, { lite: true });
    });

    it("should set aria-hidden outside active modal", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button id="outside">Outside</button>
                <div
                    id="modal"
                    {...getTabsterAttribute({ modalizer: { id: "modal" } })}
                >
                    <button id="inside">Inside</button>
                </div>
            </div>
        )
            .focusElement("#inside")
            .wait(200)
            .eval(
                () =>
                    !!(
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            "outside"
                        ) as HTMLElement
                    )?.inert
            )
            .check((isInert) => expect(isInert).toBe(true));
    });
});
