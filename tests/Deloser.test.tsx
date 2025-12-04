/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    GroupperTabbabilities,
    TABSTER_ATTRIBUTE_NAME,
} from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Deloser", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ deloser: true, groupper: true });
    });

    it("should restore focus", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                <button>Button1</button>
                <button>Button2</button>
                <button>Button3</button>
                <button>Button4</button>
            </div>
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .removeElement()
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            });
    });

    it("should not restore focus if focus is not inside the deloser", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div {...getTabsterAttribute({ deloser: {} })}>
                    <button>Button1</button>
                </div>
                <button>Button2</button>
            </div>
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .removeElement()
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            });
    });

    it("should not restore focus by deloser history", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button {...getTabsterAttribute({ deloser: {} })}>
                    Button1
                </button>
                <button {...getTabsterAttribute({ deloser: {} })}>
                    Button2
                </button>
            </div>
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .removeElement()
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should be activated immediately if focus is inside", async () => {
        const tabsterAttr = getTabsterAttribute(
            {
                deloser: {},
            },
            true
        ) as string;
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button {...getTabsterAttribute({ deloser: {} })}>
                    Button1
                </button>
                <button id="newDeloser">Button2</button>
            </div>
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .eval(
                (attrName, tabsterAttr) => {
                    const newDeloser =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            "newDeloser"
                        );
                    newDeloser?.setAttribute(attrName, tabsterAttr);
                },
                TABSTER_ATTRIBUTE_NAME,
                tabsterAttr
            )
            .removeElement("#newDeloser")
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should restore focus in the middle of a limited groupper", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {}, deloser: {} })}>
                <div
                    tabIndex={0}
                    {...getTabsterAttribute({
                        groupper: {
                            tabbability: GroupperTabbabilities.LimitedTrapFocus,
                        },
                    })}
                >
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                </div>
                <div
                    tabIndex={0}
                    {...getTabsterAttribute({
                        groupper: {
                            tabbability: GroupperTabbabilities.LimitedTrapFocus,
                        },
                    })}
                >
                    <button className="button-4">Button4</button>
                    <button className="button-5">Button5</button>
                    <button className="button-6">Button6</button>
                </div>
            </div>
        )
            .pressTab()
            .pressTab()
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
            .removeElement()
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });

    it("should restore focus in <form> with named inputs", async () => {
        await new BroTest.BroTest(
            <form {...getTabsterAttribute({ root: {}, deloser: {} })}>
                <button>Button1</button>
                <input name="id" />
                <button>Button2</button>
            </form>
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.attributes.name).toEqual("id");
            })
            .removeElement()
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });
});

describe("Deloser created lazily", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should add currently focused element to the Deloser history if Deloser is created after the focus", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div>
                    <button
                        id="button1"
                        {...getTabsterAttribute({ deloser: {} })}
                    >
                        Button1
                    </button>
                </div>
                <div id="second">
                    <button
                        id="button2"
                        {...getTabsterAttribute({ deloser: {} })}
                    >
                        Button2
                    </button>
                </div>
            </div>
        )
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval(() => {
                const vars = getTabsterTestVariables();
                const tabster = vars.createTabster?.(window);

                if (tabster) {
                    vars.getDeloser?.(tabster);
                }
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .eval(() => {
                const el = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "second"
                );
                el?.parentNode?.removeChild(el);
            })
            .wait(500)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });
});

describe("Deloser with manual strategy", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ deloser: true });
    });

    it("should not restore focus automatically", async () => {
        await new BroTest.BroTest(
            <div
                id="deloser"
                {...getTabsterAttribute({
                    root: {},
                    deloser: { strategy: 1 },
                })}
            >
                <button>Button1</button>
                <button>Button2</button>
                <button>Button3</button>
                <button>Button4</button>
            </div>
        )
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .removeElement()
            .wait(300)
            .activeElement((el) => expect(el?.textContent).toEqual(undefined))
            .eval(() => {
                const vars = getTabsterTestVariables();
                const Events = vars.Events;
                Events &&
                    vars.dom
                        ?.getElementById(document, "deloser")
                        ?.dispatchEvent(new Events.DeloserRestoreFocusEvent());
            })
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            });
    });
});

describe("Deloser events", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ deloser: true });
    });

    interface WindowWithDeloserEvents extends Window {
        __deloserEvents?: string[];
    }

    it("should dispatch tabster:movefocus that is preventable", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="deloser" {...getTabsterAttribute({ deloser: {} })}>
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                    <button>Button4</button>
                </div>

                <div id="deloser2" {...getTabsterAttribute({ deloser: {} })}>
                    <button>Button5</button>
                    <button>Button6</button>
                    <button>Button7</button>
                    <button>Button8</button>
                </div>
            </div>
        )
            .eval(() => {
                const Events = getTabsterTestVariables().Events;
                (window as WindowWithDeloserEvents).__deloserEvents = [];

                if (Events) {
                    document.addEventListener(
                        Events.TabsterMoveFocusEventName,
                        (e) => {
                            if (e.detail.by !== "deloser") {
                                return;
                            }

                            (
                                window as WindowWithDeloserEvents
                            ).__deloserEvents?.push(
                                e.type + " " + e.detail.next?.textContent
                            );

                            if (
                                e.detail.next?.textContent === "Button7" ||
                                e.detail.next?.textContent === "Button4"
                            ) {
                                e.preventDefault();
                            }
                        }
                    );
                }
            })
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .removeElement()
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab()
            .pressTab()
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button6");
            })
            .removeElement()
            .wait(300)
            .activeElement((el) => expect(el?.textContent).toEqual(undefined))
            .eval(() => {
                const vars = getTabsterTestVariables();
                const Events = vars.Events;
                Events &&
                    vars.dom
                        ?.getElementById(document, "deloser2")
                        ?.dispatchEvent(new Events.DeloserRestoreFocusEvent());
            })
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            })
            .removeElement("#deloser2")
            .wait(300)
            .activeElement((el) => expect(el?.textContent).toEqual(undefined))
            .eval(() => (window as WindowWithDeloserEvents).__deloserEvents)
            .check((events: string[]) => {
                expect(events).toEqual([
                    "tabster:movefocus Button3",
                    "tabster:movefocus Button7",
                    "tabster:movefocus Button4",
                ]);
            })
            .eval(() => {
                const vars = getTabsterTestVariables();
                const Events = vars.Events;
                Events &&
                    vars.dom
                        ?.getElementById(document, "deloser")
                        ?.dispatchEvent(new Events.DeloserRestoreFocusEvent());
            })
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            });
    });
});
