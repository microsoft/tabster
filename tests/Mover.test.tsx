/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    MoverDirections,
    MoverKeys,
    Types,
    Visibilities,
} from "tabster";
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
            "pressUp" | "pressLeft",
        ]
    >([
        ["vertical", MoverDirections.Vertical, "pressDown", "pressUp"],
        ["horizontal", MoverDirections.Horizontal, "pressRight", "pressLeft"],
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
            "pressUp" | "pressLeft",
        ]
    >([
        ["vertical", MoverDirections.Vertical, "pressDown", "pressUp"],
        ["horizontal", MoverDirections.Horizontal, "pressRight", "pressLeft"],
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
            "pressUp" | "pressLeft",
        ]
    >([
        ["vertical", MoverDirections.Vertical, "pressDown", "pressUp"],
        ["horizontal", MoverDirections.Horizontal, "pressRight", "pressLeft"],
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
                direction: MoverDirections.Horizontal,
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
                direction: MoverDirections.Vertical,
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
                direction: MoverDirections.Vertical,
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
                direction: MoverDirections.Vertical,
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
                direction: MoverDirections.Vertical,
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
                direction: MoverDirections.Vertical,
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
                <div
                    {...getTabsterAttribute({
                        root: {},
                    })}
                >
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
                getTabsterTestVariables()
                    .dom?.getElementById(document, "mover")
                    ?.addEventListener("keydown", (e) => {
                        if (e.key === "Tab" && e.shiftKey) {
                            e.preventDefault();
                            getTabsterTestVariables()
                                .dom?.getElementById(document, "target")
                                ?.focus();
                        }
                    });
            })
            .focusElement("#start")
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Target"));
    });

    it.each([
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "PageDown",
        "PageUp",
        "Home",
        "End",
    ] as const)("should ignore %s key", async (key) => {
        const attr = getTabsterAttribute({
            mover: {
                direction: MoverDirections.Vertical,
                cyclic: true,
            },
            focusable: {
                ignoreKeydown: {
                    [key]: true,
                },
            },
        });

        await new BroTest.BroTest(
            (
                <div
                    {...getTabsterAttribute({
                        root: {},
                    })}
                >
                    <div {...attr} id="mover">
                        <button id="start">Mover Item</button>
                        <button>Mover Item</button>
                        <button>Mover Item</button>
                        <button>Mover Item</button>
                    </div>
                </div>
            )
        )
            .focusElement("#start")
            .press(key)
            .activeElement((el) => expect(el?.attributes.id).toEqual("start"));
    });

    it.each([
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "PageDown",
        "PageUp",
        "Home",
        "End",
    ] as const)(
        "should ignore Ctrl, Alt, Shift and Meta keys with %s",
        async (key) => {
            const attr = getTabsterAttribute({
                mover: {
                    direction: MoverDirections.Both,
                    cyclic: true,
                },
            });

            await new BroTest.BroTest(
                (
                    <div
                        {...getTabsterAttribute({
                            root: {},
                        })}
                    >
                        <div {...attr} id="mover">
                            <button id="start">Mover Item 1</button>
                            <button>Mover Item 2</button>
                            <button>Mover Item 3</button>
                            <button>Mover Item 4</button>
                        </div>
                    </div>
                )
            )
                .focusElement("#start")
                .press(key, { ctrl: true })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Mover Item 1")
                )
                .press(key, { alt: true })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Mover Item 1")
                )
                .press(key, { shift: true })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Mover Item 1")
                )
                .press(key, { meta: true })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Mover Item 1")
                );
        }
    );
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

    it("should forget or modify memorized element when tabster:mover:memorized-element is dispatched", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        id="mover"
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button id="button4">Button4</button>
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
            .eval(() => {
                const vars = getTabsterTestVariables();

                const target = vars.dom?.getElementById(document, "mover");
                const MoverMemorizedElementEvent =
                    vars.Events?.MoverMemorizedElementEvent;

                if (target && MoverMemorizedElementEvent) {
                    target.dispatchEvent(
                        new MoverMemorizedElementEvent({
                            memorizedElement: undefined,
                        })
                    );
                }
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval(() => {
                const vars = getTabsterTestVariables();
                const target = vars.dom?.getElementById(document, "button4");
                const MoverMemorizedElementEvent =
                    vars.Events?.MoverMemorizedElementEvent;

                MoverMemorizedElementEvent &&
                    target?.dispatchEvent(
                        new MoverMemorizedElementEvent({
                            memorizedElement: target,
                        })
                    );
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should move to first element when the previously memorized one is removed from DOM", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>Button1</button>
                        <button id="button2">Button2</button>
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
            .removeElement("#button2")
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
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
                        <input type="button" value="InputButton" />
                        <input type="checkbox" value="InputCheckbox" />
                        <input type="color" value="InputColor" />
                        <input type="date" value="InputDate" />
                        <input
                            type="datetime-local"
                            value="InputDatetime-local"
                        />
                        <input type="email" value="InputEmail" />
                        <input type="file" value="InputFile" />
                        <input type="hidden" value="InputHidden" />
                        <input type="image" value="InputImage" />
                        <input type="month" value="InputMonth" />
                        <input type="number" value="123" />
                        <input type="password" value="InputPassword" />
                        <input type="radio" value="InputRadio" />
                        <input
                            type="range"
                            value="0"
                            min="0"
                            max="2"
                            step="1"
                        />
                        <input type="reset" value="InputReset" />
                        <input type="search" value="InputSearch" />
                        <input type="submit" value="InputSubmit" />
                        <input type="tel" value="InputTel" />
                        <input type="time" value="InputTime" />
                        <input type="url" value="InputUrl" />
                        <input type="week" value="InputWeek" />
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
                expect(el?.attributes.value).toEqual("InputButton");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputCheckbox");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputColor");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputDate");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputDatetime-local");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputEmail");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputEmail");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputFile");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputImage");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputMonth");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("123");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("123");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputPassword");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputPassword");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputRadio");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("0");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputReset");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputSearch");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputSearch");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputSubmit");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputTel");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputTel");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputTime");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputUrl");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputUrl");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputWeek");
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
                expect(el?.attributes.value).toEqual("InputWeek");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputUrl");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputUrl");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputTime");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputTel");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputTel");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputSubmit");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputSearch");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputSearch");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputReset");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("0");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputRadio");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputPassword");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputPassword");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("123");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("123");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("123");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("123");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputMonth");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputImage");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputFile");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputEmail");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputEmail");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputDatetime-local");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputDate");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputColor");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputCheckbox");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.attributes.value).toEqual("InputButton");
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

    it("should not move focus when aria-expanded is true and aria-activedescendant is present", async () => {
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
                            aria-activedescendant="ololo"
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

    it("should move focus when aria-expanded is true, but aria-activedescendant is not set", async () => {
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
});

describe("Mover with trackState", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("trigger events as we scroll", async () => {
        const itemStyles = {
            height: 20,
        };

        const containerStyles = {
            height: 50,
            overflowY: "scroll" as const,
        };

        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div id="container" style={containerStyles}>
                        <div id="one" tabIndex={0} style={itemStyles}>
                            Item 1
                        </div>
                        <div id="two" tabIndex={0} style={itemStyles}>
                            Item 2
                        </div>
                        <div id="three" tabIndex={0} style={itemStyles}>
                            Item 3
                        </div>
                        <div id="four" tabIndex={0} style={itemStyles}>
                            Item 4
                        </div>
                    </div>
                </div>
            )
        )
            .eval(
                (moverAttribute: string) => {
                    document.addEventListener("tabster:mover:state", (e) => {
                        let className = "item";

                        switch (e.detail?.visibility) {
                            case 0:
                                className += " invisible";
                                break;
                            case 1:
                                className += " partially-visible";
                                break;
                            case 2:
                                className += " visible";
                                break;
                        }

                        if (e.detail?.isCurrent) {
                            className += " active";
                        }

                        const target = e.composedPath()[0] as HTMLElement;

                        target.className = className;
                    });

                    // Adding mover after the event subscription.
                    getTabsterTestVariables()
                        .dom?.getElementById(document, "container")
                        ?.setAttribute("data-tabster", moverAttribute);
                },
                getTabsterAttribute({ mover: { trackState: true } }, true)
            )
            .wait(300)
            .eval(() =>
                Array.prototype.map.call(
                    getTabsterTestVariables().dom?.querySelectorAll(
                        document,
                        ".item"
                    ),
                    (el: HTMLElement) => el.className
                )
            )
            .check((classNames) => {
                expect(classNames).toEqual([
                    "item visible",
                    "item visible",
                    "item partially-visible",
                    "item invisible",
                ]);
            })
            .scrollTo("#container", 0, 50)
            .wait(300)
            .eval(() =>
                Array.prototype.map.call(
                    getTabsterTestVariables().dom?.querySelectorAll(
                        document,
                        ".item"
                    ),
                    (el: HTMLElement) => el.className
                )
            )
            .check((classNames) => {
                expect(classNames).toEqual([
                    "item invisible",
                    "item partially-visible",
                    "item visible",
                    "item visible",
                ]);
            });
    });
});

