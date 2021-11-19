/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as BroTest from "../../testing/BroTest";
import { getTabsterAttribute, Types } from "../Tabster";

describe("Modalizer", () => {
    const getTestHtml = (options: Partial<Types.ModalizerProps> = {}) => {
        const id = "modal";
        const rootAttr = getTabsterAttribute({ root: {} });
        const modalizerAttr = getTabsterAttribute({
            modalizer: { id, ...options },
        });

        return (
            <div {...rootAttr}>
                <div id="hidden">
                    <div>Hidden</div>
                    <button id="outside">Outside</button>
                </div>
                <div aria-label="modal" id="modal" {...modalizerAttr}>
                    <button id="foo">Foo</button>
                    <button>Bar</button>
                </div>
            </div>
        );
    };

    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    // makes sure that modalizer is cleaned up after each test run
    afterEach(async () => {
        await new BroTest.BroTest(<div></div>);
    });

    it("should activate and set aria-hidden when focused", async () => {
        await new BroTest.BroTest(getTestHtml())
            .focusElement("#foo")
            .eval(() =>
                document.getElementById("hidden")?.getAttribute("aria-hidden")
            )
            .check((ariaHidden: string | undefined) =>
                expect(ariaHidden).toBe("true")
            )
            .eval(() =>
                document.getElementById("outside")?.hasAttribute("aria-hidden")
            )
            .check((hasAriaHidden: boolean | undefined) =>
                expect(hasAriaHidden).toBe(false)
            );
    });

    it("should deactivate and restore aria-hidden when removed from DOM", async () => {
        await new BroTest.BroTest(getTestHtml())
            .focusElement("#foo")
            .eval(() => document.getElementById("modal")?.remove())
            .eval(() =>
                document.getElementById("hidden")?.hasAttribute("aria-hidden")
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
                document.getElementById("hidden")?.hasAttribute("aria-hidden")
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
            .activeElement((el) => expect(el).toBeNull())
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
                        document.getElementById("modal")?.remove();
                    });
                })
                .click("#outside")
                .activeElement((el) => expect(el?.textContent).toBe("Outside"));
        });
    });

    describe("Others content accessible", () => {
        it("should allow focus outside of modalizer", async () => {
            await new BroTest.BroTest(getTestHtml({ isOthersAccessible: true }))
                .focusElement("#foo")
                .eval(() =>
                    document
                        .getElementById("hidden")
                        ?.hasAttribute("aria-hidden")
                )
                .check((hasAriaHidden: boolean | undefined) =>
                    expect(hasAriaHidden).toBe(false)
                )
                .pressTab(true)
                .activeElement((el) =>
                    expect(el?.attributes.id).toBe("outside")
                );
        });

        it("should allow focus into modalizer", async () => {
            await new BroTest.BroTest(getTestHtml({ isOthersAccessible: true }))
                .focusElement("#outside")
                .pressTab()
                .activeElement((el) => expect(el?.attributes.id).toBe("foo"));
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

    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
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
                    const newModalizer = document.getElementById("modal");
                    newModalizer?.setAttribute(attrName, tabsterAttr);
                },
                Types.TabsterAttributeName,
                tabsterAttr
            )
            .eval(() =>
                document.getElementById("hidden")?.getAttribute("aria-hidden")
            )
            .check((ariaHidden: string | undefined) =>
                expect(ariaHidden).toBe("true")
            );
    });
});
