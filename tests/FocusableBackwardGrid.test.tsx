/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, MoverDirections } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Backward focusable grid navigation", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("moves ArrowUp to the same column of childless input cells", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div
                    {...getTabsterAttribute({
                        mover: { direction: MoverDirections.Grid },
                    })}
                >
                    {["a", "b"].map((row) => (
                        <div key={row} style={{ display: "flex" }}>
                            {[1, 2, 3].map((column) => (
                                <input
                                    key={column}
                                    id={`${row}${column}`}
                                    aria-label={`${row}${column}`}
                                    style={{ width: "60px" }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        )
            .focusElement("#b2")
            .pressUp()
            .activeElement((element) => {
                expect(element?.attributes.id).toBe("a2");
            });
    });
});
