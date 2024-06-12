/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    TabsterFocusInEventName,
    TabsterFocusOutEventName,
} from "tabster";
import * as BroTest from "./utils/BroTest";
import { BrowserElement } from "./utils/BroTest";

describe("onKeyDown", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ modalizer: true });
    });

    it("should not do anything on element with contenteditable='true'", async () => {
        // Lots of things can happen on keydown
        // Tabster never focuses aria-hidden so if we can focus in there it is safely ignored
        const testHtml = (
            <div id="root" {...getTabsterAttribute({ root: {} })}>
                <div tabIndex={0} contentEditable="true">
                    <button aria-hidden>Button1</button>
                    <button aria-hidden>Button2</button>
                </div>
                <button>Don't focus</button>
            </div>
        );

        await new BroTest.BroTest(testHtml)
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes.contenteditable).toEqual("true")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes["aria-hidden"]).toEqual("true")
            );
    });

    it("Should not handle event on Ctrl+Tab", async () => {
        const testHtml = (
            <div id="root" {...getTabsterAttribute({ root: {} })}>
                <div tabIndex={0}>
                    <button>Button1</button>
                    <button>Button2</button>
                </div>
                <button>Don't focus</button>
            </div>
        );

        let focusedElement: BrowserElement | null;
        await new BroTest.BroTest(testHtml)
            .activeElement((el) => (focusedElement = el))
            .pressTab(false /* shift */, true /* ctrlKey */)
            .activeElement((el) => {
                expect(el).toEqual(focusedElement);
            });
    });

    it("Should trigger tabster:focusin and tabster:focusout events", async () => {
        interface WindowWithFocusEventsHistory extends Window {
            __tabsterFocusEvents?: string[];
        }

        const getEvents = () => {
            const tabsterFocusEvents = (window as WindowWithFocusEventsHistory)
                .__tabsterFocusEvents;
            (window as WindowWithFocusEventsHistory).__tabsterFocusEvents = [];
            return tabsterFocusEvents;
        };

        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        {...getTabsterAttribute({
                            modalizer: { id: "modal" },
                        })}
                    >
                        <button id="modal-button-1">ModalButton1</button>
                    </div>
                    <button id="button-2">Button2</button>
                </div>
            )
        )
            .eval(() => {
                (window as WindowWithFocusEventsHistory).__tabsterFocusEvents =
                    [];

                const addEvent = (
                    eventName:
                        | typeof TabsterFocusInEventName
                        | typeof TabsterFocusOutEventName
                ) => {
                    document.body.addEventListener(eventName, (e) => {
                        const target = e.composedPath()[0];
                        (
                            window as WindowWithFocusEventsHistory
                        ).__tabsterFocusEvents?.push(
                            `${eventName} ${(target as HTMLElement)?.id} ${
                                e.detail?.isFocusedProgrammatically
                            } ${e.detail?.modalizerId}`
                        );
                    });
                };

                addEvent("tabster:focusin");
                addEvent("tabster:focusout");
            })
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes.id).toEqual("button-1")
            )
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusin button-1 false undefined",
                ]);
            })
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes.id).toEqual("button-2")
            )
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout button-1 undefined undefined",
                    "tabster:focusin button-2 false undefined",
                ]);
            })
            .pressTab()
            .activeElement((el) => expect(el).toBeNull())
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout button-2 undefined undefined",
                ]);
            })
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.attributes.id).toEqual("button-2")
            )
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusin button-2 false undefined",
                ]);
            })
            .focusElement("#modal-button-1")
            .activeElement((el) =>
                expect(el?.attributes.id).toEqual("modal-button-1")
            )
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout button-2 undefined undefined",
                    "tabster:focusin modal-button-1 true modal",
                ]);
            })
            .pressTab(true)
            .activeElement((el) => expect(el).toBeNull())
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout modal-button-1 undefined modal",
                ]);
            })
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes.id).toEqual("modal-button-1")
            )
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusin modal-button-1 false modal",
                ]);
            });
    });
});