describe("Mover with visibilityAware", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should scroll to first visible element with PageUp", async () => {
        const itemStyles = {
            height: 100,
            width: 100,
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed blue",
            boxSizing: "border-box" as const,
        };

        const containerStyles = {
            height: 200,
            width: 200,
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            border: "1px dashed red",
            boxSizing: "border-box" as const,
            overflowY: "scroll" as const,
        };

        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        id="container"
                        {...getTabsterAttribute({
                            mover: {
                                visibilityAware: Visibilities.PartiallyVisible,
                            },
                        })}
                        style={containerStyles}
                    >
                        <div id="one" tabIndex={0} style={itemStyles}>
                            Item 1
                        </div>
                        <div id="two" tabIndex={0} style={itemStyles}>
                            Item 2
                        </div>
                        <div id="three" tabIndex={0} style={itemStyles}>
                            Item 3
                        </div>
                        <div id="four" tabIndex={0} style={itemStyles}>
                            Item 4
                        </div>
                    </div>
                </div>
            )
        )
            .focusElement("#two")
            .activeElement((el) => el?.attributes.id === "two")
            .scrollTo("#container", 0, 20)
            .press("PageUp")
            .activeElement((el) => el?.attributes.id === "one")
            .focusElement("#two")
            .activeElement((el) => el?.attributes.id === "two")
            .scrollTo("#container", 0, 10)
            .press("PageUp")
            .activeElement((el) => el?.attributes.id === "two");
    });

    it("should scroll to last visible element with PageDown", async () => {
        const itemStyles = {
            height: 100,
            width: 100,
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed blue",
            boxSizing: "border-box" as const,
        };

        const containerStyles = {
            height: 200,
            width: 200,
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            border: "1px dashed red",
            boxSizing: "border-box" as const,
            overflowY: "scroll" as const,
        };

        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        id="container"
                        {...getTabsterAttribute({
                            mover: {
                                visibilityAware: Visibilities.PartiallyVisible,
                            },
                        })}
                        style={containerStyles}
                    >
                        <div id="one" tabIndex={0} style={itemStyles}>
                            Item 1
                        </div>
                        <div id="two" tabIndex={0} style={itemStyles}>
                            Item 2
                        </div>
                        <div id="three" tabIndex={0} style={itemStyles}>
                            Item 3
                        </div>
                        <div id="four" tabIndex={0} style={itemStyles}>
                            Item 4
                        </div>
                    </div>
                </div>
            )
        )
            .focusElement("#two")
            .activeElement((el) => el?.attributes.id === "two")
            .scrollTo("#container", 0, 80)
            .press("PageDown")
            .activeElement((el) => el?.attributes.id === "three")
            .scrollTo("#container", 0, 85)
            .press("PageDown")
            .activeElement((el) => el?.attributes.id === "two");
    });

    it("should be able to configure visibility tolerance", async () => {
        const itemStyles = {
            height: 100,
            width: 100,
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed blue",
            boxSizing: "border-box" as const,
        };

        const containerStyles = {
            height: 200,
            width: 200,
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            border: "1px dashed red",
            boxSizing: "border-box" as const,
            overflowY: "scroll" as const,
        };

        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        id="container"
                        {...getTabsterAttribute({
                            mover: {
                                visibilityAware: Visibilities.PartiallyVisible,
                                visibilityTolerance: 0.1,
                            },
                        })}
                        style={containerStyles}
                    >
                        <div id="one" tabIndex={0} style={itemStyles}>
                            Item 1
                        </div>
                        <div id="two" tabIndex={0} style={itemStyles}>
                            Item 2
                        </div>
                        <div id="three" tabIndex={0} style={itemStyles}>
                            Item 3
                        </div>
                        <div id="four" tabIndex={0} style={itemStyles}>
                            Item 4
                        </div>
                    </div>
                </div>
            )
        )
            .focusElement("#two")
            .activeElement((el) => el?.attributes.id === "two")
            .scrollTo("#container", 0, 80)
            .press("PageUp")
            .activeElement((el) => el?.attributes.id === "one");
    });

    it("should tab to first/last visible element when tabbing from outside of the Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                visibilityAware: Visibilities.PartiallyVisible,
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
            .wait(100) // Give time for intersection observer to process changes.
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });
});

