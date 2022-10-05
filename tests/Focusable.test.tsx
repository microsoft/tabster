/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";
import { runIfControlled } from "./utils/test-utils";

runIfControlled("Focusable", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true, groupper: true });
    });

    it("should allow aria-disabled elements to be focused", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-disabled="true">Button1</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should not allow aria-hidden elements to be focused", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-hidden="true">Button1</button>
                    <button>Button2</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should return proper elements when findAll() is called", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-hidden="true">Button1</button>
                    <button>Button2</button>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <button>Button3</button>
                        <div {...getTabsterAttribute({ groupper: {} })}>
                            <button>Button4</button>
                            <button>Button5</button>
                        </div>
                        <div
                            id="groupper"
                            tabIndex={0}
                            {...getTabsterAttribute({ groupper: {} })}
                        >
                            <button>Button6</button>
                            <div {...getTabsterAttribute({ mover: {} })}>
                                <button>Button7</button>
                                <div {...getTabsterAttribute({ groupper: {} })}>
                                    <button>Button8</button>
                                    <button>Button9</button>
                                </div>
                                <div
                                    tabIndex={0}
                                    {...getTabsterAttribute({ groupper: {} })}
                                >
                                    <button>Button10</button>
                                    <button>Button11</button>
                                </div>
                            </div>
                            <button>Button12</button>
                        </div>
                        <button>Button13</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                return getTabsterTestVariables()
                    .core?.focusable.findAll({ container: document.body })
                    .map((el) => el.textContent);
            })
            .check((focusables: string[]) => {
                expect(focusables).toEqual([
                    "Button2",
                    "Button3",
                    "Button4",
                    "Button6Button7Button8Button9Button10Button11Button12",
                    "Button13",
                ]);
            })
            .eval(() => {
                const container = document.getElementById("groupper");

                return container
                    ? getTabsterTestVariables()
                          .core?.focusable.findAll({ container })
                          .map((el) => el.textContent)
                    : [];
            })
            .check((focusables: string[]) => {
                expect(focusables).toEqual([
                    "Button6",
                    "Button7",
                    "Button8",
                    "Button10Button11",
                    "Button12",
                ]);
            });
    });

    describe.only("findIterator()", () => {
        let broTest: BroTest.BroTest;

        beforeEach(async () => {
            broTest = new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button aria-hidden="true">Button1</button>
                        <button>Button2</button>
                        <div {...getTabsterAttribute({ mover: {} })}>
                            <button>Button3</button>
                            <div {...getTabsterAttribute({ groupper: {} })}>
                                <button>Button4</button>
                                <button>Button5</button>
                            </div>
                            <div
                                id="groupper"
                                tabIndex={0}
                                {...getTabsterAttribute({ groupper: {} })}
                            >
                                <button>Button6</button>
                                <div {...getTabsterAttribute({ mover: {} })}>
                                    <button>Button7</button>
                                    <div
                                        {...getTabsterAttribute({
                                            groupper: {},
                                        })}
                                    >
                                        <button id="button8">Button8</button>
                                        <button>Button9</button>
                                    </div>
                                    <div
                                        tabIndex={0}
                                        {...getTabsterAttribute({
                                            groupper: {},
                                        })}
                                    >
                                        <button>Button10</button>
                                        <button>Button11</button>
                                    </div>
                                </div>
                                <button>Button12</button>
                            </div>
                            <button>Button13</button>
                        </div>
                    </div>
                )
            );
        });

        it("should iterate forward over focusable elements", async () => {
            await broTest
                .eval(() => {
                    const ret: (string | null)[] = [];
                    getTabsterTestVariables().core?.focusable.findIterator({
                        container: document.body,
                        onElement: (el) => {
                            ret.push(el.textContent);
                            return true;
                        },
                    });

                    return ret;
                })
                .check((focusables: string[]) => {
                    expect(focusables).toEqual([
                        "Button2",
                        "Button3",
                        "Button4",
                        "Button6Button7Button8Button9Button10Button11Button12",
                        "Button13",
                    ]);
                });
        });

        it("should iterate backward over focusable elements", async () => {
            await broTest
                .eval(() => {
                    const ret: (string | null)[] = [];
                    getTabsterTestVariables().core?.focusable.findIterator({
                        container: document.body,
                        isBackward: true,
                        onElement: (el) => {
                            ret.push(el.textContent);
                            return true;
                        },
                    });

                    return ret;
                })
                .check((focusables: string[]) => {
                    expect(focusables).toEqual([
                        "Button13",
                        "Button6Button7Button8Button9Button10Button11Button12",
                        "Button4",
                        "Button3",
                        "Button2",
                    ]);
                });
        });

        it("should iterate forward over focusable elements within a container", async () => {
            await broTest
                .eval(() => {
                    const container = document.getElementById("groupper");
                    const ret: (string | null)[] = [];

                    getTabsterTestVariables().core?.focusable.findIterator({
                        container: container || undefined,
                        onElement: (el) => {
                            ret.push(el.textContent);
                            return true;
                        },
                    });

                    return ret;
                })
                .check((focusables: string[]) => {
                    expect(focusables).toEqual([
                        "Button6",
                        "Button7",
                        "Button8",
                        "Button10Button11",
                        "Button12",
                    ]);
                });
        });

        it("should iterate backward over focusable elements within a container", async () => {
            await broTest
                .eval(() => {
                    const container = document.getElementById("groupper");
                    const ret: (string | null)[] = [];
                    // Iterate backward within a container.
                    getTabsterTestVariables().core?.focusable.findIterator({
                        container: container || undefined,
                        isBackward: true,
                        onElement: (el) => {
                            ret.push(el.textContent);
                            return true;
                        },
                    });

                    return ret;
                })
                .check((focusables: string[]) => {
                    expect(focusables).toEqual([
                        "Button12",
                        "Button10Button11",
                        "Button8",
                        "Button7",
                        "Button6",
                    ]);
                });
        });

        it("should iterate backward over focusable elements within a container from a certain element", async () => {
            await broTest
                .eval(() => {
                    const container = document.getElementById("groupper");
                    const from = document.getElementById("button8");
                    const ret: (string | null)[] = [];

                    getTabsterTestVariables().core?.focusable.findIterator({
                        container: container || undefined,
                        currentElement: from || undefined,
                        onElement: (el) => {
                            ret.push(el.textContent);
                            return true;
                        },
                    });

                    return ret;
                })
                .check((focusables: string[]) => {
                    expect(focusables).toEqual([
                        "Button10Button11",
                        "Button12",
                    ]);
                });
        });

        it("should iterate backward over focusable elements within a container from a certain element", async () => {
            await broTest
                .eval(() => {
                    const container = document.getElementById("groupper");
                    const from = document.getElementById("button8");
                    const ret: (string | null)[] = [];

                    getTabsterTestVariables().core?.focusable.findIterator({
                        container: container || undefined,
                        currentElement: from || undefined,
                        isBackward: true,
                        onElement: (el) => {
                            ret.push(el.textContent);
                            return true;
                        },
                    });

                    return ret;
                })
                .check((focusables: string[]) => {
                    expect(focusables).toEqual(["Button7", "Button6"]);
                });
        });
    });
});