describe("does not skip bizarre inaccessible things in the end of the root", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({});
    });

    it("should focus inaccessible button in the end of root", async () => {
        // TODO: Remove this workaround once the TMP nested button is fixed.
        const testHtml = (
            <div id="root" {...getTabsterAttribute({ root: {} })}>
                <div>
                    <button>Button1</button>
                </div>
                <div>
                    <button disabled={true} id="button">
                        Button2
                    </button>
                </div>
            </div>
        );

        await new BroTest.BroTest(testHtml)
            .eval(() => {
                const innerButton = document.createElement("button");
                innerButton.innerText = "Button3";
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button")
                    ?.appendChild(innerButton);
            })
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual(undefined))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"));
    });

    it("should focus inaccessible button inside uncontrolled in the end of root and invisible button in the very end", async () => {
        const testHtml = (
            <div id="root" {...getTabsterAttribute({ root: {} })}>
                <div>
                    <button>Button1</button>
                </div>
                <div {...getTabsterAttribute({ uncontrolled: {} })}>
                    <button disabled={true} id="button">
                        Button2
                    </button>
                </div>
                <div style={{ display: "none" }}>
                    <div>
                        <button>Button4</button>
                    </div>
                </div>
                <div>Empty</div>
            </div>
        );

        await new BroTest.BroTest(testHtml)
            .eval(() => {
                const innerButton = document.createElement("button");
                innerButton.innerText = "Button3";
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button")
                    ?.appendChild(innerButton);
            })
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual(undefined))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button3"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"));
    });
});

describe("Radio buttons", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ groupper: true });
    });

    it("Should skip unchecked radio buttons", async () => {
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <input type="radio" name="ololo" value="111" />
                        <input type="radio" name="ololo" value="222" checked />
                        <input type="radio" name="ololo" value="333" />
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => expect(el?.attributes?.value).toEqual("222"))
            .pressTab()
            .activeElement((el) => expect(el).toBeNull())
            .pressTab(true)
            .activeElement((el) => expect(el?.attributes?.value).toEqual("222"))
            .pressTab(true)
            .activeElement((el) => expect(el).toBeNull);
    });

    it("Should skip unchecked radio buttons mixed with other focusables while not skipping other focusables", async () => {
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <input type="radio" name="ololo" value="111" />
                        <button value="button1">Button1</button>
                        <input type="radio" name="ololo" value="222" />
                        <button value="button2">Button2</button>
                        <input type="radio" name="ololo" value="333" checked />
                        <button value="button3">Button3</button>
                        <input type="radio" name="ololo" value="444" />
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button1")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button2")
            )
            .pressTab()
            .activeElement((el) => expect(el?.attributes?.value).toEqual("333"))
            .pressUp()
            .activeElement((el) => expect(el?.attributes?.value).toEqual("222"))
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button2")
            )
            .pressTab()
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button3")
            )
            .pressTab()
            .activeElement((el) => expect(el).toBeNull())
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button3")
            )
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button2")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.attributes?.value).toEqual("222"))
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button1")
            )
            .pressTab(true)
            .activeElement((el) => expect(el).toBeNull);
    });

    it("Should skip unchecked radio buttons when entering Groupper", async () => {
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: { tabbability: 2 },
                        })}
                    >
                        Radio
                        <input type="radio" name="ololo" value="111" />
                        <input type="radio" name="ololo" value="222" checked />
                        <button value="button1">Button1</button>
                        <input type="radio" name="ololo" value="333" />
                        Buttons
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("RadioButton1Buttons")
            )
            .pressTab()
            .activeElement((el) => expect(el).toBeNull())
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("RadioButton1Buttons")
            )
            .pressEnter()
            .activeElement((el) => expect(el?.attributes?.value).toEqual("222"))
            .pressDown()
            .activeElement((el) => expect(el?.attributes?.value).toEqual("333"))
            .pressEsc()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("RadioButton1Buttons")
            )
            .pressEnter()
            .activeElement((el) =>
                expect(el?.attributes?.value).toEqual("button1")
            );
    });

    it("Should find all radios buttons when findAll() is called", async () => {
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <input type="radio" name="ololo" value="111" />
                        <input type="radio" name="ololo" value="222" checked />
                        <button value="button1">Button1</button>
                        <input type="radio" name="ololo" value="333" />
                    </div>
                </div>
            )
        )
            .eval(() => {
                const root = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "root"
                );

                if (root) {
                    const buttons =
                        getTabsterTestVariables().core?.focusable.findAll({
                            container: root,
                        });

                    return buttons?.map((button) =>
                        button.getAttribute("value")
                    );
                }

                return null;
            })
            .check((buttons: string[]) => {
                expect(buttons).toEqual(["111", "222", "button1", "333"]);
            });
    });
});
