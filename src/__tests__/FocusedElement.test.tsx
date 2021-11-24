/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterAttribute } from "../Tabster";
import * as BroTest from "./utils/BroTest";

describe("onKeyDown", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should not do anything on element with contenteditable='true'", async () => {
        // Lots of things can happen on keydown
        // Tabster never focuses aria-hidden so if we can focus in there it is safely ignored
        const testHtml = (
            <div id="root" {...getTabsterAttribute({ root: {} })}>
                <div tabIndex={0} contentEditable="true">
                    <button aria-hidden>Button1</button>
                    <button aria-hidden>Button2</button>
                </div>
                <button>Don't focus</button>
            </div>
        );

        await new BroTest.BroTest(testHtml)
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes.contenteditable).toEqual("true")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes["aria-hidden"]).toEqual("true")
            );
    });
});
