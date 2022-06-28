/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import * as BroTest from "./utils/BroTest";

const groupperItem = (
    tabsterAttr: Types.TabsterDOMAttribute,
    count: number
) => {
    return (
        <div tabIndex={0} {...tabsterAttr} data-count={`${count}`}>
            <button>Foo</button>
            <button>Bar</button>
        </div>
    );
};

describe("Groupper - default", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    const getTestHtml = (ignoreEsc?: boolean) => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const groupperAttr = getTabsterAttribute({ groupper: { ignoreEsc } });

        return (
            <div {...rootAttr}>
                {groupperItem(groupperAttr, 1)}
                {groupperItem(groupperAttr, 2)}
                {groupperItem(groupperAttr, 3)}
                {groupperItem(groupperAttr, 4)}
            </div>
        );
    };

    it("should focus groupper", async () => {
        await new BroTest.BroTest(getTestHtml())
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes["data-count"]).toBe("1")
            );
    });

    it("should focus inside groupper with Tab key", async () => {
        await new BroTest.BroTest(getTestHtml())
            .pressTab()
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBe("Foo"));
    });

    it("should escape focus inside groupper with Escape key", async () => {
        interface WindowWithEscFlag extends Window {
            __escPressed1?: number;
        }

        await new BroTest.BroTest(getTestHtml())
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
            .activeElement((el) => expect(el?.textContent).toEqual("Foo"))
            .pressEsc()
            .activeElement((el) =>
                expect(el?.attributes["data-count"]).toBe("1")
            )
            .eval(() => (window as WindowWithEscFlag).__escPressed1)
            .check((escPressed: number) => {
                expect(escPressed).toBe(0);
            });
    });

    it("should not escape focus inside groupper with Escape key when ignoreEsc is passed", async () => {
        interface WindowWithEscFlag extends Window {
            __escPressed2?: number;
        }

        await new BroTest.BroTest(getTestHtml(true))
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
            .activeElement((el) => expect(el?.textContent).toEqual("Foo"))
            .pressEsc()
            .activeElement((el) => expect(el?.textContent).toEqual("Foo"))
            .eval(() => (window as WindowWithEscFlag).__escPressed2)
            .check((escPressed: number) => {
                expect(escPressed).toBe(1);
            });
    });
});

describe("Groupper - limited focus trap", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    const getTestHtml = () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const groupperAttr = getTabsterAttribute({
            groupper: {
                tabbability: Types.GroupperTabbabilities.LimitedTrapFocus,
            },
        });

        return (
            <div {...rootAttr}>
                {groupperItem(groupperAttr, 1)}
                {groupperItem(groupperAttr, 2)}
                {groupperItem(groupperAttr, 3)}
                {groupperItem(groupperAttr, 4)}
            </div>
        );
    };

    it("should focus inside groupper with Enter key", async () => {
        await new BroTest.BroTest(getTestHtml())
            .pressTab()
            .pressEnter()
            .activeElement((el) => expect(el?.textContent).toBe("Foo"));
    });

    it("should escape focus inside groupper with Escape key", async () => {
        await new BroTest.BroTest(getTestHtml())
            .pressTab()
            .pressEnter()
            .pressEsc()
            .activeElement((el) =>
                expect(el?.attributes["data-count"]).toBe("1")
            );
    });

    it("should trap focus within groupper", async () => {
        await new BroTest.BroTest(getTestHtml())
            .pressTab()
            .pressEnter()
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBe("Bar"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBe("Foo"));
    });
});

describe("Groupper tabbing forward and backwards", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    it("should properly move the focus when tabbing from outside of the groupper", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    Types.GroupperTabbabilities.Limited,
                            },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
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

    it("should properly move the focus when tabbing from outside of the page", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    Types.GroupperTabbabilities.Limited,
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
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });
});
