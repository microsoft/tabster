/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, GroupperTabbabilities, Types } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("<iframe />", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            deloser: true,
            mover: true,
            groupper: true,
        });
    });

    it("should focus in an out with Tab", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                    <button>Button1</button>
                    <iframe src="/iframe.html" />
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
                expect(el?.tag).toBe("iframe");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should handle an iframe inside Groupper", async () => {
        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>MoverButton1</button>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            Some
                            <iframe
                                id="frame1"
                                src={BroTest.getTestPageURL()}
                            ></iframe>
                            <button>GroupperButton1</button>
                            Text
                        </div>
                        <button>MoverButton2</button>
                    </div>
                    <button>Button2</button>
                </div>
            )
            .frame("frame1")
            .html(
                <div>
                    <button>IframeButton1</button>
                    <button>IframeButton2</button>
                </div>
            )
            .unframe()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("MoverButton1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("SomeGroupperButton1Text");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("SomeGroupperButton1Text");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.attributes.id).toEqual("frame1");
            })
            // To think about. Focusing iframe doesn't move focus inside it.
            // At the same time we don't have access to the iframe's contents.
            // TODO: Consider a callback so that the application can invoke
            // custom logic when Tabster focuses an iframe.
            // For now (and for the sake of this test) we'll just do another Tab.
            .pressTab()
            .frame("frame1")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("IframeButton1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("IframeButton2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el).toBeNull();
            })
            .unframe()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("GroupperButton1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.attributes.id).toEqual("frame1");
            })
            .frame("frame1")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("IframeButton1");
            });
    });

    it("should skip invisible iframes while finding focusables", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <iframe style={{ display: "none" }} src="/iframe.html" />
                    <button>Button2</button>
                </div>
            )
        )
            .eval(() => {
                return getTabsterTestVariables()
                    .core?.focusable.findAll({ container: document.body })
                    .map((el) => el.textContent);
            })
            .check((evalRet: string[]) => {
                expect(evalRet).toEqual(["Button1", "Button2"]);
            });
    });

    it("should skip invisible iframes while computing context", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <iframe
                        {...getTabsterAttribute({ mover: {} })}
                        id="iframe"
                        style={{ display: "none" }}
                        src="/iframe.html"
                    />
                    <button>Button2</button>
                </div>
            )
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const rootAPI = vars?.core?.root;
                const iframe = vars.dom?.getElementById(document, "iframe");
                const tabster = (rootAPI as any)?._tabster;
                const context = (rootAPI?.constructor as any).getTabsterContext(
                    tabster,
                    iframe
                );
                return {
                    contextType: typeof context,
                    uncontrolled: (context as Types.TabsterContext)
                        ?.uncontrolled?.tagName,
                };
            })
            .check(
                (evalRet: { contextType: string; uncontrolled?: string }) => {
                    expect(evalRet).toEqual({
                        contextType: "object",
                        uncontrolled: undefined,
                    });
                }
            );
    });
});
