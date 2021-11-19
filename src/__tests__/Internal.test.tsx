/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from "../../testing/BroTest";
import { getTabsterAttribute, Types } from "../Tabster";

interface WindowWithTabsterInternal extends Window {
    __tabsterInstance: Types.TabsterInternal;
}

describe("Internal", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
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
                const tabster = (window as unknown as WindowWithTabsterInternal)
                    .__tabsterInstance;
                tabster.internal.stopObserver();
            })
            .eval((): string | void => {
                const tabster = (window as unknown as WindowWithTabsterInternal)
                    .__tabsterInstance;
                const el1 = document.getElementById("element1");
                const el2 = document.getElementById("element2");
                if (el1 && el2) {
                    const t1 = tabster.storageEntry(el1)?.tabster;
                    const t2 = tabster.storageEntry(el2)?.tabster;
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
                const tabster = (window as unknown as WindowWithTabsterInternal)
                    .__tabsterInstance;
                const el1 = document.getElementById("element1");
                const el2 = document.getElementById("element2");
                if (el1 && el2) {
                    const t1 = tabster.storageEntry(el1)?.tabster;
                    const t2 = tabster.storageEntry(el2)?.tabster;
                    return `${!!t1}-${!!t2}`;
                }
            })
            .check((res) => {
                expect(res).toEqual("true-false");
            })
            .eval(() => {
                const tabster = (window as unknown as WindowWithTabsterInternal)
                    .__tabsterInstance;
                tabster.internal.resumeObserver(true);
            })
            .eval((): string | void => {
                const tabster = (window as unknown as WindowWithTabsterInternal)
                    .__tabsterInstance;
                const el1 = document.getElementById("element1");
                const el2 = document.getElementById("element2");
                if (el1 && el2) {
                    const t1 = tabster.storageEntry(el1)?.tabster;
                    const t2 = tabster.storageEntry(el2)?.tabster;
                    return `${!!t1}-${!!t2}`;
                }
            })
            .check((res) => {
                expect(res).toEqual("true-true");
            });
    });
});
