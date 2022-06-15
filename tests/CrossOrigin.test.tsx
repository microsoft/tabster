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

    it("shows <iframe> usage example", async () => {
        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
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
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
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
                <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
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
