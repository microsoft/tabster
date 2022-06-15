/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("CrossOrigin", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("shows <iframe> usage example", async () => {
        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                    <button>Button1</button>
                    <iframe id="frame1" src={BroTest.getTestPageURL()}></iframe>
                    <button>Button2</button>
                </div>
            )
            .frame("frame1")
            .html(
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                    <button>Button3</button>
                    <iframe id="frame2" src={BroTest.getTestPageURL()}></iframe>
                    <button>Button4</button>
                </div>
            )
            .frame("frame2")
            .html(
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                    <button>Button5</button>
                    <button>Button6</button>
                </div>
            )
            .unframe()
            .unframe()
            .frame("frame1", "frame2");
    });
});
