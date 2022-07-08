/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("CrossOrigin", () => {
    const tabsterParts = { crossOrigin: true };

    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage(tabsterParts);
    });

    it("should request focus between iframes", async () => {
        const name = "test";
        const name2 = "test2";

        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <iframe
                        id="frame1"
                        src={BroTest.getTestPageURL(tabsterParts)}
                    ></iframe>
                    <button {...getTabsterAttribute({ observed: { name } })}>
                        Button2
                    </button>
                </div>
            )
            .frame("frame1")
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button
                        {...getTabsterAttribute({ observed: { name: name2 } })}
                    >
                        Button3
                    </button>
                </div>
            )
            .unframe()
            .eval((name2) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    name2,
                    0
                );
            }, name2)
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
                expect(el?.attributes.id).toEqual("frame1");
            })
            .frame("frame1")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .eval((name) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    name,
                    0
                );
            }, name)
            .activeElement((el) => {
                expect(el).toBeNull();
            })
            .unframe()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("tabs through iframes properly", async () => {
        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <iframe
                        id="frame1"
                        src={BroTest.getTestPageURL(tabsterParts)}
                    ></iframe>
                    <button>Button2</button>
                </div>
            )
            .frame("frame1")
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button3</button>
                    <iframe
                        id="frame2"
                        src={BroTest.getTestPageURL(tabsterParts)}
                    ></iframe>
                    <button>Button4</button>
                </div>
            )
            .frame("frame2")
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button5</button>
                    <button>Button6</button>
                </div>
            )
            .unframe(2)
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
                expect(el?.attributes.id).toEqual("frame1");
            })
            .frame("frame1")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
                expect(el?.attributes.id).toEqual("frame2");
            })
            .frame("frame2")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el).toBeNull();
            })
            .unframe()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el).toBeNull();
            })
            .unframe()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });
});
