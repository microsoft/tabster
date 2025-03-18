/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    GroupperMoveFocusActions,
    GroupperTabbabilities,
    Types,
} from "tabster";
import * as BroTest from "./utils/BroTest";
import { describeIfUncontrolled } from "./utils/test-utils";

const groupperItem = (
    tagName: "div" | "li",
    tabsterAttr: Types.TabsterDOMAttribute,
    isFocusable: boolean,
    count: number
) => {
    const Tag = tagName;
    return (
        <Tag
            tabIndex={isFocusable ? 0 : undefined}
            {...tabsterAttr}
            data-count={`${count}`}
        >
            <button>Foo{count}</button>
            <button>Bar{count}</button>
        </Tag>
    );
};

describe("Groupper - default", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    const getTestHtml = (
        tagName: "div" | "li",
        ignoreEsc?: boolean,
        ignoreEnter?: boolean,
        limited?: boolean
    ) => {
        const rootAttr = getTabsterAttribute({ root: {} });
        let ignoreKeydown: Types.FocusableProps["ignoreKeydown"] | undefined;

        if (ignoreEsc || ignoreEnter) {
            ignoreKeydown = {};

            if (ignoreEsc) {
                ignoreKeydown.Escape = true;
            }
            if (ignoreEnter) {
                ignoreKeydown.Enter = true;
            }
        }

        const groupperAttr = getTabsterAttribute({
            groupper: {
                ...(limited
                    ? { tabbability: GroupperTabbabilities.Limited }
                    : null),
            },
            ...(ignoreKeydown ? { focusable: { ignoreKeydown } } : null),
        });

        return (
            <div {...rootAttr}>
                {groupperItem(tagName, groupperAttr, true, 1)}
                {groupperItem(tagName, groupperAttr, true, 2)}
                {groupperItem(tagName, groupperAttr, true, 3)}
                {groupperItem(tagName, groupperAttr, true, 4)}
            </div>
        );
    };

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should focus groupper as <%s>",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName))
                .pressTab()
                .activeElement((el) =>
                    expect(el?.attributes["data-count"]).toBe("1")
                );
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should focus inside groupper as <%s> with Tab key",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName))
                .pressTab()
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo1"));
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should escape focus inside groupper as <%s> with Escape key",
        async (tagName) => {
            interface WindowWithEscFlag extends Window {
                __escPressed1?: number;
            }

            await new BroTest.BroTest(getTestHtml(tagName))
                .eval(() => {
                    (window as WindowWithEscFlag).__escPressed1 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.key === "Escape") {
                            (window as WindowWithEscFlag).__escPressed1!++;
                        }
                    });
                })
                .pressTab()
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toEqual("Foo1"))
                .pressEsc()
                .activeElement((el) =>
                    expect(el?.attributes["data-count"]).toBe("1")
                )
                .eval(() => (window as WindowWithEscFlag).__escPressed1)
                .check((escPressed: number) => {
                    expect(escPressed).toBe(1);
                });
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should not escape focus inside groupper as <%s> with Escape key when ignore Escape is passed",
        async (tagName) => {
            interface WindowWithEscFlag extends Window {
                __escPressed2?: number;
            }

            await new BroTest.BroTest(getTestHtml(tagName, true))
                .eval(() => {
                    (window as WindowWithEscFlag).__escPressed2 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.key === "Escape") {
                            (window as WindowWithEscFlag).__escPressed2!++;
                        }
                    });
                })
                .pressTab()
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toEqual("Foo1"))
                .pressEsc()
                .activeElement((el) => expect(el?.textContent).toEqual("Foo1"))
                .eval(() => (window as WindowWithEscFlag).__escPressed2)
                .check((escPressed: number) => {
                    expect(escPressed).toBe(1);
                });
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should enter inside groupper as <%s> with Enter key when ignore Enter is passed",
        async (tagName) => {
            interface WindowWithEnterFlag extends Window {
                __enterPressed1?: number;
            }

            await new BroTest.BroTest(getTestHtml(tagName))
                .eval(() => {
                    (window as WindowWithEnterFlag).__enterPressed1 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") {
                            (window as WindowWithEnterFlag).__enterPressed1!++;
                        }
                    });
                })
                .pressTab()
                .pressEnter()
                .activeElement((el) => expect(el?.textContent).toEqual("Foo1"))
                .eval(() => (window as WindowWithEnterFlag).__enterPressed1)
                .check((escPressed: number) => {
                    expect(escPressed).toBe(0);
                });
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should not enter inside groupper as <%s> with Enter key when ignore Enter is passed",
        async (tagName) => {
            interface WindowWithEnterFlag extends Window {
                __enterPressed2?: number;
            }

            await new BroTest.BroTest(
                getTestHtml(tagName, undefined, true, true)
            )
                .eval(() => {
                    (window as WindowWithEnterFlag).__enterPressed2 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") {
                            (window as WindowWithEnterFlag).__enterPressed2!++;
                        }
                    });
                })
                .pressTab()
                .pressEnter()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Foo1Bar1")
                )
                .eval(() => (window as WindowWithEnterFlag).__enterPressed2)
                .check((escPressed: number) => {
                    expect(escPressed).toBe(1);
                });
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should not escape groupper as <%s> with Escape key if the application has moved the focus",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName))
                .eval(() => {
                    window.addEventListener("keydown", (e) => {
                        if (e.key === "Escape") {
                            // Focusing next button.
                            (
                                getTabsterTestVariables().dom?.getActiveElement(
                                    document
                                )?.nextElementSibling as HTMLElement | undefined
                            )?.focus();
                        }
                    });
                })
                .pressTab()
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toEqual("Foo1"))
                .pressEsc()
                .activeElement((el) => expect(el?.textContent).toEqual("Bar1"));
        }
    );
});

