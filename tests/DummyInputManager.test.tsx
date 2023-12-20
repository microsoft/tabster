/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import * as BroTest from "./utils/BroTest";
import { describeIfUncontrolled } from "./utils/test-utils";

describeIfUncontrolled("DummyInputManager", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            mover: true,
            groupper: true,
            modalizer: true,
        });
    });
    describe("should update dummy inputs when DOM children update for", () => {
        const evaluateDummy = (dummyAttribute: string, elementId: string) => {
            const element = document.getElementById(elementId) as HTMLElement;

            return {
                first: !!element.firstElementChild?.hasAttribute(
                    dummyAttribute
                ),
                last: !!element.lastElementChild?.hasAttribute(dummyAttribute),
                prev: !!element.previousElementSibling?.hasAttribute(
                    dummyAttribute
                ),
                next: !!element.nextElementSibling?.hasAttribute(
                    dummyAttribute
                ),
            };
        };

        const checkDummyInside = (res: ReturnType<typeof evaluateDummy>) => {
            expect(res.first).toBe(true);
            expect(res.last).toBe(true);
            expect(res.prev).toBe(false);
            expect(res.next).toBe(false);
        };

        const checkDummyOutside = (res: ReturnType<typeof evaluateDummy>) => {
            expect(res.first).toBe(false);
            expect(res.last).toBe(false);
            expect(res.prev).toBe(true);
            expect(res.next).toBe(true);
        };

        const appendElement = (elementId: string) => {
            const current = document.getElementById(elementId) as HTMLElement;
            const newElement = document.createElement("button");
            newElement.textContent = "New element append";
            current.appendChild(newElement);
        };

        const prependElement = (elementId: string) => {
            const current = document.getElementById(elementId) as HTMLElement;
            const newElement = document.createElement("button");
            newElement.textContent = "New element prepend";
            current.prepend(newElement);
        };

        const insertElementBefore = (elementId: string) => {
            const current = document.getElementById(elementId) as HTMLElement;
            const newElement = document.createElement("button");
            newElement.textContent = "New element prepend";
            current.parentNode?.insertBefore(newElement, current);
        };

        const insertElementAfter = (elementId: string) => {
            const current = document.getElementById(elementId) as HTMLElement;
            const nextSibling = current.nextElementSibling;
            const newElement = document.createElement("button");
            newElement.textContent = "New element prepend";
            current.parentNode?.insertBefore(newElement, nextSibling);
        };

        it("mover", async () => {
            const attr = getTabsterAttribute({
                mover: {
                    direction: Types.MoverDirections.Vertical,
                    cyclic: true,
                },
            });
            const moverId = "mover";

            const testHtml = (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <div {...attr} id={moverId}>
                            <button>Button1</button>
                            <button>Button2</button>
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyInside)
                .eval(appendElement, moverId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyInside)
                .eval(prependElement, moverId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyInside);
        });

        it("mover should not scroll when the dummy inputs are focused", async () => {
            const attr = getTabsterAttribute({
                mover: {
                    direction: Types.MoverDirections.Vertical,
                    cyclic: true,
                    memorizeCurrent: true,
                },
            });

            const scrollId = "scroll";
            const moverId = "mover";

            const testHtml = (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        id={scrollId}
                        style={{
                            transform: "translate3d(0px, 0px, 0px)",
                            height: "200px",
                            overflow: "scroll",
                        }}
                    >
                        <ul {...attr} id={moverId}>
                            <li>
                                <button>Button2</button>
                            </li>
                            <li style={{ paddingTop: "500px" }}>
                                <button>Button3</button>
                            </li>
                            <li style={{ paddingBottom: "500px" }}>
                                <button>Button4</button>
                            </li>
                            <li>
                                <button>Button5</button>
                            </li>
                        </ul>
                    </div>
                    <button>Button6</button>
                </div>
            );

            const evaluateScrollTop = (scrollableId: string) => {
                const element = document.getElementById(
                    scrollableId
                ) as HTMLElement;
                return element.scrollTop;
            };

            let lastScrollTop = 0;

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyOutside)
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Button1"))
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Button2"))
                .pressDown()
                .wait(200) // We throttle the dummy inputs position update, so giving it a bit.
                .activeElement((el) => expect(el?.textContent).toBe("Button3"))
                .eval(evaluateScrollTop, scrollId)
                .check((scrollTop: number | undefined) => {
                    expect(scrollTop).toBeGreaterThan(0);
                    lastScrollTop = scrollTop || 0;
                })
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Button6"))
                .eval(evaluateScrollTop, scrollId)
                .check((scrollTop: number | undefined) => {
                    expect(scrollTop).toBe(lastScrollTop);
                })
                .pressTab(true)
                .activeElement((el) => expect(el?.textContent).toBe("Button3"))
                .eval(evaluateScrollTop, scrollId)
                .check((scrollTop: number | undefined) => {
                    expect(scrollTop).toBe(lastScrollTop);
                })
                .pressDown()
                .pressDown()
                .wait(200) // We throttle the dummy inputs position update, so giving it a bit.
                .activeElement((el) => expect(el?.textContent).toBe("Button5"))
                .eval(evaluateScrollTop, scrollId)
                .check((scrollTop: number | undefined) => {
                    expect(scrollTop).toBeGreaterThan(0);
                    lastScrollTop = scrollTop || 0;
                })
                .pressTab(true)
                .activeElement((el) => expect(el?.textContent).toBe("Button1"))
                .eval(evaluateScrollTop, scrollId)
                .check((scrollTop: number | undefined) => {
                    expect(scrollTop).toBe(lastScrollTop);
                });
        });

        it("groupper", async () => {
            const attr = getTabsterAttribute({
                groupper: {},
            });
            const groupperId = "groupper";

            const testHtml = (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <div {...attr} id={groupperId}>
                            <button>Button1</button>
                            <button>Button2</button>
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyOutside)
                .eval(appendElement, groupperId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyOutside)
                .eval(prependElement, groupperId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyOutside);
        });

        it("modalizerAPI", async () => {
            const attr = getTabsterAttribute({
                modalizer: { id: "modalizer" },
            });

            const modalizerOuterId = "modalizer-outer";
            const testHtml = (
                <div
                    id={modalizerOuterId}
                    {...getTabsterAttribute({
                        root: {},
                    })}
                >
                    <div {...attr} aria-label="modalizer">
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    "modalizer-outer"
                )
                .check(checkDummyInside)
                .eval(appendElement, modalizerOuterId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerOuterId
                )
                .check(checkDummyInside)
                .eval(prependElement, modalizerOuterId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerOuterId
                )
                .check(checkDummyInside);
        });

        it.each<["ol" | "ul" | "table"]>([["ol"], ["ul"], ["table"]])(
            "should add dummy inputs outside of the container for <ol>, <ul> and <table>",
            async (tagName) => {
                const attr = getTabsterAttribute({
                    mover: {},
                });
                const containerId = "outside";
                const Tag = tagName;
                const testHtml = (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <div>
                            <Tag {...attr} id={containerId}>
                                <li>
                                    <button>Button1</button>
                                </li>
                                <li>
                                    <button>Button2</button>
                                </li>
                            </Tag>
                        </div>
                    </div>
                );
                await new BroTest.BroTest(testHtml)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyOutside)
                    .eval(appendElement, containerId)
                    .wait(300)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyOutside)
                    .eval(prependElement, containerId)
                    .wait(300)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyOutside);
            }
        );

        it.each<["li" | "td" | "th"]>([["li"], ["td"], ["th"]])(
            "should add dummy inputs inside the container for <li>, <td> and <th>",
            async (tagName) => {
                const attr = getTabsterAttribute({
                    groupper: {
                        tabbability:
                            Types.GroupperTabbabilities.LimitedTrapFocus,
                    },
                });
                const containerId = "inside";
                const Tag = tagName;
                const testHtml = (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <div>
                            <table>
                                <Tag {...attr} id={containerId}>
                                    <button>Button1</button>
                                    <button>Button2</button>
                                </Tag>
                            </table>
                        </div>
                    </div>
                );
                await new BroTest.BroTest(testHtml)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyInside)
                    .eval(appendElement, containerId)
                    .wait(300)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyInside)
                    .eval(prependElement, containerId)
                    .wait(300)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyInside);
            }
        );

        it("should reinsert the dummy input if it's removed for some reason", async () => {
            const attr = getTabsterAttribute({
                groupper: {},
            });
            const groupperId = "groupper";

            const testHtml = (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <div {...attr} id={groupperId}>
                            <button>Button1</button>
                            <button>Button2</button>
                        </div>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyOutside)
                .eval((elementId) => {
                    const current = document.getElementById(
                        elementId
                    ) as HTMLElement;
                    const parent = current.parentNode;
                    const firstDummy =
                        current.previousElementSibling as HTMLElement;
                    parent?.removeChild(firstDummy);
                }, groupperId)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check((res: ReturnType<typeof evaluateDummy>) => {
                    expect(res.first).toBe(false);
                    expect(res.last).toBe(false);
                    expect(res.prev).toBe(false);
                    expect(res.next).toBe(true);
                })
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyOutside)
                .eval((elementId) => {
                    const current = document.getElementById(
                        elementId
                    ) as HTMLElement;
                    const parent = current.parentNode;
                    const lastDummy = current.nextElementSibling as HTMLElement;
                    parent?.removeChild(lastDummy);
                }, groupperId)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check((res: ReturnType<typeof evaluateDummy>) => {
                    expect(res.first).toBe(false);
                    expect(res.last).toBe(false);
                    expect(res.prev).toBe(true);
                    expect(res.next).toBe(false);
                })
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyOutside);
        });

        it("should use enforced dummy input position in Mover", async () => {
            const moverId = "mover";

            const testHtml = (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <div
                            {...getTabsterAttribute({
                                mover: {},
                                // Force inputs out.
                                sys: {
                                    dummyInputsPosition:
                                        Types.SysDummyInputsPositions.Outside,
                                },
                            })}
                            id={moverId}
                        >
                            <button>Button1</button>
                            <button>Button2</button>
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyOutside)
                .eval(insertElementBefore, moverId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyOutside)
                .eval(insertElementAfter, moverId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyOutside);
        });

        it("should use enforced dummy input Groupper", async () => {
            const groupperId = "groupper";

            const testHtml = (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <table
                            {...getTabsterAttribute({
                                groupper: {},
                                // Force inputs in.
                                sys: {
                                    dummyInputsPosition:
                                        Types.SysDummyInputsPositions.Inside,
                                },
                            })}
                            id={groupperId}
                        >
                            <button>Button5</button>
                        </table>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyInside)
                .eval(appendElement, groupperId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyInside)
                .eval(prependElement, groupperId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyInside);
        });

        it("should use enforced dummy input position in Modalizer", async () => {
            const modalizerId = "modalizer";

            const testHtml = (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <div
                            {...getTabsterAttribute({
                                modalizer: { id: "modal" },
                                // Force inputs outside.
                                sys: {
                                    dummyInputsPosition:
                                        Types.SysDummyInputsPositions.Outside,
                                },
                            })}
                            id={modalizerId}
                        >
                            <button>Button6</button>
                        </div>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerId
                )
                .check(checkDummyOutside)
                .eval(insertElementBefore, modalizerId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerId
                )
                .check(checkDummyOutside)
                .eval(insertElementAfter, modalizerId)
                .wait(300)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerId
                )
                .check(checkDummyOutside);
        });
    });

    it("should force dummy inputs position update when the move out functions are called before the async update on DOM change", async () => {
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                </div>
            )
        )
            .eval((dummyAttribute: string) => {
                const rootElement = document.getElementById("root");
                const buttonElement = document.createElement("button");
                buttonElement.textContent = "Button2";

                rootElement?.appendChild(buttonElement);

                const isDummyLast: (boolean | null)[] = [];

                // We've pushed the button to the end of the root element. The dummy
                // input is supposed to be moved after this element, but that normally
                // happens asynchronously.
                isDummyLast.push(
                    rootElement?.lastElementChild
                        ? rootElement.lastElementChild.hasAttribute(
                              dummyAttribute
                          )
                        : null
                );

                const tabster = getTabsterTestVariables().core?.core;

                return new Promise((resolve) => {
                    // Waiting for the dummy inputs to update.
                    setTimeout(() => {
                        if (tabster && rootElement) {
                            isDummyLast.push(
                                rootElement?.lastElementChild
                                    ? rootElement.lastElementChild.hasAttribute(
                                          dummyAttribute
                                      )
                                    : null
                            );
                        }

                        resolve(isDummyLast);
                    }, 200);
                });
            }, Types.TabsterDummyInputAttributeName)
            .check((isDummyLast: (boolean | null)[]) => {
                expect(isDummyLast).toEqual([false, true]);
            });
    });
});