describe("Mover with grid", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should properly move focus with arrow keys in grid as <table>", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Grid,
                            },
                        })}
                    >
                        <table>
                            <tr>
                                <td tabIndex={0}>Row1-Col1</td>
                                <td>
                                    <button style={{ fontSize: "50%" }}>
                                        Row1-Col2
                                    </button>
                                </td>
                                <td style={{ padding: 10 }}>
                                    <button>Row1-Col3</button>
                                </td>
                            </tr>
                            <tr>
                                <td tabIndex={0}>Row2-Col1</td>
                                <td align="right">
                                    <button
                                        style={{
                                            fontSize: "50%",
                                            marginLeft: 40,
                                        }}
                                    >
                                        Row2-Col2
                                    </button>
                                </td>
                                <td style={{ padding: 10 }}>
                                    <button>Row2-Col3</button>
                                </td>
                            </tr>
                            <tr>
                                <td tabIndex={0}>Row3-Col1</td>
                                <td align="center">
                                    <button style={{ fontSize: "50%" }}>
                                        Row3-Col2
                                    </button>
                                </td>
                                <td style={{ padding: 10 }}>
                                    <button>Row3-Col3</button>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row2-Col1");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row2-Col1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col1");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col1");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col2");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row2-Col2");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col2");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col3");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row2-Col3");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row2-Col3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col3");
            })
            .press("Home")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col1");
            })
            .press("End")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col3");
            })
            .press("PageUp")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col3");
            })
            .press("PageDown")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row3-Col3");
            });
    });

    it("should properly move focus with arrow keys in grid as just a set of focusable elements", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Grid,
                            },
                        })}
                        style={{
                            width: 250,
                            display: "flex",
                            flexWrap: "wrap",
                        }}
                    >
                        <div tabIndex={0} style={{ width: 50, height: 50 }}>
                            Item1
                        </div>
                        <div tabIndex={0} style={{ width: 150, height: 50 }}>
                            Item2
                        </div>
                        <div tabIndex={0} style={{ width: 50, height: 50 }}>
                            Item3
                        </div>
                        <div tabIndex={0} style={{ width: 150, height: 50 }}>
                            Item4
                        </div>
                        <div tabIndex={0} style={{ width: 50, height: 50 }}>
                            Item5
                        </div>
                        <div tabIndex={0} style={{ width: 50, height: 50 }}>
                            Item6
                        </div>
                        <div tabIndex={0} style={{ width: 50, height: 50 }}>
                            Item7
                        </div>
                        <div tabIndex={0} style={{ width: 50, height: 50 }}>
                            Item8
                        </div>
                        <div tabIndex={0} style={{ width: 150, height: 50 }}>
                            Item9
                        </div>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item7");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item7");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item8");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item9");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item6");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .press("Home")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item1");
            })
            .press("End")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .press("Home")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item1");
            })
            .press("PageDown")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item7");
            })
            .press("PageUp")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item1");
            });
    });

    it("should properly move focus with arrow keys in grid as just a set of focusable elements with different margins", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Grid,
                            },
                        })}
                        style={{
                            width: 250,
                            display: "flex",
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 50,
                                height: 40,
                                margin: 10,
                            }}
                        >
                            Item1
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 150,
                                height: 30,
                                margin: 5,
                            }}
                        >
                            Item2
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 50,
                                height: 50,
                                margin: 15,
                            }}
                        >
                            Item3
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 150,
                                height: 25,
                                margin: 8,
                            }}
                        >
                            Item4
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 50,
                                height: 40,
                                margin: 3,
                            }}
                        >
                            Item5
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 50,
                                height: 50,
                                margin: 9,
                            }}
                        >
                            Item6
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 50,
                                height: 40,
                                margin: 1,
                            }}
                        >
                            Item7
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 50,
                                height: 30,
                                margin: 0,
                            }}
                        >
                            Item8
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                border: "1px solid red",
                                width: 150,
                                height: 50,
                                margin: 10,
                            }}
                        >
                            Item9
                        </div>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item5");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item9");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item9");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item2");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item7");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item8");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item8");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            });
    });

    it("should pick the closest element in grid when there is nothing directly below", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Grid,
                            },
                        })}
                        style={{
                            width: 280,
                            display: "flex",
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            tabIndex={0}
                            style={{
                                width: 50,
                                height: 50,
                                marginLeft: 60,
                                border: "1px solid red",
                            }}
                        >
                            Item1
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                width: 50,
                                height: 50,
                                marginRight: 100,
                                border: "1px solid red",
                            }}
                        >
                            Item2
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                width: 50,
                                height: 50,
                                border: "1px solid red",
                            }}
                        >
                            Item3
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                width: 50,
                                height: 50,
                                marginLeft: 115,
                                border: "1px solid red",
                            }}
                        >
                            Item4
                        </div>
                        <div
                            tabIndex={0}
                            style={{
                                width: 50,
                                height: 50,
                                border: "1px solid red",
                            }}
                        >
                            Item5
                        </div>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item2");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item4");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Item1");
            });
    });
});

