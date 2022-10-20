/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

interface WindowWithTabster extends Window {
    __tabsterInstance: unknown;
}

describe("Tabster dispose", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({});
    });

    it("should not dispose global tabster core if there are still tabster instances", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const first = getTabsterTestVariables().createTabster?.(window);
                getTabsterTestVariables().createTabster?.(window);

                if (first) {
                    getTabsterTestVariables().disposeTabster?.(first);
                }

                return !!(window as unknown as WindowWithTabster)
                    .__tabsterInstance;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toBe(true);
            });
    });

    it("should dispose global tabster core if there are no more tabster instances", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const first = getTabsterTestVariables().createTabster?.(window);
                const second =
                    getTabsterTestVariables().createTabster?.(window);

                if (first && second) {
                    getTabsterTestVariables().disposeTabster?.(first);
                    getTabsterTestVariables().disposeTabster?.(second);
                }
                return !!(window as unknown as WindowWithTabster)
                    .__tabsterInstance;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toBe(false);
            });
    });

    it("should dispose global tabster core if allInstances parameter is passed", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const first = getTabsterTestVariables().createTabster?.(window);
                getTabsterTestVariables().createTabster?.(window);

                if (first) {
                    getTabsterTestVariables().disposeTabster?.(first, true);
                }

                return !!(window as unknown as WindowWithTabster)
                    .__tabsterInstance;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toBe(false);
            });
    });

    it("should not take getTabster() instances into account global tabster core if there are no more tabster instances", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();

                const first = getTabsterTestVariables().createTabster?.(window);
                const second =
                    getTabsterTestVariables().createTabster?.(window);
                const third = getTabsterTestVariables().getTabster?.(window);

                const ret: boolean[] = [!!third];

                if (first) {
                    getTabsterTestVariables().disposeTabster?.(first);
                    ret.push(
                        !!(window as unknown as WindowWithTabster)
                            .__tabsterInstance
                    );
                }

                if (second) {
                    getTabsterTestVariables().disposeTabster?.(second);
                    ret.push(
                        !!(window as unknown as WindowWithTabster)
                            .__tabsterInstance
                    );
                }

                return ret;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toEqual([true, true, false]);
            });
    });

    it("should make Tabster noop", async () => {
        await new BroTest.BroTest(
            <div id="root" {...getTabsterAttribute({ root: {} })} />
        )
            .eval(() => {
                const root = document.getElementById("root");
                return !!(
                    root &&
                    getTabsterTestVariables().core?.core.storageEntry(root)
                );
            })
            .check((exists) => {
                expect(exists).toEqual(true);
            })
            .eval(() => {
                const tabsterTest = getTabsterTestVariables();

                if (tabsterTest.core) {
                    tabsterTest.makeNoOp?.(tabsterTest.core, true);
                }

                const root = document.getElementById("root");

                return !!(root && tabsterTest.core?.core.storageEntry(root));
            })
            .check((exists) => {
                expect(exists).toEqual(false);
            })
            .eval(() => {
                const tabsterTest = getTabsterTestVariables();

                if (tabsterTest.core) {
                    tabsterTest.makeNoOp?.(tabsterTest.core, false);
                }

                const root = document.getElementById("root");

                return !!(root && tabsterTest.core?.core.storageEntry(root));
            })
            .check((exists) => {
                expect(exists).toEqual(true);
            });
    });
});
