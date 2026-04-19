/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, GroupperTabbabilities } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Groupper", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true }, { lite: true });
    });

    it("should enter and escape limited trap group", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div
                    tabIndex={0}
                    {...getTabsterAttribute({
                        groupper: {
                            tabbability: GroupperTabbabilities.LimitedTrapFocus,
                        },
                    })}
                >
                    <button>Foo</button>
                    <button>Bar</button>
                </div>
                <button>After</button>
            </div>
        )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("FooBar"))
            .pressEnter()
            .activeElement((el) => expect(el?.textContent).toEqual("Foo"))
            .pressEsc()
            .activeElement((el) => expect(el?.textContent).toEqual("FooBar"));
    });
});
