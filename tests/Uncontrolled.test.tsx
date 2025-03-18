/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, GroupperTabbabilities } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Uncontrolled", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true, groupper: true });
    });

    it("should allow aria-hidden element to be focused", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-hidden="true">Button0</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button aria-hidden="true">Button2</button>
                        <button>Button3</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button0");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should allow custom tab key behaviour", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        id="container"
                        {...getTabsterAttribute({ uncontrolled: {} })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                        <button id="destination">Button4</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "container")
                    ?.addEventListener("keydown", (e) => {
                        if (e.key === "Tab") {
                            e.preventDefault();
                            getTabsterTestVariables()
                                .dom?.getElementById(document, "destination")
                                ?.focus();
                        }
                    });
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should allow to go outside of the application when tabbing and the uncontrolled element is the last", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button aria-hidden="true">Button1</button>
                    <button>Button2</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button3</button>
                        <button>Button4</button>
                    </div>
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
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it("should allow to go outside of the application when tabbing and the uncontrolled element is the last", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button2</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button3</button>
                        <button>Button4</button>
                    </div>
                </div>
            )
        )
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
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it("should allow to go outside of the application when tabbing backwards and the uncontrolled element is first", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <button>Button2</button>
                    </div>
                    <button>Button3</button>
                    <button>Button4</button>
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

    it("should properly ignore disabled elements around the uncontrolled area", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <button disabled>Button2</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                    <button disabled>Button5</button>
                    <button>Button6</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should transparently transit between Movers and Uncontrolled", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <button>Button1</button>
                        <button>Button2</button>
                    </div>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button3</button>
                        <button aria-hidden="true">Button4</button>
                    </div>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it("should properly handle consecutive Uncontrolled", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <button>Button1</button>
                        <button disabled>Button2</button>
                    </div>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button3</button>
                    </div>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button aria-hidden="true">Button4</button>
                    </div>
                    <div>
                        <button disabled>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should properly transition between controlled and uncontrolled areas", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button tabIndex={-1}>Button2</button>
                        <button>Button3</button>
                        <button tabIndex={-1}>Button4</button>
                    </div>
                    <div>
                        <button tabIndex={-1}>Button5</button>
                    </div>
                    <button>Button6</button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should handle Mover inside Uncontrolled", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <div>
                            <div
                                {...getTabsterAttribute({
                                    mover: { memorizeCurrent: true },
                                })}
                            >
                                <button>Mover-Button1</button>
                                <button>Mover-Button2</button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Mover-Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Mover-Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Mover-Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Mover-Button2");
            });
    });

    it("should handle Groupper inside Uncontrolled", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                        <div>
                            <div
                                tabIndex={0}
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.Limited,
                                    },
                                })}
                            >
                                <button>Groupper-Button1</button>
                                <button>Groupper-Button2</button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Groupper-Button1Groupper-Button2"
                );
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Groupper-Button1Groupper-Button2"
                );
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Groupper-Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Groupper-Button2");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Groupper-Button1Groupper-Button2"
                );
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should handle Uncontrolled before, after and in the middle", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button1</button>
                    </div>
                    <div>
                        <ul
                            {...getTabsterAttribute({
                                mover: {},
                            })}
                        >
                            <li
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                        delegated: true,
                                    },
                                })}
                            >
                                <div tabIndex={0}>
                                    <div
                                        {...getTabsterAttribute({
                                            uncontrolled: {},
                                        })}
                                    >
                                        <button>Uncontrolled-Button1</button>
                                    </div>
                                    <button>Groupper-Button1</button>
                                    <button>Groupper-Button2</button>
                                </div>
                            </li>
                            <li
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                        delegated: true,
                                    },
                                })}
                            >
                                <div tabIndex={0}>
                                    <div
                                        {...getTabsterAttribute({
                                            uncontrolled: {},
                                        })}
                                    >
                                        <button>Uncontrolled-Button2</button>
                                    </div>
                                    <button>Groupper-Button3</button>
                                    <button>Groupper-Button4</button>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div {...getTabsterAttribute({ uncontrolled: {} })}>
                        <button>Button2</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Uncontrolled-Button1Groupper-Button1Groupper-Button2"
                );
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Uncontrolled-Button2Groupper-Button3Groupper-Button4"
                );
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Uncontrolled-Button2Groupper-Button3Groupper-Button4"
                );
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Uncontrolled-Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Groupper-Button3");
            });
    });

    it("should properly handle nested Uncontrolled", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div>
                        <button>Button1</button>
                        <button disabled>Button2</button>
                    </div>
                    <div>
                        <ul {...getTabsterAttribute({ uncontrolled: {} })}>
                            <li>
                                <button aria-hidden="true">Button3</button>
                            </li>
                            <li>
                                <button aria-hidden="true">Button4</button>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <ul {...getTabsterAttribute({ uncontrolled: {} })}>
                            <li
                                tabIndex={0}
                                {...getTabsterAttribute({ uncontrolled: {} })}
                            >
                                <button aria-hidden="true">Button5</button>
                                <button aria-hidden="true">Button6</button>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <button disabled>Button7</button>
                        <button>Button8</button>
                    </div>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button8");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should properly handle uncontrolled inside hidden element", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button {...getTabsterAttribute({ uncontrolled: {} })}>
                        Button1
                    </button>
                    <div
                        tabIndex={0}
                        aria-label="modal"
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <button {...getTabsterAttribute({ uncontrolled: {} })}>
                            Button2
                        </button>
                        <button {...getTabsterAttribute({ uncontrolled: {} })}>
                            Button3
                        </button>
                    </div>
                    <div style={{ visibility: "hidden" }}>
                        <button {...getTabsterAttribute({ uncontrolled: {} })}>
                            Button4
                        </button>
                    </div>
                    <button {...getTabsterAttribute({ uncontrolled: {} })}>
                        Button5
                    </button>
                </div>
            )
        )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab()
            .activeElement((el) =>
                expect(el?.textContent).toEqual("Button2Button3")
            )
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toBeUndefined())
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button5"))
            .pressTab(true)
            .activeElement((el) =>
                expect(el?.textContent).toEqual("Button2Button3")
            )
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toEqual("Button1"))
            .pressTab(true)
            .activeElement((el) => expect(el?.textContent).toBeUndefined());
    });
});

