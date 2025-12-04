/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    GroupperTabbabilities,
    MoverDirections,
    Types,
    Visibilities,
} from "tabster";
import * as BroTest from "./utils/BroTest";

describe("MoverGroupper", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true, groupper: true });
    });

    it.each<[string, Types.GroupperTabbability | undefined]>([
        ["Limited", GroupperTabbabilities.Limited],
        ["LimitedTrapFocus", GroupperTabbabilities.LimitedTrapFocus],
        ["Unlimited", GroupperTabbabilities.Unlimited],
        ["undefined", undefined],
    ])(
        "should properly move the focus when focusable grouppers with %s tabbability are in mover",
        async (_, tabbability) => {
            let broTest = new BroTest.BroTest(
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: { tabbability },
                            })}
                        >
                            <button>Button1</button>
                            <button>Button2</button>
                        </div>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: { tabbability },
                            })}
                        >
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: { tabbability },
                            })}
                        >
                            <button>Button5</button>
                            <button>Button6</button>
                        </div>
                    </div>
                    <button>Button7</button>
                </div>
            )
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1Button2");
                })
                .pressDown()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3Button4");
                })
                .pressDown()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button5Button6");
                })
                .pressUp()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3Button4");
                })
                .pressUp()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1Button2");
                })
                .pressTab();

            if (!tabbability) {
                broTest = broTest
                    .activeElement((el) => {
                        expect(el?.textContent).toEqual("Button1");
                    })
                    .pressTab()
                    .activeElement((el) => {
                        expect(el?.textContent).toEqual("Button2");
                    })
                    .pressTab();
            }

            broTest = broTest.activeElement((el) => {
                expect(el?.textContent).toEqual("Button7");
            });

            await broTest;
        }
    );

    it.each<[string, Types.GroupperTabbability | undefined]>([
        ["Limited", GroupperTabbabilities.Limited],
        ["LimitedTrapFocus", GroupperTabbabilities.LimitedTrapFocus],
        ["Unlimited", GroupperTabbabilities.Unlimited],
        ["undefined", undefined],
    ])(
        "should properly move the focus when not focusable grouppers with %s tabbability are in mover",
        async (_, tabbability) => {
            let test = new BroTest.BroTest(
                <div {...getTabsterAttribute({ root: {} })}>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <div
                            {...getTabsterAttribute({
                                groupper: { tabbability },
                            })}
                        >
                            <button>Button1</button>
                        </div>
                        <div
                            {...getTabsterAttribute({
                                groupper: { tabbability },
                            })}
                        >
                            <button>Button2</button>
                        </div>
                        <div
                            {...getTabsterAttribute({
                                groupper: { tabbability },
                            })}
                        >
                            <button>Button3</button>
                        </div>
                    </div>
                    <button>Button4</button>
                </div>
            )
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                })
                .pressDown()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressDown()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button3");
                })
                .pressUp()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button2");
                })
                .pressUp()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });

            if (tabbability === GroupperTabbabilities.LimitedTrapFocus) {
                test = test.pressEsc();
            }

            test = test.pressTab().activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });

            await test;
        }
    );

    it("should move between grouppers inside mover with dynamically appearing first focusable", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <style>{`.groupper .hidden { display: none; } .groupper:focus-within .hidden { display: inline; }`}</style>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <div
                        className="groupper"
                        {...getTabsterAttribute({ groupper: {} })}
                    >
                        <button className="hidden">Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <div
                        className="groupper"
                        {...getTabsterAttribute({ groupper: {} })}
                    >
                        <button className="hidden">Button4</button>
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
                <button>Button7</button>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button7");
            });
    });

    it("should move between grouppers with focusable container inside mover with dynamically appearing first focusable", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <style>
                    {".groupper .hidden { display: none; }"}
                    {".groupper:focus-within .hidden { display: inline; }"}
                </style>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <div
                        tabIndex={0}
                        className="groupper"
                        {...getTabsterAttribute({ groupper: {} })}
                    >
                        <button className="hidden">Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <div
                        tabIndex={0}
                        className="groupper"
                        {...getTabsterAttribute({ groupper: {} })}
                    >
                        <button className="hidden">Button4</button>
                        <button>Button5</button>
                        <button>Button6</button>
                    </div>
                </div>
                <button>Button7</button>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
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
                expect(el?.textContent).toEqual("Button7");
            });
    });

    it("should ignore uncontrolled inside groupper", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <div>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <div
                                {...getTabsterAttribute({
                                    uncontrolled: {},
                                })}
                            >
                                <button>Button1</button>
                                <button>Button2</button>
                            </div>
                            <button>Button3</button>
                        </div>
                    </div>
                    <div>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button
                                {...getTabsterAttribute({
                                    uncontrolled: {},
                                })}
                            >
                                Button4
                            </button>
                            <button>Button5</button>
                            <button>Button6</button>
                        </div>
                    </div>
                </div>
                <button>Button7</button>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button7");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should ignore uncontrolled inside groupper with no tabindex on the container", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <style>
                    {".groupper .hidden { display: none; }"}
                    {".groupper:focus-within .hidden { display: inline; }"}
                </style>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <div
                        className="groupper"
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div tabIndex={0}>
                            <div
                                className="hidden"
                                {...getTabsterAttribute({
                                    uncontrolled: {},
                                })}
                            >
                                <button>Button1</button>
                                <button>Button2</button>
                            </div>
                            <button>Button3</button>
                        </div>
                    </div>
                    <div
                        className="groupper"
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div tabIndex={0}>
                            <div
                                className="hidden"
                                {...getTabsterAttribute({
                                    uncontrolled: {},
                                })}
                            >
                                <button>Button4</button>
                                <button>Button5</button>
                            </div>
                            <button>Button6</button>
                        </div>
                    </div>
                </div>
                <button>Button7</button>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
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
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should move properly in the nested mover/groupper/mover scenario", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div {...getTabsterAttribute({ mover: {} })}>
                            <button>Button1</button>
                            <button>Button2</button>
                            <button>Button3</button>
                        </div>
                    </div>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div {...getTabsterAttribute({ mover: {} })}>
                            <button>Button4</button>
                            <button>Button5</button>
                            <button>Button6</button>
                        </div>
                    </div>
                </div>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            });
    });

    it("should move properly in the nested mover/groupper/mover/groupper/mover scenario", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div {...getTabsterAttribute({ mover: {} })}>
                            <div
                                tabIndex={0}
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                    },
                                })}
                            >
                                <div {...getTabsterAttribute({ mover: {} })}>
                                    <button>Button1</button>
                                    <button>Button2</button>
                                    <button>Button3</button>
                                </div>
                            </div>
                            <div
                                tabIndex={0}
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                    },
                                })}
                            >
                                <div {...getTabsterAttribute({ mover: {} })}>
                                    <button>Button4</button>
                                    <button>Button5</button>
                                    <button>Button6</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div {...getTabsterAttribute({ mover: {} })}>
                            <div
                                tabIndex={0}
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                    },
                                })}
                            >
                                <div {...getTabsterAttribute({ mover: {} })}>
                                    <button>Button7</button>
                                    <button>Button8</button>
                                    <button>Button9</button>
                                </div>
                            </div>
                            <div
                                tabIndex={0}
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                    },
                                })}
                            >
                                <div {...getTabsterAttribute({ mover: {} })}>
                                    <button>Button10</button>
                                    <button>Button11</button>
                                    <button>Button12</button>
                                </div>
                                <div
                                    {...getTabsterAttribute({
                                        uncontrolled: {},
                                    })}
                                >
                                    <button>Button13</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button1Button2Button3Button4Button5Button6"
                );
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button7Button8Button9Button10Button11Button12Button13"
                );
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button1Button2Button3Button4Button5Button6"
                );
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button1Button2Button3Button4Button5Button6"
                );
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button7Button8Button9Button10Button11Button12Button13"
                );
            });
    });

    it("should handle another mover/groupper/mover/groupper scenario", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <ul
                    {...getTabsterAttribute({
                        mover: {
                            visibilityAware: Visibilities.PartiallyVisible,
                        },
                    })}
                >
                    <li
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div
                            {...getTabsterAttribute({
                                mover: {
                                    visibilityAware:
                                        Visibilities.PartiallyVisible,
                                },
                            })}
                        >
                            <div
                                tabIndex={0}
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                    },
                                })}
                            >
                                <button>Button1</button>
                                <button>Button2</button>
                            </div>
                            <button>Button3</button>
                        </div>
                    </li>
                    <li
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div
                            {...getTabsterAttribute({
                                mover: {
                                    visibilityAware:
                                        Visibilities.PartiallyVisible,
                                },
                            })}
                        >
                            <div
                                tabIndex={0}
                                {...getTabsterAttribute({
                                    groupper: {
                                        tabbability:
                                            GroupperTabbabilities.LimitedTrapFocus,
                                    },
                                })}
                            >
                                <button>Button4</button>
                                <button>Button5</button>
                            </div>
                            <button>Button6</button>
                        </div>
                    </li>
                </ul>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4Button5Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2");
            });
    });

    it("should handle tabbing in groupper/mover/groupper when the inner groupper container is not focusable", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button>Button1</button>
                <div
                    id="outer-groupper"
                    tabIndex={0}
                    {...getTabsterAttribute({
                        groupper: {
                            tabbability: GroupperTabbabilities.LimitedTrapFocus,
                        },
                    })}
                >
                    <button>Button2</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                visibilityAware: Visibilities.PartiallyVisible,
                            },
                        })}
                    >
                        <button>Button3</button>
                        <div
                            id="inner-groupper"
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                                focusable: {
                                    ignoreKeydown: { Escape: true },
                                },
                            })}
                        >
                            <button>Button4</button>
                            <button>Button5</button>
                        </div>
                    </div>
                    <button>Button6</button>
                </div>
                <button>Button7</button>
            </div>
        )
            .eval(() => {
                window.addEventListener("keydown", (e) => {
                    const innerGroupper =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            "inner-groupper"
                        );

                    if (
                        e.key === "Escape" &&
                        innerGroupper?.contains(
                            e.composedPath()[0] as HTMLElement
                        )
                    ) {
                        getTabsterTestVariables()
                            .dom?.getElementById(document, "outer-groupper")
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
                expect(el?.textContent).toEqual(
                    "Button2Button3Button4Button5Button6"
                );
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button7");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button2Button3Button4Button5Button6"
                );
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button2Button3Button4Button5Button6"
                );
            });
    });

    it("should handle tabbing in groupper/mover/groupper when the inner groupper container is delegated and not focusable", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button>Button1</button>
                <div
                    id="outer-groupper"
                    tabIndex={0}
                    {...getTabsterAttribute({
                        groupper: {
                            tabbability: GroupperTabbabilities.LimitedTrapFocus,
                        },
                    })}
                >
                    <button>Button2</button>
                    <div
                        {...getTabsterAttribute({
                            mover: {
                                visibilityAware: Visibilities.PartiallyVisible,
                            },
                        })}
                    >
                        <button>Button3</button>
                        <div
                            id="inner-groupper"
                            {...getTabsterAttribute({
                                groupper: {
                                    delegated: true,
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>Button4</button>
                            <button>Button5</button>
                        </div>
                    </div>
                    <button>Button6</button>
                </div>
                <button>Button7</button>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button2Button3Button4Button5Button6"
                );
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button7");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button2Button3Button4Button5Button6"
                );
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
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
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual(
                    "Button2Button3Button4Button5Button6"
                );
            });
    });

    it("should move properly in the nested mover/groupper/groupper scenario", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>Button1</button>
                            <button>Button2</button>
                        </div>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                    </div>
                    <button>Button5</button>
                </div>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3Button4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3Button4");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3Button4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should move properly in the nested mover/mover/groupper scenario", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div {...getTabsterAttribute({ mover: {} })}>
                    <button>Button1</button>
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        GroupperTabbabilities.LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>Button2</button>
                            <button>Button3</button>
                        </div>
                        <button>Button5</button>
                    </div>
                    <button>Button6</button>
                </div>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressEnter()
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
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            });
    });

    it("should move properly in the nested groupper/mover/mover scenario", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div
                    tabIndex={0}
                    {...getTabsterAttribute({
                        groupper: {
                            tabbability: GroupperTabbabilities.LimitedTrapFocus,
                        },
                    })}
                >
                    <div {...getTabsterAttribute({ mover: {} })}>
                        <button>Button1</button>
                        <div {...getTabsterAttribute({ mover: {} })}>
                            <button>Button2</button>
                            <button>Button3</button>
                        </div>
                        <button>Button4</button>
                    </div>
                </div>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3Button4");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2Button3Button4");
            });
    });

    it("should properly handle groupper and mover on the same element", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div
                    {...getTabsterAttribute({
                        mover: {},
                    })}
                >
                    <button>Button1</button>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                            mover: {},
                        })}
                    >
                        <button>Button2</button>
                        <button>Button3</button>
                    </div>
                    <button>Button4</button>
                </div>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            });
    });

    it("should handle nested movers when the inner mover is on focusable element", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button id="foo">Foo</button>
                <div
                    {...getTabsterAttribute({
                        mover: {
                            memorizeCurrent: true,
                            direction: MoverDirections.Vertical,
                        },
                    })}
                >
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Horizontal,
                                cyclic: true,
                            },
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                    </div>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Horizontal,
                                cyclic: true,
                            },
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            mover: {
                                direction: MoverDirections.Horizontal,
                                cyclic: true,
                            },
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <button>Button5</button>
                        <button id="button6">Button6</button>
                    </div>
                </div>
                <button>Bar</button>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Foo");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1Button2");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Bar");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Foo");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3Button4");
            })
            .pressEnter()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressRight()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Bar");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3Button4");
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "button6")
                    ?.focus();
            })
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "foo")
                    ?.focus();
            })
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Foo");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5Button6");
            });
    });
});
