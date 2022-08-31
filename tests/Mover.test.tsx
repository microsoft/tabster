/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Mover", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    const getTestHtml = (attr: Types.TabsterDOMAttribute) => {
        const rootAttr = getTabsterAttribute({ root: {} });

        return (
            <div {...rootAttr}>
                <button>Ignore</button>
                <div {...attr}>
                    <button id="first">Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                    <button id="last">Button4</button>
                </div>
                <button>Ignore</button>
            </div>
        );
    };

    it.each<
        [
            string,
            Types.MoverDirection,
            "pressDown" | "pressRight",
            "pressUp" | "pressLeft"
        ]
    >([
        ["vertical", Types.MoverDirections.Vertical, "pressDown", "pressUp"],
        [
            "horizontal",
            Types.MoverDirections.Horizontal,
            "pressRight",
            "pressLeft",
        ],
    ])(
        "should use arrow keys on %s axis",
        async (_, direction, next, previous) => {
            const attr = getTabsterAttribute({
                mover: {
                    direction,
                },
            });

            await new BroTest.BroTest(getTestHtml(attr))
                .focusElement("#first")
                // move forward
                [next]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button2")
                )
                [next]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button3")
                )
                [next]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button4")
                )
                // move backwards
                [previous]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button3")
                )
                [previous]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button2")
                )
                [previous]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1")
                );
        }
    );

    it.each<
        [
            string,
            Types.MoverDirection,
            "pressDown" | "pressRight",
            "pressUp" | "pressLeft"
        ]
    >([
        ["vertical", Types.MoverDirections.Vertical, "pressDown", "pressUp"],
        [
            "horizontal",
            Types.MoverDirections.Horizontal,
            "pressRight",
            "pressLeft",
        ],
    ])(
        "should not escape boundaries with arrow keys on %s axis",
        async (_, direction, next, previous) => {
            const attr = getTabsterAttribute({
                mover: {
                    direction,
                },
            });

            await new BroTest.BroTest(getTestHtml(attr))
                .focusElement("#first")
                [previous]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1")
                )
                .focusElement("#last")
                [next]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button4")
                );
        }
    );

    it.each<
        [
            string,
            Types.MoverDirection,
            "pressDown" | "pressRight",
            "pressUp" | "pressLeft"
        ]
    >([
        ["vertical", Types.MoverDirections.Vertical, "pressDown", "pressUp"],
        [
            "horizontal",
            Types.MoverDirections.Horizontal,
            "pressRight",
            "pressLeft",
        ],
    ])(
        "should allow circular navigation on %s axis",
        async (_, direction, next, previous) => {
            const attr = getTabsterAttribute({
                mover: {
                    direction,
                    cyclic: true,
                },
            });

            await new BroTest.BroTest(getTestHtml(attr))
                .focusElement("#first")
                [previous]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button4")
                )
                .focusElement("#last")
                [next]()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1")
                );
        }
    );

    it("should navigate using tab keys", async () => {
        const attr = getTabsterAttribute({
            mover: {
                direction: Types.MoverDirections.Horizontal,
                tabbable: true,
            },
        });

        await new BroTest.BroTest(getTestHtml(attr))
            .focusElement("#first")
            // move forward
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button4"))
            // move backwards
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"));
    });

    it("should leave the mover using tab if navigation type is arrows only", async () => {
        const attr = getTabsterAttribute({
            mover: {
                direction: Types.MoverDirections.Vertical,
            },
        });

        await new BroTest.BroTest(getTestHtml(attr))
            .focusElement("#last")
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Ignore"))
            .focusElement("#first")
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Ignore"));
    });
});