describe("Uncontrolled with 3rd party roving tabindex", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({});
    });

    it("should coexist with custom roving tabindex implementation", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button>Button1</button>
                    <div
                        id="roving"
                        {...getTabsterAttribute({ uncontrolled: {} })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                    <button>Button5</button>
                </div>
            )
        )
            .eval(() => {
                // Quick and dirty partial implementation of roving tabindex
                // to test coexistence.
                const roving = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "roving"
                );

                let activeElement: HTMLElement | undefined;

                if (roving) {
                    const updateTabIndex = () => {
                        const buttons =
                            (getTabsterTestVariables().dom?.querySelectorAll(
                                roving,
                                "button, *[tabindex]"
                            ) || []) as HTMLElement[];

                        let hasTabbable: HTMLElement | undefined =
                            activeElement;

                        buttons.forEach((button: HTMLElement) => {
                            if (!hasTabbable && button.tabIndex === 0) {
                                hasTabbable = button;
                            } else if (button !== activeElement) {
                                button.tabIndex = -1;
                            }
                        });

                        if (
                            activeElement &&
                            getTabsterTestVariables().dom?.nodeContains(
                                document.body,
                                activeElement
                            )
                        ) {
                            if (hasTabbable && activeElement !== hasTabbable) {
                                hasTabbable.tabIndex = -1;
                            }
                        } else if (hasTabbable) {
                            activeElement = hasTabbable;
                        } else {
                            activeElement = buttons[0];
                        }

                        if (activeElement && activeElement.tabIndex !== 0) {
                            activeElement.tabIndex = 0;
                        }
                    };

                    const observer =
                        getTabsterTestVariables().dom?.createMutationObserver(
                            (mutations) => {
                                if (
                                    mutations.some(
                                        (m) => m.type !== "attributes"
                                    )
                                ) {
                                    updateTabIndex();
                                }
                            }
                        );

                    if (observer) {
                        observer.observe(roving, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                        });
                    }

                    roving.addEventListener("focusin", (e) => {
                        activeElement = e.target as HTMLElement;
                        updateTabIndex();
                    });

                    roving.addEventListener("keydown", (e) => {
                        if (e.key === "ArrowDown") {
                            const buttons =
                                (getTabsterTestVariables().dom?.querySelectorAll(
                                    roving,
                                    "button"
                                ) || []) as HTMLElement[];

                            const index = Array.prototype.indexOf.call(
                                buttons,
                                e.target
                            );

                            if (index < buttons.length - 1) {
                                activeElement = buttons[index + 1];
                                buttons[index + 1].focus();
                            }
                        }
                    });
                }
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });
});

