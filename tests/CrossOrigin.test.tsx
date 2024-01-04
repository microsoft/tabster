/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("CrossOrigin", () => {
    const tabsterParts = { crossOrigin: true };

    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage(tabsterParts);
    });

    it("should request focus between iframes", async () => {
        const names = ["name", "name2"];
        const namesForIframe = ["frame1-name", "frame1-name2"];

        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <iframe
                        id="frame1"
                        src={BroTest.getTestPageURL(tabsterParts)}
                    ></iframe>
                    <button
                        {...getTabsterAttribute({
                            observed: { names },
                        })}
                    >
                        Button2
                    </button>
                </div>
            )
            .frame("frame1")
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button
                        {...getTabsterAttribute({
                            observed: { names: namesForIframe },
                        })}
                        tabIndex={-1} // Testing that programmatically focusable elements are focused.
                    >
                        Button3
                    </button>
                </div>
            )
            .unframe()
            // focus with the first observed name in array for iframe then host page
            .eval((namesForIframe) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    namesForIframe[0],
                    0
                );
            }, namesForIframe)
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
                expect(el?.attributes.id).toEqual("frame1");
            })
            .frame("frame1")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .eval((names) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    names[0],
                    0
                );
            }, names)
            .activeElement((el) => {
                expect(el).toBeNull();
            })
            .unframe()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            // focus with the second observed name in array for iframe then host page
            .eval((namesForIframe) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    namesForIframe[1],
                    0
                );
            }, namesForIframe)
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
                expect(el?.attributes.id).toEqual("frame1");
            })
            .frame("frame1")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .eval((names) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    names[1],
                    0
                );
            }, names)
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

    it("should request focus in the same frame", async () => {
        const names = ["name", "name2"];
        const namesForIframe = ["frame1-name", "frame1-name2"];

        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <iframe
                        id="frame1"
                        src={BroTest.getTestPageURL(tabsterParts)}
                    ></iframe>
                    <button
                        {...getTabsterAttribute({
                            observed: { names },
                        })}
                    >
                        Button2
                    </button>
                </div>
            )
            .frame("frame1")
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button
                        {...getTabsterAttribute({
                            observed: { names: namesForIframe },
                        })}
                    >
                        Button3
                    </button>
                </div>
            )
            .eval((namesForIframe) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    namesForIframe[0],
                    0
                );
            }, namesForIframe)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .unframe()
            .eval((names) => {
                return getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    names[0],
                    0
                );
            }, names)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should request focus and wait till the element becomes accessible", async () => {
        const namesForOuter = ["name", "name2"];
        const namesForInner = ["frame1-name", "frame1-name2"];

        await new BroTest.BroTest()
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <iframe
                        id="frame1"
                        src={BroTest.getTestPageURL(tabsterParts)}
                    ></iframe>
                    <button
                        id="outer-button"
                        aria-hidden="true"
                        {...getTabsterAttribute({
                            observed: { names: namesForOuter },
                        })}
                    >
                        ButtonInOuter
                    </button>
                </div>
            )
            .frame("frame1")
            .html(
                <div {...getTabsterAttribute({ root: {} })}>
                    <button
                        id="inner-button"
                        aria-hidden="true"
                        {...getTabsterAttribute({
                            observed: { names: namesForInner },
                        })}
                    >
                        ButtonInInner
                    </button>
                </div>
            )
            .eval((observedName) => {
                getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    observedName,
                    3000
                );
            }, namesForInner[0])
            .activeElement((el) => {
                expect(el).toBeNull();
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "inner-button")
                    ?.removeAttribute("aria-hidden");
            })
            .wait(200)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("ButtonInInner");
            })
            .eval(() => {
                // Setting it back to try again from the outer iframe.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                getTabsterTestVariables()
                    .dom?.getElementById(document, "inner-button")!
                    .setAttribute("aria-hidden", "true");
            })
            .unframe()
            .eval((observedName) => {
                getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    observedName,
                    3000
                );
            }, namesForOuter[0])
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "outer-button")
                    ?.removeAttribute("aria-hidden");
            })
            .wait(200)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("ButtonInOuter");
            })
            .eval((observedName) => {
                // Setting it back to try again from the inner iframe.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                getTabsterTestVariables()
                    .dom?.getElementById(document, "outer-button")!
                    .setAttribute("aria-hidden", "true");

                // Trying the inner iframe again.
                getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    observedName,
                    3000
                );
            }, namesForInner[1])
            .wait(200)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("ButtonInOuter");
            })
            .frame("frame1")
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "inner-button")
                    ?.removeAttribute("aria-hidden");
            })
            .unframe()
            .wait(200)
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
            })
            .frame("frame1")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("ButtonInInner");
            })
            .eval((observedName) => {
                getTabsterTestVariables().crossOrigin?.observedElement?.requestFocus(
                    observedName,
                    3000
                );
            }, namesForOuter[1])
            .wait(200)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("ButtonInInner");
            })
            .unframe()
            .activeElement((el) => {
                expect(el?.tag).toEqual("iframe");
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "outer-button")
                    ?.removeAttribute("aria-hidden");
            })
            .wait(200)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("ButtonInOuter");
            })
            .frame("frame1")
            .activeElement((el) => {
                expect(el).toBeNull();
            });
    });
});
