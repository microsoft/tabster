/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, RestorerTypes } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Restorer", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ restorer: true }, { lite: true });
    });

    it("should restore focus to target when source disappears", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button
                    id="target"
                    {...getTabsterAttribute({
                        restorer: { type: RestorerTypes.Target },
                    })}
                >
                    Target
                </button>
                <div
                    id="source"
                    {...getTabsterAttribute({
                        restorer: { type: RestorerTypes.Source },
                    })}
                >
                    <button>Source</button>
                </div>
            </div>
        )
            .focusElement("#target")
            .focusElement("#source button")
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("Target"));
    });
});
