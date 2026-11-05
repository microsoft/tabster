/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Modalizer disposal", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    const fixture = (original?: "false" | "true") => (
        <div {...getTabsterAttribute({ root: {} })}>
            <section id="outside" aria-hidden={original}>
                <button>Outside</button>
            </section>
            <section {...getTabsterAttribute({ modalizer: { id: "modal" } })}>
                <button id="modal-button">Modal</button>
            </section>
        </div>
    );

    it.each([undefined, "false", "true"] as const)(
        "restores the original aria-hidden value on last-wrapper disposal (%s)",
        async (original) => {
            await new BroTest.BroTest(fixture(original))
                .focusElement("#modal-button")
                .wait(300)
                .eval(() => {
                    const vars = getTabsterTestVariables();
                    const outside = vars.dom!.getElementById(
                        document,
                        "outside"
                    )!;
                    const handle = vars.core!;
                    const borrowed = vars.getTabster!(window)!;
                    const hidden = outside.getAttribute("aria-hidden");

                    vars.disposeTabster!(handle);

                    return {
                        hidden,
                        restored: outside.getAttribute("aria-hidden"),
                        borrowedSharesCore: borrowed.core === handle.core,
                        newBorrowedHandle: !!vars.getTabster!(window),
                    };
                })
                .check((result) => {
                    expect(result).toEqual({
                        hidden: "true",
                        restored: original ?? null,
                        borrowedSharesCore: true,
                        newBorrowedHandle: false,
                    });
                });
        }
    );

    it.each([undefined, "false"] as const)(
        "does not restore until the final counted wrapper is disposed (%s)",
        async (original) => {
            await new BroTest.BroTest(fixture(original))
                .focusElement("#modal-button")
                .wait(300)
                .eval(() => {
                    const vars = getTabsterTestVariables();
                    const outside = vars.dom!.getElementById(
                        document,
                        "outside"
                    )!;
                    const keeper = vars.createTabster!(window);
                    vars.disposeTabster!(vars.core!);
                    const retained = outside.getAttribute("aria-hidden");
                    const coreRetained = !!vars.getTabster!(window);

                    vars.disposeTabster!(keeper);

                    return {
                        retained,
                        coreRetained,
                        restored: outside.getAttribute("aria-hidden"),
                        coreGone: !vars.getTabster!(window),
                    };
                })
                .check((result) => {
                    expect(result).toEqual({
                        retained: "true",
                        coreRetained: true,
                        restored: original ?? null,
                        coreGone: true,
                    });
                });
        }
    );

    it.each([undefined, "false"] as const)(
        "restores a still-live detached element before storage is discarded (%s)",
        async (original) => {
            await new BroTest.BroTest(fixture(original))
                .focusElement("#modal-button")
                .wait(300)
                .eval(() => {
                    const vars = getTabsterTestVariables();
                    const outside = vars.dom!.getElementById(
                        document,
                        "outside"
                    )!;
                    const hidden = outside.getAttribute("aria-hidden");
                    outside.remove();
                    vars.disposeTabster!(vars.core!);

                    return {
                        hidden,
                        connected: outside.isConnected,
                        restored: outside.getAttribute("aria-hidden"),
                    };
                })
                .check((result) => {
                    expect(result).toEqual({
                        hidden: "true",
                        connected: false,
                        restored: original ?? null,
                    });
                });
        }
    );

    it("preserves normal deactivation before disposal", async () => {
        await new BroTest.BroTest(fixture("false"))
            .focusElement("#modal-button")
            .wait(300)
            .eval(() => {
                getTabsterTestVariables().modalizer!.setActive(undefined);
            })
            .wait(300)
            .eval(() => {
                const vars = getTabsterTestVariables();
                const outside = vars.dom!.getElementById(document, "outside")!;
                const deactivated = outside.getAttribute("aria-hidden");
                vars.disposeTabster!(vars.core!);

                return {
                    deactivated,
                    disposed: outside.getAttribute("aria-hidden"),
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    deactivated: "false",
                    disposed: "false",
                });
            });
    });
});
