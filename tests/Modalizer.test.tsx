/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    GroupperTabbabilities,
    ModalizerActiveEventName,
    ModalizerInactiveEventName,
    MoverDirections,
    TABSTER_ATTRIBUTE_NAME,
    Types,
} from "tabster";
import { WindowWithTabsterInstance } from "../src/Root";
import * as BroTest from "./utils/BroTest";

describe("Modalizer", () => {
    const getTestHtml = (
        options: Partial<Types.ModalizerProps> = {},
        options2?: Partial<Types.ModalizerProps>
    ) => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const modalizerAttr = getTabsterAttribute({
            modalizer: { id: "modal", ...options },
        });
        const modalizerAttr2 = options2
            ? getTabsterAttribute({
                  modalizer: { id: "modal2", ...options2 },
              })
            : undefined;

        return (
            <div {...rootAttr}>
                <div id="hidden">
                    <div>Hidden</div>
                    <button id="outside">Outside</button>
                </div>
                <div aria-label="modal" id="modal" {...modalizerAttr}>
                    <button id="foo">Foo</button>
                    <button id="bar">Bar</button>
                    <button id="baz">Baz</button>
                </div>
                {modalizerAttr2 ? (
                    <div aria-label="modal2" id="modal2" {...modalizerAttr2}>
                        <button id="foo2">Foo2</button>
                        <button id="bar2">Bar2</button>
                        <button id="baz2">Baz2</button>
                    </div>
                ) : undefined}
            </div>
        );
    };

    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    // makes sure that modalizer is cleaned up after each test run
    afterEach(async () => {
        await new BroTest.BroTest(<div></div>);
    });

    it("should activate and set aria-hidden when focused", async () => {
        await new BroTest.BroTest(getTestHtml())
            .focusElement("#foo")
            .wait(300)
            .eval(() =>
                getTabsterTestVariables()
                    .dom?.getElementById(document, "hidden")
                    ?.getAttribute("aria-hidden")
            )
            .check((ariaHidden: string | undefined) =>
                expect(ariaHidden).toBe("true")
            )
            .eval(() =>
                getTabsterTestVariables()
                    .dom?.getElementById(document, "outside")
                    ?.hasAttribute("aria-hidden")
            )
            .check((hasAriaHidden: boolean | undefined) =>
                expect(hasAriaHidden).toBe(false)
            );
    });

    it("should set aria-hidden on inactive elements", async () => {
        const getAriaHiddens = () => {
            const ret: string[] = [];
            const pushAriaHidden = (id: string): void => {
                ret.push(
                    `${id}: ${getTabsterTestVariables()
                        .dom?.getElementById(document, id)
                        ?.getAttribute("aria-hidden")}`
                );
            };
            pushAriaHidden("button-1");
            pushAriaHidden("modal-1");
            pushAriaHidden("button-2");
            pushAriaHidden("modal-2");
            pushAriaHidden("button-3");
            pushAriaHidden("modal-3");
            pushAriaHidden("button-4");
            return ret;
        };

        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        id="modal-1"
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal",
                                isAlwaysAccessible: true,
                            },
                        })}
                    >
                        <button id="modal-button-1">ModalButton1</button>
                    </div>
                    <button id="button-2">Button2</button>
                    <div
                        id="modal-2"
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal2",
                                isOthersAccessible: true,
                            },
                        })}
                    >
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                    <button id="button-3">Button3</button>
                    <div>
                        <div
                            id="modal-3"
                            {...getTabsterAttribute({
                                modalizer: { id: "modal3" },
                            })}
                        >
                            <button id="modal-button-3">ModalButton3</button>
                        </div>
                    </div>
                    <button id="button-4">Button4</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .wait(300)
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                expect(hiddens).toEqual([
                    "button-1: null",
                    "modal-1: null",
                    "button-2: null",
                    "modal-2: true",
                    "button-3: null",
                    "modal-3: true",
                    "button-4: null",
                ]);
            })
            .focusElement("#modal-button-1")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .wait(300)
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                expect(hiddens).toEqual([
                    "button-1: true",
                    "modal-1: null",
                    "button-2: true",
                    "modal-2: true",
                    "button-3: true",
                    "modal-3: true",
                    "button-4: true",
                ]);
            })
            .focusElement("#modal-button-2")
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                // Focused element should be cleared from aria-hidden right away.
                expect(hiddens).toEqual([
                    "button-1: true",
                    "modal-1: null",
                    "button-2: true",
                    "modal-2: null",
                    "button-3: true",
                    "modal-3: true",
                    "button-4: true",
                ]);
            })
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .wait(300)
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                // The rest aria-hiddens are removed asynchronously.
                expect(hiddens).toEqual([
                    "button-1: null",
                    "modal-1: null",
                    "button-2: null",
                    "modal-2: null",
                    "button-3: null",
                    "modal-3: true",
                    "button-4: null",
                ]);
            })
            .focusElement("#modal-button-3")
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                expect(hiddens).toEqual([
                    "button-1: null",
                    "modal-1: null",
                    "button-2: null",
                    "modal-2: null",
                    "button-3: null",
                    "modal-3: null",
                    "button-4: null",
                ]);
            })
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .wait(300)
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                expect(hiddens).toEqual([
                    "button-1: true",
                    "modal-1: null",
                    "button-2: true",
                    "modal-2: true",
                    "button-3: true",
                    "modal-3: null",
                    "button-4: true",
                ]);
            })
            .focusElement("#button-4")
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                expect(hiddens).toEqual([
                    "button-1: true",
                    "modal-1: null",
                    "button-2: true",
                    "modal-2: true",
                    "button-3: true",
                    "modal-3: null",
                    "button-4: null",
                ]);
            })
            .activeElement((el) => expect(el?.textContent).toEqual("Button4"))
            .wait(300)
            .eval(getAriaHiddens)
            .check((hiddens: string[]) => {
                expect(hiddens).toEqual([
                    "button-1: null",
                    "modal-1: null",
                    "button-2: null",
                    "modal-2: true",
                    "button-3: null",
                    "modal-3: true",
                    "button-4: null",
                ]);
            });
    });

    it("should deactivate and restore aria-hidden when removed from DOM", async () => {
        await new BroTest.BroTest(getTestHtml())
            .focusElement("#foo")
            .eval(() =>
                getTabsterTestVariables()
                    .dom?.getElementById(document, "modal")
                    ?.remove()
            )
            .wait(300)
            .eval(() =>
                getTabsterTestVariables()
                    .dom?.getElementById(document, "hidden")
                    ?.hasAttribute("aria-hidden")
            )
            .check((hasAriaHidden: boolean | undefined) =>
                expect(hasAriaHidden).toBe(false)
            );
    });

    it("should deactivate and restore aria-hidden when programmatically focused somewhere else", async () => {
        await new BroTest.BroTest(getTestHtml())
            .focusElement("#foo")
            .focusElement("#outside")
            .eval(() =>
                getTabsterTestVariables()
                    .dom?.getElementById(document, "hidden")
                    ?.hasAttribute("aria-hidden")
            )
            .check((hasAriaHidden: boolean | undefined) =>
                expect(hasAriaHidden).toBe(false)
            );
    });

    it("should trap focus", async () => {
        await new BroTest.BroTest(getTestHtml())
            .focusElement("#foo")
            .activeElement((el) => expect(el?.textContent).toBe("Foo"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBe("Bar"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBe("Baz"))
            .pressTab()
            .activeElement((el) => expect(el).toBeNull())
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBe("Baz"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBe("Bar"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBe("Foo"))
            .pressTab(true)
            .activeElement((el) => expect(el).toBeNull())
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBe("Foo"));
    });

    describe("should restore focus", () => {
        it("after clicking on outside focusable", async () => {
            await new BroTest.BroTest(getTestHtml())
                .focusElement("#foo")
                .activeElement((el) => expect(el?.textContent).toBe("Foo"))
                .click("#outside")
                .wait(100)
                .activeElement((el) => expect(el?.textContent).toBe("Foo"));
        });

        it("asynchronously after user mutates DOM", async () => {
            await new BroTest.BroTest(getTestHtml())
                .focusElement("#foo")
                .activeElement((el) => expect(el?.textContent).toBe("Foo"))
                .eval(() => {
                    // Simulates user clicking outside a modal dialog to close it
                    document.addEventListener("click", () => {
                        getTabsterTestVariables()
                            .dom?.getElementById(document, "modal")
                            ?.remove();
                    });
                })
                .click("#outside")
                .activeElement((el) => expect(el?.textContent).toBe("Outside"));
        });

        it("should not restore focus when inactive modalizer is clicked and focus is already returned to the active one which is undefined", async () => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button>Button1</button>
                        <button id="button-2">Button2</button>
                        <div
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                },
                            })}
                        >
                            <button id="modal-button-1">ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                        <button id="button-3">Button3</button>
                    </div>
                )
            )
                .pressTab()
                .eval(() => {
                    getTabsterTestVariables()
                        .dom?.getElementById(document, "modal-button-1")
                        ?.addEventListener("click", () => {
                            getTabsterTestVariables()
                                .dom?.getElementById(document, "button-2")
                                ?.focus();
                        });
                })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1")
                )
                .click("#modal-button-1")
                .wait(300)
                .activeElement((el) => expect(el?.textContent).toBe("Button2"));
        });

        it("should not restore focus when inactive modalizer is clicked and focus is already returned to the active one which is another modalizer", async () => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button>Button1</button>
                        <button id="button-2">Button2</button>
                        <div
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal-1",
                                },
                            })}
                        >
                            <button id="modal-button-1">ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                        <div
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal-2",
                                },
                            })}
                        >
                            <button id="modal-button-3">ModalButton3</button>
                            <button id="modal-button-4">ModalButton4</button>
                            <button id="modal-button-5">ModalButton5</button>
                        </div>
                        <button id="button-3">Button3</button>
                    </div>
                )
            )
                .eval(() => {
                    getTabsterTestVariables()
                        .dom?.getElementById(document, "modal-button-1")
                        ?.addEventListener("click", () => {
                            getTabsterTestVariables()
                                .dom?.getElementById(document, "modal-button-4")
                                ?.focus();
                        });
                })
                .focusElement("#modal-button-5")
                .wait(300)
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("ModalButton5")
                )
                .click("#modal-button-1")
                .wait(300)
                .activeElement((el) =>
                    expect(el?.textContent).toBe("ModalButton4")
                );
        });

        it("should not restore focus when inactive modalizer is clicked and there is no focused element", async () => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button>Button1</button>
                        <div
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                },
                            })}
                        >
                            <button id="modal-button-1">ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                        <button>Button2</button>
                    </div>
                )
            )
                .pressTab()
                .eval(() => {
                    getTabsterTestVariables()
                        .dom?.getElementById(document, "modal-button-1")
                        ?.addEventListener("click", () => {
                            (
                                document.activeElement as HTMLElement | null
                            )?.blur();
                        });
                })
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Button1")
                )
                .click("#modal-button-1")
                .wait(300)
                .activeElement((el) => expect(el?.textContent).toBeUndefined());
        });
    });

    describe("Others content accessible", () => {
        it("should not allow focus outside of modalizer", async () => {
            await new BroTest.BroTest(
                getTestHtml({ isOthersAccessible: false })
            )
                .focusElement("#foo")
                .wait(300)
                .eval(() =>
                    getTabsterTestVariables()
                        .dom?.getElementById(document, "hidden")
                        ?.hasAttribute("aria-hidden")
                )
                .check((hasAriaHidden: boolean | undefined) =>
                    expect(hasAriaHidden).toBe(true)
                )
                .pressTab(true)
                .activeElement((el) => expect(el).toBeNull())
                .pressTab(true)
                .activeElement((el) => expect(el?.attributes.id).toBe("baz"))
                .click("#outside")
                .wait(200)
                .activeElement((el) => expect(el?.attributes.id).toBe("foo"));
        });

        it("should allow focus outside of modalizer", async () => {
            await new BroTest.BroTest(getTestHtml({ isOthersAccessible: true }))
                .focusElement("#foo")
                .eval(() =>
                    getTabsterTestVariables()
                        .dom?.getElementById(document, "hidden")
                        ?.hasAttribute("aria-hidden")
                )
                .check((hasAriaHidden: boolean | undefined) =>
                    expect(hasAriaHidden).toBe(false)
                )
                .pressTab(true)
                .activeElement((el) => expect(el).toBeNull())
                .pressTab(true)
                .activeElement((el) => expect(el?.attributes.id).toBe("baz"))
                .click("#outside")
                .wait(200)
                .activeElement((el) =>
                    expect(el?.attributes.id).toBe("outside")
                );
        });

        it("should not allow focus into modalizer with isOthersAccessible", async () => {
            await new BroTest.BroTest(getTestHtml({ isOthersAccessible: true }))
                .focusElement("#outside")
                .pressTab()
                .activeElement((el) => expect(el).toBeNull());
        });

        it("should allow focus into modalizer with isAlwaysAccessible when no other modalizer is active", async () => {
            await new BroTest.BroTest(
                getTestHtml(
                    { isAlwaysAccessible: true },
                    { isAlwaysAccessible: true }
                )
            )
                .focusElement("#outside")
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("foo"))
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("bar"))
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("baz"))
                .pressTab()
                .activeElement((el) => expect(el).toBeNull())
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("foo"));
        });

        it("should implement circular focus trap", async () => {
            await new BroTest.BroTest(getTestHtml({ isTrapped: true }))
                .focusElement("#foo")
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("bar"))
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("baz"))
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("foo"));
        });

        it("if trapped, should not escape modalizer if it has no focusables", async () => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <div
                            id="modal"
                            aria-label="modal"
                            {...getTabsterAttribute({
                                modalizer: { id: "modal", isTrapped: true },
                            })}
                            tabIndex={0}
                        >
                            Hello
                        </div>
                    </div>
                )
            )
                .focusElement("#modal")
                .activeElement((el) => expect(el?.textContent).toEqual("Hello"))
                .pressTab()
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("Hello")
                );
        });
    });
});