describe("Groupper - limited focus trap", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    const getTestHtml = (
        tagName: "div" | "li",
        isFocusable: boolean,
        delegated: boolean
    ) => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const groupperAttr = getTabsterAttribute({
            groupper: {
                tabbability: GroupperTabbabilities.LimitedTrapFocus,
                ...(delegated ? { delegated: true } : null),
            },
        });

        return (
            <div {...rootAttr}>
                {groupperItem(tagName, groupperAttr, isFocusable, 1)}
                {groupperItem(tagName, groupperAttr, isFocusable, 2)}
                {groupperItem(tagName, groupperAttr, isFocusable, 3)}
                {groupperItem(tagName, groupperAttr, isFocusable, 4)}
            </div>
        );
    };

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should focus inside groupper as <%s> with Enter key",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName, true, false))
                .pressTab()
                .pressEnter()
                .activeElement((el) => expect(el?.textContent).toBe("Foo1"));
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should escape focus inside groupper as <%s> with Escape key",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName, true, false))
                .pressTab()
                .pressEnter()
                .pressEsc()
                .activeElement((el) =>
                    expect(el?.attributes["data-count"]).toBe("1")
                );
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should trap focus within groupper as <%s>",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName, true, false))
                .pressTab()
                .pressEnter()
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Bar1"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo1"));
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should trap focus within groupper with not focusable container as <%s>",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName, false, false))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo1"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Bar1"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo1"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Bar1"));
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should not trap focus within groupper with delegated prop and not focusable container as <%s>",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName, false, true))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo1"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo2"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo3"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo4"))
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toBeUndefined();
                })
                .pressTab(true)
                .activeElement((el) => expect(el?.textContent).toBe("Foo4"))
                .pressTab(true)
                .activeElement((el) => expect(el?.textContent).toBe("Foo3"))
                .pressEnter()
                .activeElement((el) => expect(el?.textContent).toBe("Bar3"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Foo3"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Bar3"));
        }
    );

    it.each(["ctrl", "alt", "shift", "meta"] as const)(
        "should ignore Enter and Esc keys with %s",
        async (key) => {
            await new BroTest.BroTest(
                (
                    <div
                        {...getTabsterAttribute({
                            root: {},
                        })}
                    >
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>Button1</button>
                            <button>Button2</button>
                        </div>
                    </div>
                )
            )
                .pressTab()
                .press("Enter", { [key]: true })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1Button2")
                )
                .pressEnter()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1")
                )
                .press("Escape", { [key]: true })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1")
                )
                .pressEsc()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1Button2")
                );
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should enter and escape groupper as <%s> with tabster:groupper:movefocus event",
        async (tagName) => {
            await new BroTest.BroTest(getTestHtml(tagName, true, false))
                .pressTab()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Foo1Bar1")
                )
                .pressEnter()
                .activeElement((el) => expect(el?.textContent).toEqual("Foo1"))
                .pressEsc()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Foo1Bar1")
                )
                .eval((action) => {
                    const activeElement =
                        getTabsterTestVariables()?.dom?.getActiveElement(
                            document
                        );
                    const GroupperMoveFocusEvent =
                        getTabsterTestVariables()?.Events
                            ?.GroupperMoveFocusEvent;

                    activeElement &&
                        GroupperMoveFocusEvent &&
                        activeElement.dispatchEvent(
                            new GroupperMoveFocusEvent({ action })
                        );
                }, GroupperMoveFocusActions.Enter)
                .activeElement((el) => expect(el?.textContent).toEqual("Foo1"))
                .eval((action) => {
                    const activeElement =
                        getTabsterTestVariables()?.dom?.getActiveElement(
                            document
                        );
                    const GroupperMoveFocusEvent =
                        getTabsterTestVariables()?.Events
                            ?.GroupperMoveFocusEvent;

                    activeElement &&
                        GroupperMoveFocusEvent &&
                        activeElement.dispatchEvent(
                            new GroupperMoveFocusEvent({ action })
                        );
                }, GroupperMoveFocusActions.Escape)
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Foo1Bar1")
                );
        }
    );
});

