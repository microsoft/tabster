/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import type { createTabster, disposeTabster } from "tabster";
import * as BroTest from "./utils/BroTest";

interface WindowWithTabster extends Window {
    __tabsterInstance: unknown;
    createTabster: typeof createTabster;
    disposeTabster: typeof disposeTabster;
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
                const win = window as unknown as WindowWithTabster;
                const first = win.createTabster(window);
                win.createTabster(window);

                win.disposeTabster(first);
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
                const win = window as unknown as WindowWithTabster;
                const first = win.createTabster(window);
                const second = win.createTabster(window);

                win.disposeTabster(first);
                win.disposeTabster(second);
                return !!(window as unknown as WindowWithTabster)
                    .__tabsterInstance;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toBe(false);
            });
    });
});