describe("Mover with linear grid", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should properly move focus with arrow keys in linear grid as <table>", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.GridLinear,
                            },
                        })}
                    >
                        <table>
                            <tr>
                                <td tabIndex={0}>Row1-Col1</td>
                                <td>
                                    <button style={{ fontSize: "50%" }}>
                                        Row1-Col2
                                    </button>
                                </td>
                                <td style={{ padding: 10 }}>
                                    <button>Row1-Col3</button>
                                </td>
                            </tr>
                            <tr>
                                <td tabIndex={0}>Row2-Col1</td>
                                <td align="right">
                                    <button
                                        style={{
                                            fontSize: "50%",
                                            marginLeft: 40,
                                        }}
                                    >
                                        Row2-Col2
                                    </button>
                                </td>
                                <td style={{ padding: 10 }}>
                                    <button>Row2-Col3</button>
                                </td>
                            </tr>
                            <tr>
                                <td tabIndex={0}>Row3-Col1</td>
                                <td align="center">
                                    <button style={{ fontSize: "50%" }}>
                                        Row3-Col2
                                    </button>
                                </td>
                                <td style={{ padding: 10 }}>
                                    <button>Row3-Col3</button>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col1");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col2");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col3");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row2-Col1");
            })
            .pressLeft()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Row1-Col3");
            });
    });
});

