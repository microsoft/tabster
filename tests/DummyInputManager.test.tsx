/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import * as BroTest from "./utils/BroTest";
import { runIfUnControlled } from "./utils/test-utils";

runIfUnControlled("DummyInputManager", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
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
            const mover = document.getElementById(elementId) as HTMLElement;
            const newElement = document.createElement("button");
            newElement.textContent = "New element append";
            mover.appendChild(newElement);
        };

        const prependElement = (elementId: string) => {
            const mover = document.getElementById(elementId) as HTMLElement;
            const newElement = document.createElement("button");
            newElement.textContent = "New element prepend";
            mover.prepend(newElement);
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
                <div>
                    <div {...attr} id={moverId}>
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
                    moverId
                )
                .check(checkDummyInside)
                .eval(appendElement, moverId)
                .wait(1)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    moverId
                )
                .check(checkDummyInside)
                .eval(prependElement, moverId)
                .wait(1)
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
                <div>
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
                .pressTab()
                .activeElement((el) => expect(el?.textContent).toBe("Button2"))
                .pressDown()
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
                <div>
                    <div {...attr} id={groupperId}>
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
                    groupperId
                )
                .check(checkDummyInside)
                .eval(appendElement, groupperId)
                .wait(1)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyInside)
                .eval(prependElement, groupperId)
                .wait(1)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    groupperId
                )
                .check(checkDummyInside);
        });

        it("modalizerAPI", async () => {
            const attr = getTabsterAttribute({
                modalizer: { id: "modalizer" },
            });

            const modalizerAPIId = "modalizerAPI";

            const testHtml = (
                <div>
                    <div {...attr}>
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                </div>
            );

            await new BroTest.BroTest(testHtml)
                .eval((modalizerAPIId) => {
                    document.body.setAttribute("id", modalizerAPIId);
                }, modalizerAPIId)
                .wait(1)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerAPIId
                )
                .check(checkDummyInside)
                .eval(appendElement, modalizerAPIId)
                .wait(1)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerAPIId
                )
                .check(checkDummyInside)
                .eval(prependElement, modalizerAPIId)
                .wait(1)
                .eval(
                    evaluateDummy,
                    Types.TabsterDummyInputAttributeName,
                    modalizerAPIId
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
                );
                await new BroTest.BroTest(testHtml)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyOutside)
                    .eval(appendElement, containerId)
                    .wait(1)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyOutside)
                    .eval(prependElement, containerId)
                    .wait(1)
                    .eval(
                        evaluateDummy,
                        Types.TabsterDummyInputAttributeName,
                        containerId
                    )
                    .check(checkDummyOutside);
            }
        );
    });
});
