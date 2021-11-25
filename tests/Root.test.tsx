/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterAttribute, Types as TabsterTypes } from "../src";
import * as BroTest from "./utils/BroTest";
import { runIfControlled, WindowWithTabsterInternal } from "./utils/test-utils";

interface WindowWithTabsterInternalAndFocusState
    extends WindowWithTabsterInternal {
    __tabsterFocusedRoot?: {
        events: {
            elementId?: string;
            type: "focus" | "blur";
            fromAdjacent?: boolean;
        }[];
    };
}

runIfControlled("Root", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should insert dummy inputs as first and last children", async () => {
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <button>Button</button>
                </div>
            )
        )
            .eval((dummyAttribute) => {
                return document.querySelectorAll(`[${dummyAttribute}]`).length;
            }, TabsterTypes.TabsterDummyInputAttributeName)
            .check((dummyCount: number) => {
                expect(dummyCount).toBe(2);
            })
            .eval((dummyAttribute) => {
                const first = document
                    .getElementById("root")
                    ?.children[0].hasAttribute(dummyAttribute);
                const second = document
                    .getElementById("root")
                    ?.children[2].hasAttribute(dummyAttribute);
                return first && second;
            }, TabsterTypes.TabsterDummyInputAttributeName)
            .check((areFirstAndLast: boolean) => {
                expect(areFirstAndLast).toBe(true);
            });
    });

    it("should allow to go outside of the application when tabbing forward", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it("should allow to go outside of the application when tabbing backwards", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should trigger root focus events", async () => {
        await new BroTest.BroTest(
            (
                <div id="root" {...getTabsterAttribute({ root: {} })}>
                    <button id="button1">Button1</button>
                    <button>Button2</button>
                </div>
            )
        )
            .eval(() => {
                const win =
                    window as unknown as WindowWithTabsterInternalAndFocusState;

                const focusedRoot: WindowWithTabsterInternalAndFocusState["__tabsterFocusedRoot"] =
                    (win.__tabsterFocusedRoot = {
                        events: [],
                    });

                const tabster = win.__tabsterInstance;

                tabster.root.eventTarget.addEventListener(
                    "focus",
                    (
                        e: TabsterTypes.TabsterEventWithDetails<TabsterTypes.RootFocusEventDetails>
                    ) => {
                        if (e.details.element.id) {
                            focusedRoot.events.push({
                                elementId: e.details.element.id,
                                type: "focus",
                                fromAdjacent: e.details.fromAdjacent,
                            });
                        }
                    }
                );

                tabster.root.eventTarget.addEventListener(
                    "blur",
                    (
                        e: TabsterTypes.TabsterEventWithDetails<TabsterTypes.RootFocusEventDetails>
                    ) => {
                        if (e.details.element.id) {
                            focusedRoot.events.push({
                                elementId: e.details.element.id,
                                type: "blur",
                                fromAdjacent: e.details.fromAdjacent,
                            });
                        }
                    }
                );
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval(() => {
                return (
                    window as unknown as WindowWithTabsterInternalAndFocusState
                ).__tabsterFocusedRoot;
            })
            .check(
                (
                    res: WindowWithTabsterInternalAndFocusState["__tabsterFocusedRoot"]
                ) => {
                    expect(res).toEqual({
                        events: [
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                        ],
                    });
                }
            )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .eval(() => {
                return (
                    window as unknown as WindowWithTabsterInternalAndFocusState
                ).__tabsterFocusedRoot;
            })
            .check(
                (
                    res: WindowWithTabsterInternalAndFocusState["__tabsterFocusedRoot"]
                ) => {
                    expect(res).toEqual({
                        events: [
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "blur",
                            },
                        ],
                    });
                }
            )
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .eval(() => {
                return (
                    window as unknown as WindowWithTabsterInternalAndFocusState
                ).__tabsterFocusedRoot;
            })
            .check(
                (
                    res: WindowWithTabsterInternalAndFocusState["__tabsterFocusedRoot"]
                ) => {
                    expect(res).toEqual({
                        events: [
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "blur",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                        ],
                    });
                }
            )
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab(true)
            .eval(() => {
                return (
                    window as unknown as WindowWithTabsterInternalAndFocusState
                ).__tabsterFocusedRoot;
            })
            .check(
                (
                    res: WindowWithTabsterInternalAndFocusState["__tabsterFocusedRoot"]
                ) => {
                    expect(res).toEqual({
                        events: [
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "blur",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "blur",
                            },
                        ],
                    });
                }
            )
            .eval(() => {
                document.getElementById("button1")?.focus();
                return (
                    window as unknown as WindowWithTabsterInternalAndFocusState
                ).__tabsterFocusedRoot;
            })
            .check(
                (
                    res: WindowWithTabsterInternalAndFocusState["__tabsterFocusedRoot"]
                ) => {
                    expect(res).toEqual({
                        events: [
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "blur",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "focus",
                            },
                            {
                                elementId: "root",
                                fromAdjacent: true,
                                type: "blur",
                            },
                            { elementId: "root", type: "focus" },
                        ],
                    });
                }
            );
    });
});
