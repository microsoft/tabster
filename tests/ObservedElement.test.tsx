/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Focusable", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ observed: true });
    });

    it("should request focus for element with tabindex -1", async () => {
        const name = "test";
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button
                        {...getTabsterAttribute({
                            observed: { names: [name] },
                        })}
                        tabIndex={-1}
                    >
                        Button2
                    </button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval((name) => {
                return getTabsterTestVariables().observedElement?.requestFocus(
                    name,
                    0
                ).result;
            }, name)
            .check((res: boolean) => expect(res).toBe(true))
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should request focus for element with tabindex -1 and multiple names", async () => {
        const names = ["test-1", "test-0"];
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button
                        {...getTabsterAttribute({
                            observed: { names },
                        })}
                        tabIndex={-1}
                    >
                        Button2
                    </button>
                </div>
            )
        )
            // reuqest focus for names[0]
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval((name) => {
                return getTabsterTestVariables().observedElement?.requestFocus(
                    name,
                    0
                ).result;
            }, names[0])
            .check((res: boolean) => expect(res).toBe(true))
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            // reuqest focus for names[1]
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval((name) => {
                return getTabsterTestVariables().observedElement?.requestFocus(
                    name,
                    0
                ).result;
            }, names[1])
            .check((res: boolean) => expect(res).toBe(true))
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should request focus for non-existent element with tabindex -1", async () => {
        const name = "test";
        await new BroTest.BroTest(
            <div id="root" {...getTabsterAttribute({ root: {} })}></div>
        )
            .eval((name) => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        name,
                        5000
                    ).result;

                const observedButton = document.createElement("button");
                observedButton.textContent = name;
                document.getElementById("root")?.appendChild(observedButton);
                const observed: Types.TabsterOnElement = {
                    observed: { names: [name] },
                };
                observedButton.setAttribute(
                    "data-tabster",
                    JSON.stringify(observed)
                );

                return request;
            }, name)
            .check((res: boolean) => expect(res).toBe(true))
            .activeElement((el) => {
                expect(el?.textContent).toEqual(name);
            });
    });

    it("should cancel the focus request when the next one is happened", async () => {
        await new BroTest.BroTest(<div id="root"></div>)
            .eval(() => {
                return new Promise((resolve) => {
                    const request1 =
                        getTabsterTestVariables().observedElement?.requestFocus(
                            "button1",
                            10005000
                        );

                    setTimeout(() => {
                        const request2 =
                            getTabsterTestVariables().observedElement?.requestFocus(
                                "button2",
                                10005000
                            );

                        setTimeout(() => {
                            const button1 = document.createElement("button");
                            button1.setAttribute(
                                "data-tabster",
                                '{"observed":{"names": ["button1"]}}'
                            );
                            button1.textContent = "Button1";

                            const root = document.getElementById("root");

                            root?.appendChild(button1);

                            setTimeout(() => {
                                const button2 =
                                    document.createElement("button");
                                button2.setAttribute(
                                    "data-tabster",
                                    '{"observed":{"names": ["button2"]}}'
                                );
                                button2.textContent = "Button2";
                                root?.appendChild(button2);

                                Promise.all([
                                    request1?.result,
                                    request2?.result,
                                ]).then((onfulfilled) => {
                                    resolve(onfulfilled);
                                });
                            }, 100);
                        }, 100);
                    }, 100);
                });
            })
            .check((result: [boolean, boolean]) => {
                expect(result[0]).toBe(false);
                expect(result[1]).toBe(true);
            })
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should wait for the element to become focusable when the element is already in the DOM", async () => {
        const name = "test";
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button
                        {...getTabsterAttribute({
                            observed: { names: [name] },
                        })}
                        id="test-button"
                        aria-hidden="true"
                    >
                        Button1
                    </button>
                </div>
            )
        )
            .eval((name) => {
                getTabsterTestVariables().observedElement?.requestFocus(
                    name,
                    100500
                );
            }, name)
            .wait(500)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .eval(() => {
                document
                    .getElementById("test-button")
                    ?.removeAttribute("aria-hidden");
            })
            .wait(500)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should wait for the element to become focusable when the element is already in the DOM, removed then added again", async () => {
        const name = "test3";
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <button
                        {...getTabsterAttribute({
                            observed: { names: [name] },
                        })}
                        id="test-button"
                        aria-hidden="true"
                    >
                        Button1
                    </button>
                </div>
            )
        )
            .eval((name) => {
                getTabsterTestVariables().observedElement?.requestFocus(
                    name,
                    100500
                );
            }, name)
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .eval(() => {
                const b = document.getElementById("test-button");
                if (b && b.parentElement) {
                    b.parentElement.removeChild(b);
                }
            })
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .eval((name) => {
                const b = document.createElement("button");
                b.id = "test-button-2";
                b.innerText = "CreatedButton";
                b.setAttribute("aria-hidden", "true");
                b.setAttribute(
                    "data-tabster",
                    `{"observed": {"names": ["${name}"]}}`
                );
                document.getElementById("root")?.appendChild(b);
            }, name)
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .eval(() => {
                document
                    .getElementById("test-button-2")
                    ?.removeAttribute("aria-hidden");
            })
            .wait(300)
            .activeElement((el) => {
                expect(el?.attributes.id).toEqual("test-button-2");
                expect(el?.textContent).toEqual("CreatedButton");
            });
    });
});
