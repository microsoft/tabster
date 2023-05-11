/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Extensions } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Mover with nextFor", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should move into Mover when the currently focused item matchs nextFor selector", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: { nextFor: "#next-for" },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                    <button id="next-for">Button5</button>
                </div>
            )
        )
            .pressTab()
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .press("Home")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .press("End")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .press("PageUp")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .press("PageDown")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .focusElement("#next-for")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .focusElement("#next-for")
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .focusElement("#next-for")
            .press("Home")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .focusElement("#next-for")
            .press("End")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .focusElement("#next-for")
            .press("PageUp")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .focusElement("#next-for")
            .press("PageDown")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should choose Mover in the proper direction when more than one nextFor is valid", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="next-for-1">Button1</button>
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: {
                                nextFor:
                                    "#next-for-1, #next-for-2, #next-for-3",
                            },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                    <button id="next-for-2">Button5</button>
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: {
                                nextFor:
                                    "#next-for-2, #next-for-3, #next-for-4",
                            },
                        })}
                    >
                        <button>Button6</button>
                        <button>Button7</button>
                        <button>Button8</button>
                    </div>
                    <button id="next-for-3">Button9</button>
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: {
                                nextFor:
                                    "#next-for-2, #next-for-3, #next-for-4",
                            },
                        })}
                    >
                        <button>Button10</button>
                        <button>Button11</button>
                        <button>Button12</button>
                    </div>
                    <button id="next-for-4">Button13</button>
                </div>
            )
        )
            .focusElement("#next-for-1")
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .focusElement("#next-for-1")
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .focusElement("#next-for-2")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .focusElement("#next-for-2")
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .focusElement("#next-for-3")
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button8");
            })
            .focusElement("#next-for-3")
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button10");
            })
            .focusElement("#next-for-4")
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button12");
            })
            .focusElement("#next-for-4")
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button10");
            });
    });

    it("should work with nextFor = body", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button">Button1</button>
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: { nextFor: "body" },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                </div>
            )
        )
            .focusElement("#button")
            .eval(() => {
                (document.activeElement as HTMLElement | null)?.blur?.();
            })
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .focusElement("#button")
            .eval(() => {
                (document.activeElement as HTMLElement | null)?.blur?.();
            })
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should move into Mover only if arrow key has no action in the currently focused element", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <textarea defaultValue="Hello" />
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: { nextFor: "textarea" },
                        })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Hello");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Hello");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should properly handle default item in Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button">Button1</button>
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: { nextFor: "button" },
                        })}
                    >
                        <button>Button2</button>
                        <button
                            {...getTabsterAttribute({
                                focusable: { isDefault: true },
                            })}
                        >
                            Button3
                        </button>
                        <button>Button4</button>
                    </div>
                    <button id="button-2">Button11</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .focusElement("#button")
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .focusElement("#button-2")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button11");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .focusElement("#button-2")
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            });
    });

    it("should properly handle default item in Mover when there are no focusables before/after Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute<Extensions.MoverNextForProps>({
                            mover: { nextFor: "body" },
                        })}
                    >
                        <button>Button1</button>
                        <button
                            {...getTabsterAttribute({
                                focusable: { isDefault: true },
                            })}
                        >
                            Button2
                        </button>
                        <button>Button3</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .eval(() => {
                (document.activeElement as HTMLElement | null)?.blur?.();
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .eval(() => {
                (document.activeElement as HTMLElement | null)?.blur?.();
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should properly handle default item and memorizeCurrent in Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button">Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: { nextFor: "button", memorizeCurrent: true },
                        })}
                    >
                        <button>Button2</button>
                        <button
                            {...getTabsterAttribute({
                                focusable: { isDefault: true },
                            })}
                        >
                            Button3
                        </button>
                        <button>Button4</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .focusElement("#button")
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .focusElement("#button")
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });
});