describe("New Modalizer that already has focus", () => {
    const getTestHtml = () => {
        const rootAttr = getTabsterAttribute({ root: {} });

        return (
            <div {...rootAttr}>
                <div id="hidden">
                    <div>Hidden</div>
                    <button id="outside">Outside</button>
                </div>
                <div aria-label="modal" id="modal">
                    <button id="foo">Foo</button>
                    <button>Bar</button>
                </div>
            </div>
        );
    };

    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    // makes sure that modalizer is cleaned up after each test run
    afterEach(async () => {
        await new BroTest.BroTest(<div></div>);
    });

    it("should be activated", async () => {
        const tabsterAttr = getTabsterAttribute(
            {
                modalizer: { id: "modal " },
            },
            true
        ) as string;

        await new BroTest.BroTest(getTestHtml())
            .focusElement("#foo")
            .eval(
                (attrName, tabsterAttr) => {
                    const newModalizer =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            "modal"
                        );
                    newModalizer?.setAttribute(attrName, tabsterAttr);
                },
                TABSTER_ATTRIBUTE_NAME,
                tabsterAttr
            )
            .wait(300)
            .eval(() =>
                getTabsterTestVariables()
                    .dom?.getElementById(document, "hidden")
                    ?.getAttribute("aria-hidden")
            )
            .check((ariaHidden: string | undefined) =>
                expect(ariaHidden).toBe("true")
            );
    });
});