describe("Adjacent Movers", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should handle adjacent Movers correctly", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button4</button>
                        <button>Button5</button>
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
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

    it("should handle adjacent Movers with memorizeCurrent correctly", async () => {
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
                    </div>
                    <div
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>Button4</button>
                        <button>Button5</button>
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressUp()
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it.each<["div" | "ul" | "li"]>([["div"], ["ul"], ["li"]])(
        "should handle adjacent Movers in extra wrapper correctly",
        async (tagName: string) => {
            const TagName = tagName;
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <div>
                            <div>
                                <TagName
                                    {...getTabsterAttribute({
                                        mover: {
                                            direction:
                                                MoverDirections.Horizontal,
                                        },
                                    })}
                                >
                                    <button>Button1</button>
                                    <button>Button2</button>
                                </TagName>
                            </div>
                        </div>
                        <div>
                            <div>
                                <TagName
                                    {...getTabsterAttribute({
                                        mover: {
                                            direction:
                                                MoverDirections.Horizontal,
                                        },
                                    })}
                                >
                                    <button>Button3</button>
                                    <button>Button4</button>
                                </TagName>
                            </div>
                        </div>
                    </div>
                )
            )
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button4");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button4");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                });
        }
    );

    it.each<["div" | "ul" | "li"]>([["div"], ["ul"], ["li"]])(
        "should handle adjacent Movers with memorizeCurrent in extra wrapper correctly",
        async (tagName: string) => {
            const TagName = tagName;
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <div>
                            <div>
                                <TagName
                                    {...getTabsterAttribute({
                                        mover: {
                                            direction:
                                                MoverDirections.Horizontal,
                                            memorizeCurrent: true,
                                        },
                                    })}
                                >
                                    <button>Button1</button>
                                    <button>Button2</button>
                                </TagName>
                            </div>
                        </div>
                        <div>
                            <div>
                                <TagName
                                    {...getTabsterAttribute({
                                        mover: {
                                            direction:
                                                MoverDirections.Horizontal,
                                            memorizeCurrent: true,
                                        },
                                    })}
                                >
                                    <button>Button3</button>
                                    <button>Button4</button>
                                </TagName>
                            </div>
                        </div>
                    </div>
                )
            )
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button4");
                })
                .pressRight()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button4");
                })
                .pressLeft()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        }
    );
});

