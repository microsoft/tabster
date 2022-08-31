/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Internal", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    it("should restore focus", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div id="element1">
                        <button>Button1</button>
                    </div>
                    <div id="element2">
                        <button>Button2</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                document
                    .getElementById("element1")
                    ?.setAttribute("data-tabster", '{"groupper": {}}');
            })
            .eval(() => {
                getTabsterTestVariables().core?.core.internal.stopObserver();
            })
            .eval((): string | void => {
                const tabster = getTabsterTestVariables().core;
                const el1 = document.getElementById("element1");
                const el2 = document.getElementById("element2");
                if (tabster && el1 && el2) {
                    const t1 = tabster.core.storageEntry(el1)?.tabster;
                    const t2 = tabster.core.storageEntry(el2)?.tabster;
                    return `${!!t1}-${!!t2}`;
                }
            })
            .check((res) => {
                expect(res).toEqual("true-false");
            })
            .eval(() => {
                document
                    .getElementById("element2")
                    ?.setAttribute("data-tabster", '{"groupper": {}}');
            })
            .eval((): string | void => {
                const tabster = getTabsterTestVariables().core;
                const el1 = document.getElementById("element1");
                const el2 = document.getElementById("element2");
                if (tabster && el1 && el2) {
                    const t1 = tabster.core.storageEntry(el1)?.tabster;
                    const t2 = tabster.core.storageEntry(el2)?.tabster;
                    return `${!!t1}-${!!t2}`;
                }
            })
            .check((res) => {
                expect(res).toEqual("true-false");
            })
            .eval(() => {
                getTabsterTestVariables().core?.core.internal.resumeObserver(
                    true
                );
            })
            .eval((): string | void => {
                const tabster = getTabsterTestVariables().core;
                const el1 = document.getElementById("element1");
                const el2 = document.getElementById("element2");
                if (tabster && el1 && el2) {
                    const t1 = tabster.core.storageEntry(el1)?.tabster;
                    const t2 = tabster.core.storageEntry(el2)?.tabster;
                    return `${!!t1}-${!!t2}`;
                }
            })
            .check((res) => {
                expect(res).toEqual("true-true");
            });
    });
});