describe("Modalizer with multiple containers", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            modalizer: true,
            mover: true,
            groupper: true,
        });
    });

    it("should modalize multi-layer modal", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "multi-modal",
                                isAlwaysAccessible: true,
                            },
                        })}
                    >
                        <button>ModalButton1</button>
                        <button>ModalButton2</button>
                    </div>
                    <button>Button2</button>
                    <div
                        {...getTabsterAttribute({
                            modalizer: { id: "multi-modal" },
                        })}
                    >
                        <button>ModalButton3</button>
                        <button>ModalButton4</button>
                    </div>
                    <button>Button3</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            );
    });

    it("should escape the modalizer combined with groupper", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Vertical,
                            },
                        })}
                    >
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                    isAlwaysAccessible: true,
                                    isOthersAccessible: true,
                                    isTrapped: true,
                                },
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                        <button>Button1</button>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                    isAlwaysAccessible: true,
                                    isOthersAccessible: true,
                                    isTrapped: true,
                                },
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>ModalButton3</button>
                            <button>ModalButton4</button>
                        </div>
                        <button>Button2</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3ModalButton4")
            )
            .pressDown()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3ModalButton4")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3ModalButton4")
            )
            .pressUp()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab();
    });

    it("should escape the modalizer when one of its parts is in groupper and another is not and the groupper part was focused recently", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Vertical,
                            },
                        })}
                    >
                        <div
                            id="groupper"
                            tabIndex={0}
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                    isAlwaysAccessible: true,
                                    isOthersAccessible: true,
                                    isTrapped: true,
                                },
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                    </div>

                    <div
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal",
                                isTrapped: true,
                            },
                        })}
                    >
                        <button id="modal-button-3">ModalButton3</button>
                        <button>ModalButton4</button>
                    </div>

                    <button>Button1</button>
                </div>
            )
        )
            .focusElement("#modal-button-3")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .focusElement("#groupper")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .focusElement("#modal-button-3")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            );
    });

    it("should escape the modalizer to the most recently focused groupper", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Vertical,
                            },
                        })}
                    >
                        <div
                            id="groupper"
                            tabIndex={0}
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                    isAlwaysAccessible: true,
                                    isOthersAccessible: true,
                                    isTrapped: true,
                                },
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                        <div
                            id="groupper-2"
                            tabIndex={0}
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                    isAlwaysAccessible: true,
                                    isOthersAccessible: true,
                                    isTrapped: true,
                                },
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>ModalButton3</button>
                            <button>ModalButton4</button>
                        </div>
                    </div>

                    <div
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal",
                                isTrapped: true,
                            },
                        })}
                    >
                        <button id="modal-button-5">ModalButton5</button>
                    </div>
                </div>
            )
        )
            .focusElement("#groupper")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3ModalButton4")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton5")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3ModalButton4")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .focusElement("#modal-button-5")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton5")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            );
    });

    it("should escape the modalizer to the most recently focused groupper even if it has no focusables", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Vertical,
                            },
                        })}
                    >
                        <div
                            id="groupper"
                            tabIndex={0}
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                    isAlwaysAccessible: true,
                                    isOthersAccessible: true,
                                    isTrapped: true,
                                },
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                                focusable: {
                                    ignoreKeydown: { Enter: true },
                                },
                            })}
                        >
                            Hello
                        </div>
                    </div>

                    <div
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal",
                                isTrapped: true,
                            },
                        })}
                    >
                        <button id="modal-button-1">ModalButton1</button>
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                document.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        getTabsterTestVariables()
                            .dom?.getElementById(document, "modal-button-1")
                            ?.focus();
                    }
                });
            })
            .focusElement("#groupper")
            .activeElement((el) => expect(el?.textContent).toEqual("Hello"))
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressEsc()
            .activeElement((el) => expect(el?.textContent).toEqual("Hello"))
            .pressEnter()
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressEsc()
            .activeElement((el) => expect(el?.textContent).toEqual("Hello"));
    });

    it("should work in a very monstrous complex case with Movers and Grouppers", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {},
                        })}
                    >
                        <div
                            id="groupper1"
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <div
                                {...getTabsterAttribute({
                                    mover: {},
                                })}
                            >
                                <div
                                    id="groupper1-1"
                                    tabIndex={0}
                                    {...getTabsterAttribute({
                                        groupper: {
                                            tabbability:
                                                GroupperTabbabilities.Unlimited,
                                        },
                                        modalizer: {
                                            id: "modal",
                                            isOthersAccessible: true,
                                        },
                                    })}
                                >
                                    <button>ModalButton1.1</button>
                                    <div
                                        {...getTabsterAttribute({
                                            mover: {},
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
                                            <button>ModalButton1.2</button>
                                            <button>ModalButton1.3</button>
                                        </div>
                                        <div
                                            tabIndex={0}
                                            {...getTabsterAttribute({
                                                groupper: {
                                                    tabbability:
                                                        GroupperTabbabilities.LimitedTrapFocus,
                                                },
                                            })}
                                        >
                                            <button>ModalButton1.4</button>
                                            <button>ModalButton1.5</button>
                                        </div>
                                    </div>
                                    <button>ModalButton1.6</button>
                                </div>
                                <div
                                    tabIndex={0}
                                    id="groupper1-2"
                                    {...getTabsterAttribute({
                                        groupper: {
                                            tabbability:
                                                GroupperTabbabilities.LimitedTrapFocus,
                                        },
                                        modalizer: {
                                            id: "modal2",
                                            isTrapped: true,
                                        },
                                    })}
                                >
                                    <button>ModalButton2.1</button>
                                    <button>ModalButton2.2</button>
                                </div>
                            </div>
                        </div>
                        <div
                            id="groupper2"
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <div
                                {...getTabsterAttribute({
                                    mover: {},
                                })}
                            >
                                <div
                                    id="groupper2-1"
                                    tabIndex={0}
                                    {...getTabsterAttribute({
                                        groupper: {
                                            tabbability:
                                                GroupperTabbabilities.LimitedTrapFocus,
                                        },
                                        modalizer: {
                                            id: "modal3",
                                            isAlwaysAccessible: true,
                                            isOthersAccessible: true,
                                        },
                                    })}
                                >
                                    <button id="modal-button-3-1">
                                        ModalButton3.1
                                    </button>
                                    <button>ModalButton3.2</button>
                                </div>
                                <div
                                    id="groupper2-2"
                                    tabIndex={0}
                                    {...getTabsterAttribute({
                                        groupper: {
                                            tabbability:
                                                GroupperTabbabilities.LimitedTrapFocus,
                                        },
                                    })}
                                >
                                    <div
                                        {...getTabsterAttribute({
                                            mover: {},
                                        })}
                                    >
                                        <div
                                            id="groupper2-2-1"
                                            tabIndex={0}
                                            {...getTabsterAttribute({
                                                groupper: {
                                                    tabbability:
                                                        GroupperTabbabilities.LimitedTrapFocus,
                                                },
                                            })}
                                        >
                                            <button>NonModalButton1</button>
                                            <button>NonModalButton2</button>
                                        </div>
                                        <div
                                            id="groupper2-2-2"
                                            tabIndex={0}
                                            {...getTabsterAttribute({
                                                groupper: {
                                                    tabbability:
                                                        GroupperTabbabilities.LimitedTrapFocus,
                                                },
                                                modalizer: {
                                                    id: "modal3",
                                                    isAlwaysAccessible: true,
                                                },
                                            })}
                                        >
                                            <button>ModalButton3.3</button>
                                            <button>ModalButton3.4</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        {...getTabsterAttribute({
                            modalizer: { id: "modal2", isTrapped: true },
                        })}
                    >
                        <button>ModalButton2.3</button>
                        <button>ModalButton2.4</button>
                    </div>
                    <div
                        {...getTabsterAttribute({
                            modalizer: { id: "modal3" },
                        })}
                    >
                        <button>ModalButton3.5</button>
                        <button>ModalButton3.6</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "ModalButton1.1ModalButton1.2ModalButton1.3ModalButton1.4ModalButton1.5ModalButton1.6ModalButton2.1ModalButton2.2"
                )
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "ModalButton3.1ModalButton3.2NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2"
                )
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2"
                )
            )
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2"
                )
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.3ModalButton3.4")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.3ModalButton3.4")
            )

            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "NonModalButton1NonModalButton2ModalButton3.3ModalButton3.4"
                )
            )
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1ModalButton3.2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.4")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.5")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.6")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.6")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.5")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.4")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.3")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.2")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .click("#groupper1-2")
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.1ModalButton2.2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.1ModalButton2.2")
            )
            .pressUp()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.1ModalButton2.2")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.1ModalButton2.2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.4")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.1")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.4")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.3")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.2")
            )
            .click("#groupper1-1")
            .wait(200)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2.1")
            )
            .focusElement("#groupper1-1")
            .wait(200)
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "ModalButton1.1ModalButton1.2ModalButton1.3ModalButton1.4ModalButton1.5ModalButton1.6"
                )
            )
            .pressTab()
            .wait(200)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.1")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.6")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.2ModalButton1.3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.6")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.1")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.2ModalButton1.3")
            )
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.4ModalButton1.5")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.4")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.5")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.4")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.4ModalButton1.5")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1.6")
            )
            .click("#modal-button-3-1")
            .wait(200)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3.2")
            );
    });

    it("should skip the elements between the active modalizer parts", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Vertical,
                            },
                        })}
                    >
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                                modalizer: {
                                    id: "modal",
                                    isOthersAccessible: true,
                                    isAlwaysAccessible: true,
                                    isTrapped: true,
                                },
                            })}
                        >
                            <button>Button2</button>
                            <div
                                {...getTabsterAttribute({
                                    mover: {
                                        cyclic: true,
                                        direction: MoverDirections.Vertical,
                                    },
                                })}
                            >
                                <button>Button3</button>
                            </div>
                        </div>
                    </div>
                    <button>Button4</button>
                    <div
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal",
                                isOthersAccessible: true,
                                isAlwaysAccessible: true,
                                isTrapped: true,
                            },
                        })}
                    >
                        <div
                            {...getTabsterAttribute({
                                mover: {
                                    cyclic: true,
                                    direction: MoverDirections.Vertical,
                                },
                            })}
                        >
                            <button>Button5</button>
                        </div>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("Button2Button3")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button4"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"));
    });

    it("should skip iframes between the active modalizer parts and should properly focus them when the modalizer is not active", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Vertical,
                            },
                        })}
                    >
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                                modalizer: {
                                    id: "modal",
                                    isOthersAccessible: true,
                                    isAlwaysAccessible: true,
                                    isTrapped: true,
                                },
                            })}
                        >
                            <button>Button2</button>
                            <div
                                {...getTabsterAttribute({
                                    mover: {
                                        cyclic: true,
                                        direction: MoverDirections.Vertical,
                                    },
                                })}
                            >
                                <button>Button3</button>
                            </div>
                        </div>
                    </div>
                    <iframe id="frame1" src={BroTest.getTestPageURL()}></iframe>
                    <div
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal",
                                isOthersAccessible: true,
                                isAlwaysAccessible: true,
                                isTrapped: true,
                            },
                        })}
                    >
                        <div
                            {...getTabsterAttribute({
                                mover: {
                                    cyclic: true,
                                    direction: MoverDirections.Vertical,
                                },
                            })}
                        >
                            <button>Button5</button>
                        </div>
                    </div>
                </div>
            )
        )
            .frame("frame1")
            .html(
                <div>
                    <button>Button4</button>
                </div>
            )
            .unframe()
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("Button2Button3")
            )
            .pressTab()
            .activeElement((el) => expect(el?.attributes.id).toEqual("frame1"))
            .frame("frame1")
            .activeElement((el) => expect(el?.textContent).toEqual("Button4"))
            .unframe()
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"));
    });

    it("should not lose focus when escape is pressed on the modalizer combined with groupper and a part of modalizer goes away", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Vertical,
                            },
                        })}
                    >
                        <button>Button1</button>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                modalizer: {
                                    id: "modal",
                                    isAlwaysAccessible: true,
                                    isOthersAccessible: true,
                                    isTrapped: true,
                                },
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                        <button>Button2</button>
                    </div>
                    <div
                        tabIndex={0}
                        id="remove-me-on-esc"
                        {...getTabsterAttribute({
                            modalizer: {
                                id: "modal",
                                isAlwaysAccessible: false,
                                isOthersAccessible: false,
                                isTrapped: true,
                            },
                        })}
                    >
                        <button>ModalButton3</button>
                        <button>ModalButton4</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                document
                    .getElementById("remove-me-on-esc")
                    ?.addEventListener("keydown", (e) => {
                        if (e.key === "Escape") {
                            document
                                .getElementById("remove-me-on-esc")
                                ?.remove();
                        }
                    });
            })
            .pressTab()
            .pressDown()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            );
    });
});

