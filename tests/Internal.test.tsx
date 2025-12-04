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
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="element1">
                    <button>Button1</button>
                </div>
                <div id="element2">
                    <button>Button2</button>
                </div>
            </div>
        )
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "element1")
                    ?.setAttribute("data-tabster", '{"groupper": {}}');
            })
            .eval(() => {
                getTabsterTestVariables().core?.core.internal.stopObserver();
            })
            .eval((): string | void => {
                const tabster = getTabsterTestVariables().core;
                const el1 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "element1"
                );
                const el2 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "element2"
                );
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
                getTabsterTestVariables()
                    .dom?.getElementById(document, "element2")
                    ?.setAttribute("data-tabster", '{"groupper": {}}');
            })
            .eval((): string | void => {
                const tabster = getTabsterTestVariables().core;
                const el1 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "element1"
                );
                const el2 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "element2"
                );
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
                const el1 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "element1"
                );
                const el2 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "element2"
                );
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

    it("should not recreate groupper for removed element", async () => {
        interface WindowWithTabsterInstance extends Window {
            __tabsterInstance?: any;
        }

        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div
                    id="groupper"
                    {...getTabsterAttribute({
                        groupper: { tabbability: 0 },
                    })}
                >
                    <button>Button</button>
                </div>
            </div>
        )
            .eval(() => {
                return Object.keys(
                    (window as WindowWithTabsterInstance).__tabsterInstance
                        .groupper._grouppers
                ).length;
            })
            .check((groupperCount) => {
                expect(groupperCount).toEqual(1);
            })
            .eval(() => {
                const dom = getTabsterTestVariables().dom;
                const groupper = dom?.getElementById(document, "groupper");

                if (groupper) {
                    // The following gives the mutation event with two records:
                    // one for the removed element, and one for the attribute change.
                    // Not sure why we get attribute change for the removed element,
                    // but we need to make sure that the attribute change doesn't
                    // trigger groupper recreation for the removed element.
                    groupper.remove();
                    groupper.setAttribute("data-tabster", '{"groupper":{}}');
                }
            })
            .wait(300)
            .eval(() => {
                return Object.keys(
                    (window as WindowWithTabsterInstance).__tabsterInstance
                        .groupper._grouppers
                ).length;
            })
            .check((groupperCount) => {
                expect(groupperCount).toEqual(0);
            });
    });
});