describe("Uncontrolled with 3rd party focus trap", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should coexist with custom focus trap implementation, using checkUncontrolledCompletely() callback", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        id="trap1"
                        {...getTabsterAttribute({ uncontrolled: {} })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <button id="button-4">Button4</button>
                    <div
                        id="trap2"
                        {...getTabsterAttribute({ uncontrolled: {} })}
                    >
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                getTabsterTestVariables().createTabster?.(window, {
                    checkUncontrolledCompletely: (e) =>
                        e.id === "trap1" || e.id === "trap2",
                });

                const trapFocus = (parentId: string) => {
                    const parent =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            parentId
                        );

                    if (parent) {
                        parent.addEventListener("keydown", (e) => {
                            if (e.key === "Tab") {
                                const buttons =
                                    (getTabsterTestVariables().dom?.querySelectorAll(
                                        parent,
                                        "button, *[tabindex]"
                                    ) || []) as HTMLElement[];
                                const index = Array.prototype.indexOf.call(
                                    buttons,
                                    getTabsterTestVariables().dom?.getActiveElement(
                                        document
                                    )
                                );

                                if (index >= 0) {
                                    if (index === 0 && e.shiftKey) {
                                        e.preventDefault();
                                        buttons[buttons.length - 1].focus();
                                    } else if (
                                        index === buttons.length - 1 &&
                                        !e.shiftKey
                                    ) {
                                        e.preventDefault();
                                        buttons[0].focus();
                                    }
                                }
                            }
                        });
                    }
                };

                trapFocus("trap1");
                trapFocus("trap2");
            })
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .focusElement("#button-4")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            });
    });

    it("should coexist with custom focus trap implementation, using completely property", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        id="trap1"
                        {...getTabsterAttribute({
                            uncontrolled: { completely: true },
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <button id="button-4">Button4</button>
                    <div
                        id="trap2"
                        {...getTabsterAttribute({
                            uncontrolled: { completely: true },
                        })}
                    >
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
            )
        )
            .eval(() => {
                getTabsterTestVariables().createTabster?.(window, {});

                const trapFocus = (parentId: string) => {
                    const parent =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            parentId
                        );

                    if (parent) {
                        parent.addEventListener("keydown", (e) => {
                            if (e.key === "Tab") {
                                const buttons =
                                    (getTabsterTestVariables().dom?.querySelectorAll(
                                        parent,
                                        "button, *[tabindex]"
                                    ) || []) as HTMLElement[];
                                const index = Array.prototype.indexOf.call(
                                    buttons,
                                    getTabsterTestVariables().dom?.getActiveElement(
                                        document
                                    )
                                );

                                if (index >= 0) {
                                    if (index === 0 && e.shiftKey) {
                                        e.preventDefault();
                                        buttons[buttons.length - 1].focus();
                                    } else if (
                                        index === buttons.length - 1 &&
                                        !e.shiftKey
                                    ) {
                                        e.preventDefault();
                                        buttons[0].focus();
                                    }
                                }
                            }
                        });
                    }
                };

                trapFocus("trap1");
                trapFocus("trap2");
            })
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .focusElement("#button-4")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            });
    });

    it("should coexist with custom focus trap implementation, using checkUncontrolledCompletely() callback and completely property defaulting to the property when the callback returns undefined", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <button id="button-1">Button1</button>
                    <div
                        id="trap1"
                        {...getTabsterAttribute({ uncontrolled: {} })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <button id="button-4">Button4</button>
                    <div
                        id="trap2"
                        {...getTabsterAttribute({
                            uncontrolled: { completely: true },
                        })}
                    >
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                    <button id="button-7">Button7</button>
                    <div
                        id="trap3"
                        {...getTabsterAttribute({
                            uncontrolled: { completely: false },
                        })}
                    >
                        <button>Button8</button>
                        <button>Button9</button>
                    </div>
                    <button id="button-10">Button10</button>
                    <div
                        id="no-trap4"
                        {...getTabsterAttribute({
                            uncontrolled: { completely: true },
                        })}
                    >
                        <button>Button11</button>
                        <button>Button12</button>
                    </div>
                    <button id="button-13">Button13</button>
                </div>
            )
        )
            .eval(() => {
                getTabsterTestVariables().createTabster?.(window, {
                    checkUncontrolledCompletely: (e) => {
                        switch (true) {
                            case e.id === "trap1":
                                return true;
                            case e.id === "trap2":
                                return undefined;
                            case e.id === "trap3":
                                return true;
                            case e.id === "no-trap4":
                                return false;
                            default:
                                return undefined;
                        }
                    },
                });

                const trapFocus = (parentId: string) => {
                    const parent =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            parentId
                        );

                    if (parent) {
                        parent.addEventListener("keydown", (e) => {
                            if (e.key === "Tab") {
                                const buttons =
                                    (getTabsterTestVariables().dom?.querySelectorAll(
                                        parent,
                                        "button, *[tabindex]"
                                    ) || []) as HTMLElement[];
                                const index = Array.prototype.indexOf.call(
                                    buttons,
                                    getTabsterTestVariables().dom?.getActiveElement(
                                        document
                                    )
                                );

                                if (index >= 0) {
                                    if (index === 0 && e.shiftKey) {
                                        e.preventDefault();
                                        buttons[buttons.length - 1].focus();
                                    } else if (
                                        index === buttons.length - 1 &&
                                        !e.shiftKey
                                    ) {
                                        e.preventDefault();
                                        buttons[0].focus();
                                    }
                                }
                            }
                        });
                    }
                };

                trapFocus("trap1");
                trapFocus("trap2");
                trapFocus("trap3");
                trapFocus("no-trap4");
            })
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .focusElement("#button-4")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .focusElement("#button-7")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button7");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button8");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button9");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button8");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button9");
            })
            .focusElement("#button-10")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button10");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button11");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button12");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button13");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button12");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button11");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button10");
            });
    });
});