describe("Modalizer events", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    it("should trigger active/inactive events", async () => {
        interface WindowWithModalizerEventsHistory extends Window {
            __tabsterModalizerEvents?: string[];
        }

        const getEvents = () => {
            const ret = (window as WindowWithModalizerEventsHistory)
                .__tabsterModalizerEvents;
            (
                window as WindowWithModalizerEventsHistory
            ).__tabsterModalizerEvents = [];
            return ret;
        };

        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        aria-label="modal"
                        id="modal-part-1"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal" },
                        })}
                    >
                        <button id="modal-button">ModalButton1</button>
                    </div>
                    <button>Button2</button>
                    <div
                        aria-label="modal"
                        id="modal-part-2"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal" },
                        })}
                    >
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                    <button id="button-3">Button3</button>
                </div>
            )
        )
            .eval(() => {
                (
                    window as WindowWithModalizerEventsHistory
                ).__tabsterModalizerEvents = [];

                const addEvent = (
                    eventName:
                        | typeof ModalizerActiveEventName
                        | typeof ModalizerInactiveEventName,
                    elementId: string
                ) => {
                    getTabsterTestVariables()
                        .dom?.getElementById(document, elementId)
                        ?.addEventListener(eventName, (e) => {
                            (
                                window as WindowWithModalizerEventsHistory
                            ).__tabsterModalizerEvents?.push(
                                `${e.type} ${e.detail?.id} ${e.detail?.element.id}`
                            );
                        });
                };

                addEvent("tabster:modalizer:active", "modal-part-1");
                addEvent("tabster:modalizer:active", "modal-part-2");
                addEvent("tabster:modalizer:inactive", "modal-part-1");
                addEvent("tabster:modalizer:inactive", "modal-part-2");
            })
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .focusElement("#modal-button")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:modalizer:active modal modal-part-1",
                    "tabster:modalizer:active modal modal-part-2",
                ]);
            })
            .focusElement("#button-3")
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:modalizer:inactive modal modal-part-1",
                    "tabster:modalizer:inactive modal modal-part-2",
                ]);
            })
            .focusElement("#modal-button-2")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:modalizer:active modal modal-part-1",
                    "tabster:modalizer:active modal modal-part-2",
                ]);
            });
    });
});

