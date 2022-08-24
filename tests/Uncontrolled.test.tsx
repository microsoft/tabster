/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import * as BroTest from "./utils/BroTest";
import { runIfControlled, runIfUnControlled } from "./utils/test-utils";

runIfControlled("Uncontrolled", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true, groupper: true });
    });

    it("should allow aria-hidden element to be focused", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button aria-hidden="true">Button2</button>
                        <button>Button3</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should allow custom tab key behaviour", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        id="container"
                        {...getTabsterAttribute({ uncontrolled: {} })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                        <button id="destination">Button4</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                document
                    .getElementById("container")
                    ?.addEventListener("keydown", (e) => {
                        if (e.key === "Tab") {
                            e.preventDefault();
                            document.getElementById("destination")?.focus();
                        }
                    });
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should allow to go outside of the application when tabbing and the uncontrolled element is the last", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-hidden="true">Button1</button>
                    <button>Button2</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button3</button>
                        <button>Button4</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it("should allow to go outside of the application when tabbing backwards and the uncontrolled element is first", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button>Button2</button>
                    </div>
                    <button>Button3</button>
                    <button>Button4</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should properly ignore disabled elements around the uncontrolled area", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button disabled>Button2</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                    <button disabled>Button5</button>
                    <button>Button6</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should transparently transit between Movers and Uncontrolled", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <button>Button1</button>
                        <button>Button2</button>
                    </div>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button3</button>
                        <button aria-hidden="true">Button4</button>
                    </div>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it("should properly handle consecutive Uncontrolled", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <button>Button1</button>
                        <button disabled>Button2</button>
                    </div>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button3</button>
                    </div>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button4</button>
                    </div>
                    <div>
                        <button disabled>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should properly transition between uncontrolled areas", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button>Button2</button>
                    </div>
                    <ul {...getTabsterAttribute({ mover: {} })}>
                        <li
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        Types.GroupperTabbabilities
                                            .LimitedTrapFocus,
                                },
                            })}
                        >
                            <button
                                {...getTabsterAttribute({ uncontrolled: {} })}
                            >
                                Button3
                            </button>
                        </li>
                        <li
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        Types.GroupperTabbabilities
                                            .LimitedTrapFocus,
                                },
                            })}
                        >
                            <button
                                {...getTabsterAttribute({ uncontrolled: {} })}
                            >
                                Button4
                            </button>
                        </li>
                    </ul>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should properly transition between controlled and uncontrolled areas", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button tabIndex={-1}>Button2</button>
                        <button>Button3</button>
                        <button tabIndex={-1}>Button4</button>
                    </div>
                    <div>
                        <button tabIndex={-1}>Button5</button>
                    </div>
                    <button>Button6</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });
});

runIfUnControlled("Uncontrolled", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage({
            mover: true,
        });
    });

    it.each`
        senario | children
        ${"mover is direct child of uncontrolled element"} | ${(<div {...getTabsterAttribute({
            mover: { memorizeCurrent: true },
        })}>
        <button>Mover-Button1</button>
        <button>Mover-Button2</button>
    </div>)}
        ${"mover is NOT direct child of uncontrolled element"} | ${(<div>
        <div {...getTabsterAttribute({
                mover: { memorizeCurrent: true },
            })}>
            <button>Mover-Button1</button>
            <button>Mover-Button2</button>
        </div>
    </div>)}
    `(
        "should maintain Movers navigation in uncontrolled when $senario",
        async ({ children }) => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <div {...getTabsterAttribute({ uncontrolled: {} })}>
                            <button>Button1</button>
                            {children}
                        </div>
                    </div>
                )
            )

                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Mover-Button1");
                })
                .pressTab() // Tab in mover navigates outside of mover
                .activeElement((el) => {
                    expect(el?.textContent).toBeUndefined();
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Mover-Button1");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Mover-Button2");
                })
                .pressTab(true) // shift+Tab in mover navigates outside of mover
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        }
    );
});
