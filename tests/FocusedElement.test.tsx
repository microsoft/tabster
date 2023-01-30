/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
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

                const addEvent = (eventName: string) => {
                    document.body.addEventListener(
                        eventName,
                        (
                            e: Types.TabsterEventWithDetails<Types.FocusedElementDetails>
                        ) => {
                            (
                                window as WindowWithFocusEventsHistory
                            ).__tabsterFocusEvents?.push(
                                `${eventName} ${
                                    (e.target as HTMLElement)?.id
                                } ${e.details.isFocusedProgrammatically} ${
                                    e.details.modalizerId
                                }`
                            );
                        }
                    );
                };

                addEvent("tabster:focusin");
                addEvent("tabster:focusout");
            })
            .pressTab()
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusin button-1 false undefined",
                ]);
            })
            .pressTab()
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout button-1 undefined undefined",
                    "tabster:focusin button-2 false undefined",
                ]);
            })
            .pressTab()
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout button-2 undefined undefined",
                ]);
            })
            .pressTab(true)
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusin button-2 false undefined",
                ]);
            })
            .focusElement("#modal-button-1")
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout button-2 undefined undefined",
                    "tabster:focusin modal-button-1 true modal",
                ]);
            })
            .pressTab(true)
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusout modal-button-1 undefined modal",
                ]);
            })
            .pressTab()
            .eval(getEvents)
            .check((tabsterModalizerEvents: string[]) => {
                expect(tabsterModalizerEvents).toEqual([
                    "tabster:focusin modal-button-1 false modal",
                ]);
            });
    });
});