describe("Mover with default element", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should focus default focusable when tabbing from outside", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: { hasDefault: true },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button
                            {...getTabsterAttribute({
                                focusable: { isDefault: true },
                            })}
                        >
                            Button4
                        </button>
                        <button>Button5</button>
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
                expect(el?.textContent).toEqual("Button4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should focus memorized element or default focusable when tabbing from outside", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: { hasDefault: true, memorizeCurrent: true },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button
                            {...getTabsterAttribute({
                                focusable: { isDefault: true },
                            })}
                        >
                            Button4
                        </button>
                        <button>Button5</button>
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
                expect(el?.textContent).toEqual("Button4");
            })
            .pressUp()
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
            });
    });

    it("should treat hasDefault as true when it is not specified", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button
                            {...getTabsterAttribute({
                                focusable: { isDefault: true },
                            })}
                        >
                            Button4
                        </button>
                        <button>Button5</button>
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
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should not look for default when hasDefault is false", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: { hasDefault: false },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button
                            {...getTabsterAttribute({
                                focusable: { isDefault: true },
                            })}
                        >
                            Button4
                        </button>
                        <button>Button5</button>
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            });
    });
});

describe("Mover with tabster:movefocus event handling", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should allow to custom handle the focus movement", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                        <button>Button5</button>
                    </div>
                    <button id="button-6">Button6</button>
                </div>
            )
        )
            .eval(() => {
                document.addEventListener("tabster:movefocus", (e) => {
                    if (
                        getTabsterTestVariables().dom?.getActiveElement(
                            document
                        )?.textContent === "Button3"
                    ) {
                        e.preventDefault();
                        e.detail?.relatedEvent?.preventDefault();
                        getTabsterTestVariables()
                            .dom?.getElementById(document, "button-6")
                            ?.focus();
                    }

                    if (
                        getTabsterTestVariables().dom?.getActiveElement(
                            document
                        )?.textContent === "Button4"
                    ) {
                        e.preventDefault();
                        e.detail?.relatedEvent?.preventDefault();
                        getTabsterTestVariables()
                            .dom?.getElementById(document, "button-1")
                            ?.focus();
                    }
                });
            })
            .pressTab()
            .pressTab()
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Button6"))
            .pressTab(true)
            .pressUp()
            .activeElement((el) => expect(el?.textContent).toEqual("Button4"))
            .press("PageDown")
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"));
    });
});

