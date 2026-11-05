/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Focusable default search", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            mover: true,
            groupper: true,
            modalizer: true,
        });
    });

    it("does not read styles for buttons that are not default candidates", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    {Array.from({ length: 13 }, (_, index) => (
                        <button key={index}>Button{index + 1}</button>
                    ))}
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const original = window.getComputedStyle;
                let styleReads = 0;
                window.getComputedStyle = (...args) => {
                    if (container.contains(args[0])) {
                        styleReads++;
                    }
                    return original.apply(window, args);
                };

                try {
                    return {
                        result: vars.core!.focusable.findDefault({
                            container,
                        }),
                        styleReads,
                    };
                } finally {
                    window.getComputedStyle = original;
                }
            })
            .check((result) => {
                expect(result).toEqual({ result: null, styleReads: 0 });
            });
    });

    it("still checks visibility and disabled state for actual default candidates", async () => {
        const defaultAttribute = getTabsterAttribute({
            focusable: { isDefault: true },
        });
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <button {...defaultAttribute} hidden>
                        Hidden
                    </button>
                    <button {...defaultAttribute} disabled>
                        Disabled
                    </button>
                    <fieldset disabled>
                        <button {...defaultAttribute}>Fieldset</button>
                    </fieldset>
                    <button>Not default</button>
                    <button id="default" {...defaultAttribute}>
                        Default
                    </button>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                return vars.core!.focusable.findDefault({ container })?.id;
            })
            .check((result) => {
                expect(result).toBe("default");
            });
    });

    it("preserves programmatic focusability", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <button
                        id="programmatic"
                        tabIndex={-1}
                        {...getTabsterAttribute({
                            focusable: { isDefault: true },
                        })}
                    >
                        Programmatic
                    </button>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const focusable = vars.core!.focusable;
                return {
                    ordinary: focusable.findDefault({ container }),
                    programmatic: focusable.findDefault({
                        container,
                        includeProgrammaticallyFocusable: true,
                    })?.id,
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    ordinary: null,
                    programmatic: "programmatic",
                });
            });
    });

    it("observes default-property changes delivered by real DOM updates", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <button id="first">First</button>
                    <button
                        id="second"
                        {...getTabsterAttribute({
                            focusable: { isDefault: true },
                        })}
                    >
                        Second
                    </button>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const initial = vars.core!.focusable.findDefault({
                    container,
                })?.id;
                vars.setTabsterAttribute!(
                    vars.dom!.getElementById(document, "first")!,
                    { focusable: { isDefault: true } }
                );
                vars.setTabsterAttribute!(
                    vars.dom!.getElementById(document, "second")!,
                    { focusable: { isDefault: false } }
                );
                return initial;
            })
            .check((result) => {
                expect(result).toBe("second");
            })
            .wait(100)
            .eval(() => {
                const vars = getTabsterTestVariables();
                return vars.core!.focusable.findDefault({
                    container: vars.dom!.getElementById(document, "container")!,
                })?.id;
            })
            .check((result) => {
                expect(result).toBe("first");
            });
    });

    it("uses the current virtual parent on each search", async () => {
        await new BroTest.BroTest(
            <>
                <div id="virtual-root" {...getTabsterAttribute({ root: {} })} />
                <div id="container">
                    <button
                        id="default"
                        {...getTabsterAttribute({
                            focusable: { isDefault: true },
                        })}
                    >
                        Default
                    </button>
                </div>
            </>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const core = vars.core!.core;
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const virtualRoot = vars.dom!.getElementById(
                    document,
                    "virtual-root"
                )!;
                const original = core.getParent;
                let linked = true;
                core.getParent = (node) =>
                    node === container && linked ? virtualRoot : original(node);

                try {
                    const first = core.focusable.findDefault({
                        container,
                    })?.id;
                    linked = false;
                    const unlinked = core.focusable.findDefault({
                        container,
                    });
                    return { first, unlinked };
                } finally {
                    core.getParent = original;
                }
            })
            .check((result) => {
                expect(result).toEqual({
                    first: "default",
                    unlinked: null,
                });
            });
    });
});