describe("Modalizer with uncontrolled areas", () => {
    const getTestHtml = () => (
        <div {...getTabsterAttribute({ root: {} })}>
            <button>Button1</button>
            <div {...getTabsterAttribute({ uncontrolled: {} })}>
                <button>Button2</button>
                <button>Button3</button>
            </div>
            <div
                aria-label="modal"
                {...getTabsterAttribute({
                    modalizer: { id: "modal", isTrapped: true },
                })}
            >
                <button id="foo">Foo</button>
                <button>Bar</button>
            </div>
            <button>Button4</button>
            <div
                aria-label="modal"
                tabIndex={0}
                {...getTabsterAttribute({
                    modalizer: { id: "modal", isTrapped: true },
                    groupper: {
                        tabbability: GroupperTabbabilities.LimitedTrapFocus,
                    },
                })}
            >
                <button>ModalButton1</button>
                <div {...getTabsterAttribute({ uncontrolled: {} })}>
                    <button>ModalButton2</button>
                    <button>ModalButton3</button>
                </div>
                <button>ModalButton4</button>
            </div>
            <button>Button5</button>
            <div
                aria-label="modal"
                {...getTabsterAttribute({
                    modalizer: { id: "modal", isTrapped: true },
                    uncontrolled: {},
                })}
            >
                <button>ModalButton5</button>
                <button>ModalButton6</button>
            </div>
            <button>Button6</button>
        </div>
    );

    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true, groupper: true });
    });

    // makes sure that modalizer is cleaned up after each test run
    afterEach(async () => {
        await new BroTest.BroTest(<div></div>);
    });

    it("should properly consider uncontrolled areas", async () => {
        await new BroTest.BroTest(getTestHtml())
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button4"))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "ModalButton1ModalButton2ModalButton3ModalButton4"
                )
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button6"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button6"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "ModalButton1ModalButton2ModalButton3ModalButton4"
                )
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button4"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .pressTab()
            .pressTab()
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual(
                    "ModalButton1ModalButton2ModalButton3ModalButton4"
                )
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton4")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton5")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton6")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Foo"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Bar"))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Bar"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Foo"))
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton6")
            );
    });
});

