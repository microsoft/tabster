/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import * as BroTest from "./utils/BroTest";
import { runIfUnControlled } from "./utils/test-utils";

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
                    ? { tabbability: Types.GroupperTabbabilities.Limited }
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
                    const keyEsc = 27;

                    (window as WindowWithEscFlag).__escPressed1 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.keyCode === keyEsc) {
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
                    expect(escPressed).toBe(0);
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
                    const keyEsc = 27;

                    (window as WindowWithEscFlag).__escPressed2 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.keyCode === keyEsc) {
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
                    const keyEnter = 13;

                    (window as WindowWithEnterFlag).__enterPressed1 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.keyCode === keyEnter) {
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
                    const keyEnter = 13;

                    (window as WindowWithEnterFlag).__enterPressed2 = 0;

                    window.addEventListener("keydown", (e) => {
                        if (e.keyCode === keyEnter) {
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
                tabbability: Types.GroupperTabbabilities.LimitedTrapFocus,
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
                                    tabbability:
                                        Types.GroupperTabbabilities.Limited,
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
                                    tabbability:
                                        Types.GroupperTabbabilities.Limited,
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
runIfUnControlled("Groupper", () => {
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
                                            Types.GroupperTabbabilities
                                                .LimitedTrapFocus,
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