describe("Mover moves focus by tabster:mover:movefocus", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true });
    });

    it("should move focus with tabster:mover:movefocus", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                        <button>Button5</button>
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
            .press("PageDown")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .press("PageUp")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .press("End")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .press("Home")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval((key) => {
                const activeElement =
                    getTabsterTestVariables()?.dom?.getActiveElement(document);
                const MoverMoveFocusEvent =
                    getTabsterTestVariables()?.Events?.MoverMoveFocusEvent;

                activeElement &&
                    MoverMoveFocusEvent &&
                    activeElement.dispatchEvent(
                        new MoverMoveFocusEvent({ key })
                    );
            }, MoverKeys.ArrowDown)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .eval((key) => {
                const activeElement =
                    getTabsterTestVariables()?.dom?.getActiveElement(document);
                const MoverMoveFocusEvent =
                    getTabsterTestVariables()?.Events?.MoverMoveFocusEvent;

                activeElement &&
                    MoverMoveFocusEvent &&
                    activeElement.dispatchEvent(
                        new MoverMoveFocusEvent({ key })
                    );
            }, MoverKeys.PageDown)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .eval((key) => {
                const activeElement =
                    getTabsterTestVariables()?.dom?.getActiveElement(document);
                const MoverMoveFocusEvent =
                    getTabsterTestVariables()?.Events?.MoverMoveFocusEvent;

                activeElement &&
                    MoverMoveFocusEvent &&
                    activeElement.dispatchEvent(
                        new MoverMoveFocusEvent({ key })
                    );
            }, MoverKeys.ArrowUp)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .eval((key) => {
                const activeElement =
                    getTabsterTestVariables()?.dom?.getActiveElement(document);
                const MoverMoveFocusEvent =
                    getTabsterTestVariables()?.Events?.MoverMoveFocusEvent;

                activeElement &&
                    MoverMoveFocusEvent &&
                    activeElement.dispatchEvent(
                        new MoverMoveFocusEvent({ key })
                    );
            }, MoverKeys.PageUp)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval((key) => {
                const activeElement =
                    getTabsterTestVariables()?.dom?.getActiveElement(document);
                const MoverMoveFocusEvent =
                    getTabsterTestVariables()?.Events?.MoverMoveFocusEvent;

                activeElement &&
                    MoverMoveFocusEvent &&
                    activeElement.dispatchEvent(
                        new MoverMoveFocusEvent({ key })
                    );
            }, MoverKeys.End)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .eval((key) => {
                const activeElement =
                    getTabsterTestVariables()?.dom?.getActiveElement(document);
                const MoverMoveFocusEvent =
                    getTabsterTestVariables()?.Events?.MoverMoveFocusEvent;

                activeElement &&
                    MoverMoveFocusEvent &&
                    activeElement.dispatchEvent(
                        new MoverMoveFocusEvent({ key })
                    );
            }, MoverKeys.Home)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });
});

interface NodeWithVirtualParent extends Node {
    _virtual: {
        parent?: Node;
    };
}

describe("Mover with virtual children provided by getParent()", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should not consider virtual children parts of the mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <button>Button1</button>
                        <button id="virtual-parent">Button2</button>
                    </div>
                    <div id="virtual-child">
                        <button>VButton1</button>
                        <button>VButton2</button>
                    </div>
                    <button>Button3</button>
                </div>
            )
        )
            .eval(() => {
                const vars = getTabsterTestVariables();

                function isVirtualElement(
                    element: Node
                ): element is NodeWithVirtualParent {
                    // eslint-disable-next-line no-prototype-builtins
                    return element && element.hasOwnProperty("_virtual");
                }

                function getVirtualParent(child: Node): Node | null {
                    return isVirtualElement(child)
                        ? child._virtual.parent || null
                        : null;
                }

                function setVirtualParent(
                    child: Node,
                    parent?: Node | null
                ): void {
                    const virtualChild = child;

                    if (
                        !(virtualChild as unknown as NodeWithVirtualParent)
                            ._virtual
                    ) {
                        (
                            virtualChild as unknown as NodeWithVirtualParent
                        )._virtual = {};
                    }

                    if (parent) {
                        (
                            virtualChild as unknown as NodeWithVirtualParent
                        )._virtual.parent = parent;
                    } else {
                        delete (
                            virtualChild as unknown as NodeWithVirtualParent
                        )._virtual.parent;
                    }
                }

                function getParent(child: Node | null): Node | null {
                    if (!child) {
                        return null;
                    }

                    const virtualParent = getVirtualParent(child);

                    if (virtualParent) {
                        return virtualParent;
                    }

                    return (
                        vars.dom?.getParentElement(child as HTMLElement) || null
                    );
                }

                const tabster = vars.createTabster?.(window, {
                    getParent,
                });

                tabster && vars.getMover?.(tabster);

                const virtualParent = vars.dom?.getElementById(
                    document,
                    "virtual-parent"
                );
                const virtualChild = vars.dom?.getElementById(
                    document,
                    "virtual-child"
                );

                virtualChild && setVirtualParent(virtualChild, virtualParent);
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("VButton1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("VButton2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            });
    });
});