describe("Modalizer dispose", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true, groupper: true });
    });

    // makes sure that modalizer is cleaned up after each test run
    afterEach(async () => {
        await new BroTest.BroTest(<div></div>);
    });

    it("should dispose stored Modalizer instances on Tabster dispose", async () => {
        interface WindowWithOldTabster extends Window {
            __oldTabster?: WindowWithTabsterInstance["__tabsterInstance"];
        }

        interface ModalizerWithSomeInternals extends Types.ModalizerAPI {
            _modalizers: Record<string, Types.Modalizer>;
        }

        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        aria-label="modal1"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal1" },
                        })}
                    >
                        <button id="foo">Foo</button>
                    </div>
                    <button>Button2</button>
                    <div
                        aria-label="modal2"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal2" },
                        })}
                    >
                        <button>Baz</button>
                    </div>
                    <button>Button3</button>
                    <div
                        aria-label="modal1"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal1" },
                        })}
                    >
                        <button>Bar</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .focusElement("#foo")
            .activeElement((el) => expect(el?.textContent).toEqual("Foo"))
            .eval(() => {
                (window as WindowWithOldTabster).__oldTabster = (
                    window as WindowWithTabsterInstance
                ).__tabsterInstance;

                const modalizerInstanceCount = Object.keys(
                    (
                        (window as WindowWithTabsterInstance).__tabsterInstance
                            ?.modalizer as ModalizerWithSomeInternals
                    )._modalizers
                ).length;

                const vars = getTabsterTestVariables();
                const tabster = vars.core;
                if (vars && tabster) {
                    vars.disposeTabster?.(tabster, true);
                }

                return modalizerInstanceCount;
            })
            .check((modalizerInstanceCount) => {
                expect(modalizerInstanceCount).toEqual(3);
            })
            // Give the dispose time to call everything.
            .wait(1000)
            .eval(() => {
                const modalizerAPI = (window as WindowWithOldTabster)
                    .__oldTabster?.modalizer as ModalizerWithSomeInternals;

                return Object.keys(modalizerAPI._modalizers).length;
            })
            .check((modalizerInstanceCount) => {
                expect(modalizerInstanceCount).toEqual(0);
            });
    });
});

describe("Modalizer with alwaysAccessibleSelector", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should not set aria-hidden on elements that match the alwaysAccessibleSelector", async () => {
        await new BroTest.BroTest(
            (
                <div>
                    <button id="button1">Button1</button>
                    <div
                        {...getTabsterAttribute({
                            modalizer: { id: "modal", isTrapped: true },
                        })}
                    >
                        <button id="button2">Button2</button>
                    </div>
                    <button id="button3">Button3</button>
                    <div id="aria-live" aria-live="polite">
                        Ololo
                    </div>
                </div>
            )
        )
            .eval(() => {
                const vars = getTabsterTestVariables();

                const tabster = vars.createTabster?.(window, {
                    autoRoot: {},
                });

                if (tabster) {
                    vars.getModalizer?.(tabster, "[aria-live]");
                }
            })
            .focusElement("#button2")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .wait(500)
            .eval(() => [
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button1")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button2")
                    ?.parentElement?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "aria-live")
                    ?.hasAttribute("aria-hidden"),
            ])
            .check(([button1, button2, button3, ariaLive]) => {
                expect(button1).toEqual(true);
                expect(button2).toEqual(false);
                expect(button3).toEqual(true);
                expect(ariaLive).toEqual(false);
            })
            .focusElement("#button3")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .wait(500)
            .eval(() => [
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button1")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button2")
                    ?.parentElement?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "aria-live")
                    ?.hasAttribute("aria-hidden"),
            ])
            .check(([button1, button2, button3, ariaLive]) => {
                expect(button1).toEqual(false);
                expect(button2).toEqual(true);
                expect(button3).toEqual(false);
                expect(ariaLive).toEqual(false);
            });
    });
});

describe("Modalizer with checkAccessible callback", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should not set aria-hidden on elements that match the alwaysAccessibleSelector", async () => {
        await new BroTest.BroTest(
            (
                <div>
                    <button id="button1">Button1</button>
                    <div
                        {...getTabsterAttribute({
                            modalizer: { id: "modal", isTrapped: true },
                        })}
                    >
                        <button id="button2">Button2</button>
                    </div>
                    <button id="button3">Button3</button>
                </div>
            )
        )
            .eval(() => {
                const vars = getTabsterTestVariables();

                const tabster = vars.createTabster?.(window, {
                    autoRoot: {},
                });

                if (tabster) {
                    vars.getModalizer?.(
                        tabster,
                        undefined,
                        (el) => el.id === "button3"
                    );
                }
            })
            .focusElement("#button2")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .wait(500)
            .eval(() => [
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button1")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button2")
                    ?.parentElement?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button3")
                    ?.hasAttribute("aria-hidden"),
            ])
            .check(([button1, button2, button3]) => {
                expect(button1).toEqual(true);
                expect(button2).toEqual(false);
                expect(button3).toEqual(false);
            })
            .focusElement("#button3")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .wait(500)
            .eval(() => [
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button1")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button2")
                    ?.parentElement?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button3")
                    ?.hasAttribute("aria-hidden"),
            ])
            .check(([button1, button2, button3]) => {
                expect(button1).toEqual(false);
                expect(button2).toEqual(true);
                expect(button3).toEqual(false);
            });
    });
});

