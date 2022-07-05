/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { TabsterCore } from "src/Tabster";
import * as BroTest from "./utils/BroTest";

interface WindowWithTabster extends Window {
    __tabsterInstance: unknown;
}

describe("getAPI", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({});
    });
    it("should accept both Tabster and TabsterCore instances", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                getTabsterTestVariables().createTabster?.(window);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const tabsterCore: TabsterCore = window.__tabsterInstance;

                getTabsterTestVariables().getModalizer(tabsterCore);
                getTabsterTestVariables().getCrossOrigin(tabsterCore);
                getTabsterTestVariables().getDeloser(tabsterCore);
                getTabsterTestVariables().getMover(tabsterCore);
                getTabsterTestVariables().getObservedElement(tabsterCore);
                getTabsterTestVariables().getOutline(tabsterCore);
                getTabsterTestVariables().getGroupper(tabsterCore);

                return true;
            })
            .check((success) => expect(success).toBe(true));
    });
});

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
});