describe("NestedMovers", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    const getTestHtml = (
        parentAttr: Types.TabsterDOMAttribute,
        nestedAttr: Types.TabsterDOMAttribute
    ) => {
        const rootAttr = getTabsterAttribute({ root: {} });

        return (
            <div {...rootAttr}>
                <button>Ignore</button>
                <div {...parentAttr}>
                    <button id="parentFirst">Parent1</button>
                    <button>Parent2</button>
                    <button>Parent3</button>
                    <button id="parentLast">Parent4</button>
                    <div {...nestedAttr}>
                        <button id="nestedFirst">Nested1</button>
                        <button>Nested2</button>
                        <button>Nested3</button>
                        <button id="nestedLast">Nested4</button>
                    </div>
                </div>
                <button>Ignore</button>
            </div>
        );
    };

    it("should move from from parent to nested mover with arrow keys", async () => {
        const attr = getTabsterAttribute({
            mover: {
                direction: Types.MoverDirections.Vertical,
            },
        });

        await new BroTest.BroTest(getTestHtml(attr, attr))
            .focusElement("#parentLast")
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Nested1"));
    });

    it("should not move from from nested to parent mover with arrow keys", async () => {
        const attr = getTabsterAttribute({
            mover: {
                direction: Types.MoverDirections.Vertical,
            },
        });

        await new BroTest.BroTest(getTestHtml(attr, attr))
            .focusElement("#nestedFirst")
            .pressUp()
            .activeElement((el) => expect(el?.textContent).toEqual("Nested1"));
    });

    it("should not move from nested to parent mover with arrow keys with circular navigation", async () => {
        const attr = getTabsterAttribute({
            mover: {
                direction: Types.MoverDirections.Vertical,
                cyclic: true,
            },
        });

        await new BroTest.BroTest(getTestHtml(attr, attr))
            .focusElement("#nestedLast")
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Nested1"))
            .focusElement("#nestedFirst")
            .pressUp()
            .activeElement((el) => expect(el?.textContent).toEqual("Nested4"));
    });

    it("should allow user to prevent default and control tab focus", async () => {
        const attr = getTabsterAttribute({
            mover: {
                direction: Types.MoverDirections.Vertical,
                cyclic: true,
            },
            focusable: {
                ignoreKeydown: {
                    Tab: true,
                },
            },
        });

        await new BroTest.BroTest(
            (
                <div>
                    <button id="target">Target</button>
                    <button>Skipped</button>
                    <div {...attr} id="mover">
                        <button id="start">Mover Item</button>
                        <button>Mover Item</button>
                        <button>Mover Item</button>
                        <button>Mover Item</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                document
                    .getElementById("mover")
                    ?.addEventListener("keydown", (e) => {
                        if (e.key === "Tab" && e.shiftKey) {
                            e.preventDefault();
                            document.getElementById("target")?.focus();
                        }
                    });
            })
            .focusElement("#start")
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Target"));
    });
});

describe("Mover memorizing current", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should memorize current element and move to it when tabbing from outside of the Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                        <button>Button5</button>
                    </div>
                    <button>Button6</button>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
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
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should memorize current element and move to it when tabbing from outside of the page", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            });
    });
});

describe("Mover with excluded part", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should handle excluded part of Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button0</button>
                    <div
                        {...getTabsterAttribute({
                            mover: { tabbable: true, cyclic: true },
                        })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <div
                            {...getTabsterAttribute({
                                focusable: { excludeFromMover: true },
                            })}
                        >
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                    <button>Button7</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button0");
            })
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
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button7");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
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
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            });
    });

    it("should memorize current element and move to it when tabbing from outside of the page", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            });
    });
});

describe("Mover with inputs inside", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should move or not move focus depending on caret position", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button1</button>
                        <input type="text" defaultValue="Input" />
                        <button>Button2</button>
                        <textarea>Textarea</textarea>
                        <button>Button3</button>
                        <div tabIndex={0} contentEditable={true}>
                            Content{" "}
                            <strong>
                                editable <em>element</em>
                            </strong>{" "}
                            here
                        </div>
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
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressDown() // First Down moves to the end of the input value.
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Textarea");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Textarea");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Content editable element here"
                );
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Content editable element here"
                );
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Content editable element here"
                );
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Content editable element here"
                );
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Textarea");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Textarea");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should not move focus when aria-expanded is true", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button1</button>
                        <input
                            type="text"
                            defaultValue="Input"
                            aria-expanded="true"
                        />
                        <button>Button2</button>
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
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("Input");
            });
    });
});

describe("Mover with visibilityAware", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should tab to first/last visible element when tabbing from outside of the Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                visibilityAware:
                                    Types.Visibilities.PartiallyVisible,
                            },
                        })}
                        style={{ height: 200, overflow: "scroll" }}
                    >
                        <button style={{ height: 100, display: "block" }}>
                            Button2
                        </button>
                        <button style={{ height: 100, display: "block" }}>
                            Button3
                        </button>
                        <button style={{ height: 100, display: "block" }}>
                            Button4
                        </button>
                        <button style={{ height: 100, display: "block" }}>
                            Button5
                        </button>
                    </div>
                    <button>Button6</button>
                </div>
            )
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .wait(100) // Give time for intersection observer to process changes.
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });
});