describe("Modalizer with noDirectAriaHidden flag", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    it("should not set aria-hidden on elements with noDirectAriaHidden flag", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div id="div1">
                        <button>Button1</button>
                    </div>
                    <div
                        id="div2"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal", isTrapped: true },
                        })}
                    >
                        <button id="button2">Button2</button>
                    </div>
                    <div id="div3">
                        <button id="button3">Button3</button>
                        <div id="div4">
                            <button id="button4">Button4</button>
                        </div>
                        <div id="div5">
                            <button id="button5">Button5</button>
                        </div>
                    </div>
                </div>
            )
        )
            .focusElement("#button2")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .wait(500)
            .eval(() => [
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div1")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div2")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div4")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div5")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button4")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button5")
                    ?.hasAttribute("aria-hidden"),
            ])
            .check(
                ([div1, div2, div3, div4, div5, button3, button4, button5]) => {
                    expect(div1).toEqual(true);
                    expect(div2).toEqual(false);
                    expect(div3).toEqual(true);
                    expect(div4).toEqual(false);
                    expect(div5).toEqual(false);
                    expect(button3).toEqual(false);
                    expect(button4).toEqual(false);
                    expect(button5).toEqual(false);
                }
            )
            .focusElement("#button3")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .wait(500)
            .eval(() => [
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div1")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div2")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div4")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div5")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button4")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button5")
                    ?.hasAttribute("aria-hidden"),
            ])
            .check(
                ([div1, div2, div3, div4, div5, button3, button4, button5]) => {
                    expect(div1).toEqual(false);
                    expect(div2).toEqual(true);
                    expect(div3).toEqual(false);
                    expect(div4).toEqual(false);
                    expect(div5).toEqual(false);
                    expect(button3).toEqual(false);
                    expect(button4).toEqual(false);
                    expect(button5).toEqual(false);
                }
            )
            .eval(() => {
                const div3 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "div3"
                ) as Types.HTMLElementWithTabsterFlags | null;
                const div4 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "div4"
                ) as Types.HTMLElementWithTabsterFlags | null;

                if (div3) {
                    div3.__tabsterElementFlags = { noDirectAriaHidden: true };
                }

                if (div4) {
                    div4.__tabsterElementFlags = { noDirectAriaHidden: true };
                }
            })
            .focusElement("#button2")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .wait(500)
            .eval(() => [
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div1")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div2")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div4")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "div5")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button3")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button4")
                    ?.hasAttribute("aria-hidden"),
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button5")
                    ?.hasAttribute("aria-hidden"),
            ])
            .check(
                ([div1, div2, div3, div4, div5, button3, button4, button5]) => {
                    expect(div1).toEqual(true);
                    expect(div2).toEqual(false);
                    expect(div3).toEqual(false);
                    expect(div4).toEqual(false);
                    expect(div5).toEqual(true);
                    expect(button3).toEqual(true);
                    expect(button4).toEqual(true);
                    expect(button5).toEqual(false);
                }
            );
    });
});

describe("Modalizer with tabster:movefocus event handling", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    it("should allow to custom handle the focus movement in both not trapped and trapped modalizers", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        aria-label="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal" },
                        })}
                    >
                        <button id="modal-button">ModalButton1</button>
                    </div>
                    <button>Button2</button>
                    <div
                        aria-label="modal2"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal2", isTrapped: true },
                        })}
                    >
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                    <button id="button-3">Button3</button>
                </div>
            )
        )
            .eval(() => {
                document.addEventListener("tabster:movefocus", (e) => {
                    if (
                        getTabsterTestVariables().dom?.getActiveElement(
                            document
                        )?.textContent === "ModalButton1"
                    ) {
                        e.preventDefault();
                        e.detail?.relatedEvent?.preventDefault();
                        getTabsterTestVariables()
                            .dom?.getElementById(document, "button-3")
                            ?.focus();
                    }

                    if (
                        getTabsterTestVariables().dom?.getActiveElement(
                            document
                        )?.textContent === "ModalButton2"
                    ) {
                        e.preventDefault();
                        e.detail?.relatedEvent?.preventDefault();
                        getTabsterTestVariables()
                            .dom?.getElementById(document, "button-1")
                            ?.focus();
                    }
                });
            })
            .focusElement("#modal-button")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .focusElement("#modal-button-2")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"));
    });
});

interface NodeWithVirtualParent extends Node {
    _virtual: {
        parent?: Node;
    };
}

describe("Modalizer with virtual parents provided by getParent()", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should not set aria-hidden on elements which are virtual children of active modalizer", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        id="modal-container-1"
                        aria-label="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal" },
                        })}
                    >
                        <button id="modal-button">ModalButton1</button>
                    </div>
                    <button>Button2</button>
                    <div
                        id="modal-container-2"
                        aria-label="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal", isTrapped: true },
                        })}
                    >
                        <button>ModalButton2</button>
                    </div>
                    <button id="button-3">Button3</button>
                    <div id="virtual-child-1"></div>
                    <div id="virtual-child-2"></div>
                    <div id="not-virtual-child"></div>
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

                tabster && vars.getModalizer?.(tabster);

                const parent1 = vars.dom?.getElementById(
                    document,
                    "modal-container-1"
                );
                const parent2 = vars.dom?.getElementById(
                    document,
                    "modal-container-2"
                );
                const child1 = vars.dom?.getElementById(
                    document,
                    "virtual-child-1"
                );
                const child2 = vars.dom?.getElementById(
                    document,
                    "virtual-child-2"
                );

                child1 && setVirtualParent(child1, parent1);
                child2 && setVirtualParent(child2, parent2);
            })
            .focusElement("#modal-button")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .wait(500)
            .eval(() => {
                const dom = getTabsterTestVariables().dom;
                return [
                    dom
                        ?.getElementById(document, "virtual-child-1")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "virtual-child-2")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "not-virtual-child")
                        ?.hasAttribute("aria-hidden"),
                ];
            })
            .check((ariaHiddens: [boolean, boolean]) =>
                expect(ariaHiddens).toEqual([false, false, true])
            );
    });

    it("should set aria-hidden on elements which are virtual parents of active modalizer but aren't part of modalizer", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div id="virtual-parent-container">
                        <div>
                            <span
                                id="virtual-parent"
                                style={{ visibility: "hidden" }}
                            />
                        </div>
                    </div>
                    <div id="modal-container-1">
                        <div
                            id="modal-1"
                            aria-label="modal-1"
                            {...getTabsterAttribute({
                                modalizer: { id: "modal-1", isTrapped: true },
                            })}
                        >
                            <button id="modal-button-1">ModalButton1</button>
                        </div>
                    </div>
                    <div id="modal-container-2">
                        <div
                            id="modal-2"
                            aria-label="modal-2"
                            {...getTabsterAttribute({
                                modalizer: { id: "modal-2", isTrapped: true },
                            })}
                        >
                            <button id="modal-button-2">ModalButton2</button>
                        </div>
                    </div>
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

                tabster && vars.getModalizer?.(tabster);

                const virtualParent = vars.dom?.getElementById(
                    document,
                    "virtual-parent"
                );
                const modalChild1 = vars.dom?.getElementById(
                    document,
                    "modal-1"
                );
                const modalChild2 = vars.dom?.getElementById(
                    document,
                    "modal-2"
                );

                modalChild1 && setVirtualParent(modalChild1, virtualParent);
                modalChild2 && setVirtualParent(modalChild2, virtualParent);
            })
            .focusElement("#modal-button-1")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .wait(500)
            .eval(() => {
                const dom = getTabsterTestVariables().dom;
                return [
                    dom
                        ?.getElementById(document, "virtual-parent-container")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "modal-container-1")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "modal-container-2")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "button-1")
                        ?.hasAttribute("aria-hidden"),
                ];
            })
            .check(
                ([
                    virtualParentContainer,
                    modalContainer1,
                    modalContainer2,
                    button1,
                ]: [boolean, boolean, boolean, boolean]) => {
                    expect(virtualParentContainer).toBe(true);
                    expect(modalContainer1).toBe(false);
                    expect(modalContainer2).toBe(true);
                    expect(button1).toBe(true);
                }
            )
            .focusElement("#modal-button-2")
            .eval(() => {
                const dom = getTabsterTestVariables().dom;
                return [
                    dom
                        ?.getElementById(document, "virtual-parent-container")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "modal-container-1")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "modal-container-2")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "button-1")
                        ?.hasAttribute("aria-hidden"),
                ];
            })
            .check(
                ([
                    virtualParentContainer,
                    modalContainer1,
                    modalContainer2,
                    button1,
                ]: [boolean, boolean, boolean, boolean]) => {
                    expect(virtualParentContainer).toBe(true);
                    expect(modalContainer1).toBe(false);
                    expect(modalContainer2).toBe(false);
                    expect(button1).toBe(true);
                }
            )
            .wait(500)
            .eval(() => {
                const dom = getTabsterTestVariables().dom;
                return [
                    dom
                        ?.getElementById(document, "virtual-parent-container")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "modal-container-1")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "modal-container-2")
                        ?.hasAttribute("aria-hidden"),
                    dom
                        ?.getElementById(document, "button-1")
                        ?.hasAttribute("aria-hidden"),
                ];
            })
            .check(
                ([
                    virtualParentContainer,
                    modalContainer1,
                    modalContainer2,
                    button1,
                ]: [boolean, boolean, boolean, boolean]) => {
                    expect(virtualParentContainer).toBe(true);
                    expect(modalContainer1).toBe(true);
                    expect(modalContainer2).toBe(false);
                    expect(button1).toBe(true);
                }
            );
    });
});