describe("Groupper tabbing forward and backwards", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should properly move the focus when tabbing from outside of the groupper as <%s>",
        async (tagName) => {
            const Tag = tagName;
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button>Button1</button>
                        <Tag
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability: GroupperTabbabilities.Limited,
                                },
                            })}
                        >
                            <button>Button2</button>
                            <button>Button3</button>
                        </Tag>
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
                    expect(el?.textContent).toEqual("Button2Button3");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button4");
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2Button3");
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should properly move the focus when tabbing from outside of the page to groupper as <%s>",
        async (tagName) => {
            const Tag = tagName;
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <Tag
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability: GroupperTabbabilities.Limited,
                                },
                            })}
                        >
                            <button>Button1</button>
                            <button>Button2</button>
                        </Tag>
                    </div>
                )
            )
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1Button2");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toBeUndefined();
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1Button2");
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toBeUndefined();
                });
        }
    );
});

// TODO: Address contentEditables in a controlled groupper (likely by having dummy inputs around).
describeIfUncontrolled("Groupper", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    describe("Groupper with contentEditable", () => {
        it.each<["div" | "li"]>([["div"], ["li"]])(
            "should handle contentEditable in a trapped groupper as <%s>",
            async (tagName) => {
                const Tag = tagName;
                await new BroTest.BroTest(
                    (
                        <div {...getTabsterAttribute({ root: {} })}>
                            <button>Button1</button>
                            <Tag
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                    },
                                })}
                            >
                                <div tabIndex={0} contentEditable="true">
                                    ContentEditable
                                </div>
                            </Tag>
                            <button>Button2</button>
                        </div>
                    )
                )
                    .pressTab()
                    .activeElement((el) => {
                        expect(el?.textContent).toEqual("Button1");
                    })
                    .pressTab()
                    .activeElement((el) => {
                        expect(el?.textContent).toEqual("ContentEditable");
                    })
                    .pressTab()
                    .activeElement((el) => {
                        expect(el?.textContent).toEqual("ContentEditable");
                    })
                    .pressTab(true)
                    .activeElement((el) => {
                        expect(el?.textContent).toEqual("ContentEditable");
                    });
            }
        );
    });
});

describe("Groupper - empty", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should handle empty groupper as <%s>",
        async (tagName) => {
            const Tag = tagName;
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button>Button1</button>
                        <Tag
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            Hello
                        </Tag>
                        <button>Button2</button>
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
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        }
    );

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should handle empty groupper with focusable container as <%s>",
        async (tagName) => {
            const Tag = tagName;
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button>Button1</button>
                        <Tag
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            Hello
                        </Tag>
                        <button>Button2</button>
                    </div>
                )
            )
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Hello");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Hello");
                })
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        }
    );
});

