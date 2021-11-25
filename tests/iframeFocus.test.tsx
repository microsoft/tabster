/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterAttribute } from "../src";
import * as BroTest from "./utils/BroTest";

describe("<iframe />", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should focus in an out with Tab", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                    <button>Button1</button>
                    <iframe src="/iframe.html" />
                    <button>Button2</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.tag).toBe("iframe");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });
});