describe("Modalizer activation on creation", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true, groupper: true });
    });

    it("should activate newly created modalizer if focus is inside the modalizer container", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div id="modal" aria-label="modal">
                        <button id="modal-button">ModalButton1</button>
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                    <button>Button2</button>
                </div>
            )
        )
            .focusElement("#modal-button-2")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab(true)
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .eval(() => {
                const vars = getTabsterTestVariables();

                if (vars.dom && vars.getTabsterAttribute) {
                    vars.dom
                        .getElementById(document, "modal")
                        ?.setAttribute(
                            "data-tabster",
                            vars.getTabsterAttribute(
                                { modalizer: { id: "modal", isTrapped: true } },
                                true
                            )
                        );
                }
            })
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            );
    });

    it("should not activate newly created modalizer if focus is outside the modalizer container", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div id="modal" aria-label="modal">
                        <button id="modal-button">ModalButton1</button>
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                    <button>Button2</button>
                </div>
            )
        )
            .focusElement("#modal-button-2")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .eval(() => {
                const vars = getTabsterTestVariables();

                if (vars.dom && vars.getTabsterAttribute) {
                    vars.dom
                        .getElementById(document, "modal")
                        ?.setAttribute(
                            "data-tabster",
                            vars.getTabsterAttribute(
                                { modalizer: { id: "modal", isTrapped: true } },
                                true
                            )
                        );
                }
            })
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"));
    });

    it("should not activate newly created modalizer if focus is on the modalizer container", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div id="modal" aria-label="modal" tabIndex={0}>
                        <button id="modal-button">ModalButton1</button>
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                    <button>Button2</button>
                </div>
            )
        )
            .focusElement("#modal")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .eval(() => {
                const vars = getTabsterTestVariables();

                if (vars.dom && vars.getTabsterAttribute) {
                    vars.dom.getElementById(document, "modal")?.setAttribute(
                        "data-tabster",
                        vars.getTabsterAttribute(
                            {
                                modalizer: { id: "modal", isTrapped: true },
                                groupper: { tabbability: 2 },
                            },
                            true
                        )
                    );
                }
            })
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1ModalButton2")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"));
    });
});

describe("Modalizer activation", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    it("should activate most recently active modalizer when currently active one disappears", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        id="modal-1"
                        aria-label="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal-1", isTrapped: true },
                        })}
                    >
                        <button id="modal-button-1">ModalButton1</button>
                    </div>
                    <button>Button2</button>
                    <div
                        id="modal-2"
                        aria-label="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal-2", isTrapped: true },
                        })}
                    >
                        <button id="modal-button-2">ModalButton2</button>
                    </div>
                    <button>Button3</button>
                    <div
                        id="modal-3"
                        aria-label="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal-3", isTrapped: true },
                        })}
                    >
                        <button id="modal-button-3">ModalButton3</button>
                    </div>
                    <button>Button4</button>
                </div>
            )
        )
            .focusElement("#modal-button-1")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .focusElement("#modal-button-3")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .focusElement("#modal-button-2")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton2")
            )
            .removeElement("#modal-2")
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab()
            .wait(300) // Give Modalizer time to restore focus to active modalizer.
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton3")
            )
            .removeElement("#modal-3")
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab()
            .wait(300) // Give Modalizer time to restore focus to active modalizer.
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            );
    });

    it("should activate modalizer by element from modalizer or modalizer container", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        id="modal-1"
                        aria-label="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal-1", isTrapped: true },
                        })}
                    >
                        <button id="modal-button-1">ModalButton1</button>
                    </div>
                    <button>Button2</button>
                </div>
            )
        )
            .focusElement("#button-1")
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .eval(() => {
                const tabsterTestVariables = getTabsterTestVariables();
                const element = tabsterTestVariables.dom?.getElementById(
                    document,
                    "modal-button-1"
                );

                if (element) {
                    // Activate by element from modalizer.
                    return [tabsterTestVariables.modalizer?.activate(element)];
                }

                return [];
            })
            .check((result: boolean[]) => {
                expect(result).toEqual([true]);
            })
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            )
            .eval(() => {
                return [
                    // Deactivate modalizer.
                    getTabsterTestVariables().modalizer?.activate(undefined),
                ];
            })
            .check((result: boolean[]) => {
                expect(result).toEqual([true]);
            })
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button2"))
            .eval(() => {
                const tabsterTestVariables = getTabsterTestVariables();
                const element = tabsterTestVariables.dom?.getElementById(
                    document,
                    "modal-1"
                );

                if (element) {
                    // Activate by modalizer container.
                    return [tabsterTestVariables.modalizer?.activate(element)];
                }

                return [];
            })
            .check((result: boolean[]) => {
                expect(result).toEqual([true]);
            })
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("ModalButton1")
            );
    });
});