describe("Groupper with tabster:groupper:movefocus", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    it.each<["div" | "li"]>([["div"], ["li"]])(
        "should properly move the focus when tabbing from outside of the groupper as <%s>",
        async (tagName) => {
            const Tag = tagName;
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button id="button1">Button1</button>
                        <Tag
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>Button2</button>
                            <button>Button3</button>
                        </Tag>
                        <button id="button4">Button4</button>
                    </div>
                )
            )
                .eval(() => {
                    interface WindowWithButton2 extends Window {
                        __enteredGroupper?: boolean;
                        __hadButton3?: boolean;
                    }

                    delete (window as WindowWithButton2).__hadButton3;

                    document.addEventListener("tabster:movefocus", (e) => {
                        if (e.detail?.relatedEvent?.key === "Enter") {
                            if (
                                (window as WindowWithButton2).__enteredGroupper
                            ) {
                                // Enter was pressed for the second time, let's alter the default behaviour.
                                e.preventDefault();
                                e.detail.relatedEvent.preventDefault();
                                getTabsterTestVariables()
                                    .dom?.getElementById(document, "button1")
                                    ?.focus();
                            }

                            (window as WindowWithButton2).__enteredGroupper =
                                true;
                        }

                        if (
                            getTabsterTestVariables().dom?.getActiveElement(
                                document
                            )?.textContent === "Button3"
                        ) {
                            // For the sake of test, we will move focus after Button3 is focused for the second time.
                            if ((window as WindowWithButton2).__hadButton3) {
                                e.preventDefault();
                                e.detail?.relatedEvent?.preventDefault();
                                getTabsterTestVariables()
                                    .dom?.getElementById(document, "button4")
                                    ?.focus();
                            }

                            (window as WindowWithButton2).__hadButton3 = true;
                        }
                    });
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2Button3");
                })
                .pressEnter()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
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
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2Button3");
                })
                .pressEnter()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        }
    );
});

describe("Groupper - activate on focus and click", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            groupper: true,
            mover: true,
            modalizer: true,
        });
    });

    const getTestHtml = (tagName: "div" | "li") => {
        const Tag = tagName;

        return (
            <div {...getTabsterAttribute({ root: {} })}>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <Tag
                        id="groupper1"
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                            modalizer: {
                                id: "modalizer1",
                                isAlwaysAccessible: true,
                                isOthersAccessible: true,
                            },
                        })}
                    >
                        <div id="groupper1-inner">
                            <button>Button1</button>
                            <button>Button2</button>
                        </div>
                    </Tag>
                    <Tag
                        id="groupper2"
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                            modalizer: {
                                id: "modalizer2",
                                isAlwaysAccessible: true,
                                isOthersAccessible: true,
                            },
                        })}
                    >
                        <div id="groupper2-inner">
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                    </Tag>
                </div>
            </div>
        );
    };

    it.each<["div" | "li"]>([["div"], ["li"]])("should", async (tagName) => {
        await new BroTest.BroTest(getTestHtml(tagName))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button1Button2")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button3Button4")
            )
            .click("#groupper1-inner")
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button1Button2")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button3Button4")
            )
            .focusElement("#groupper1")
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button1Button2")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button3Button4")
            );
    });

    it.each<["div" | "li"]>([["div"], ["li"]])("should", async (tagName) => {
        await new BroTest.BroTest(getTestHtml(tagName))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button1Button2")
            )
            .pressEnter()
            .activeElement((el) => expect(el?.textContent).toBe("Button1"))
            .click("#groupper1-inner")
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button1Button2")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toBe("Button3Button4")
            );
    });
});

describe("Groupper with virtual parents", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should skip virtual children of a groupper which are not in DOM order", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    {/* <div tabIndex={0} {...getTabsterAttribute({ groupper: {tabbability: 2} })}> */}
                    <button>Button1</button>
                    <div
                        id="virtualParent"
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: { tabbability: 2 },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    {/* <button>Button4</button> */}
                    {/* </div> */}
                    <div id="virtualChild">
                        <button>Button5</button>
                    </div>
                    <button>Button6</button>
                </div>
            )
        )

            .eval(() => {
                const vars = getTabsterTestVariables();

                function getParent(child: Node | null): Node | null {
                    if (!child) {
                        return null;
                    }

                    if ((child as Element).id === "virtualChild") {
                        return (
                            vars.dom?.getElementById(
                                document,
                                "virtualParent"
                            ) || null
                        );
                    }

                    return (
                        vars.dom?.getParentElement(child as HTMLElement) || null
                    );
                }

                const tabster = vars.createTabster?.(window, {
                    getParent,
                });

                tabster && vars.getGroupper?.(tabster);
            })

            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            });
    });
});
