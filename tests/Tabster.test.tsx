/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute, Types } from "tabster";
import { WindowWithTabsterInstance } from "../src/Root";
import * as BroTest from "./utils/BroTest";

interface WindowWithTabster extends Window {
    __tabsterInstance?: Types.TabsterCore;
}

interface NodeWithVirtualParent extends Node {
    _virtual: {
        parent?: Node;
    };
}

describe("Tabster dispose", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({});
    });

    it("should set getParent prop on first creation", async () => {
        const parentId = "parent";
        await new BroTest.BroTest(<div />)
            .eval((id) => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const parent = document.createElement("div");
                parent.id = id;
                getTabsterTestVariables().createTabster?.(window, {
                    getParent: () => parent,
                });

                const tabsterInstance = (window as unknown as WindowWithTabster)
                    .__tabsterInstance as unknown as Types.TabsterCore;

                const parentResult = tabsterInstance.getParent(
                    document.createElement("div")
                ) as HTMLElement | null;
                return parentResult?.id;
            }, parentId)
            .check((id) => {
                expect(id).toEqual(parentId);
            });
    });

    it("should set getParent prop on latest creation", async () => {
        const first = "first";
        const second = "second";
        await new BroTest.BroTest(<div />)
            .eval((id) => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();

                const parent = document.createElement("div");
                parent.id = id;
                getTabsterTestVariables().createTabster?.(window, {
                    getParent: () => parent,
                });
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return window.__tabsterInstance.getParent().id;
            }, first)
            .check((id) => {
                expect(id).toEqual(first);
            })
            .eval((id) => {
                const parent = document.createElement("div");
                parent.id = id;
                getTabsterTestVariables().createTabster?.(window, {
                    getParent: () => parent,
                });

                const tabsterInstance = (window as unknown as WindowWithTabster)
                    .__tabsterInstance as unknown as Types.TabsterCore;

                const parentResult = tabsterInstance.getParent(
                    document.createElement("div")
                ) as HTMLElement | null;
                return parentResult?.id;
            }, second)
            .check((id) => {
                expect(id).toEqual(second);
            });
    });

    it("should support virtual parents with getParent", async () => {
        const parentId = "parent";
        await new BroTest.BroTest(<div />)
            .eval((id) => {
                function isVirtualElement(
                    element: Node
                ): element is NodeWithVirtualParent {
                    // eslint-disable-next-line no-prototype-builtins
                    return element && element.hasOwnProperty("_virtual");
                }

                function getVirtualParent(child: Node): Node | null {
                    return isVirtualElement(child)
                        ? child._virtual.parent || null
                        : null;
                }
                function setVirtualParent(child: Node, parent?: Node): void {
                    const virtualChild = child;

                    if (
                        !(virtualChild as unknown as NodeWithVirtualParent)
                            ._virtual
                    ) {
                        (
                            virtualChild as unknown as NodeWithVirtualParent
                        )._virtual = {};
                    }

                    (
                        virtualChild as unknown as NodeWithVirtualParent
                    )._virtual.parent = parent;
                }

                function getParent(child: Node | null): Node | null {
                    if (!child) {
                        return null;
                    }

                    const virtualParent = getVirtualParent(child);

                    if (virtualParent) {
                        return virtualParent;
                    }

                    return null;
                }

                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const child = document.createElement("div");
                const parent = document.createElement("div");
                parent.id = id;

                setVirtualParent(child, parent);
                getTabsterTestVariables().createTabster?.(window, {
                    getParent,
                });

                const tabsterInstance = (window as unknown as WindowWithTabster)
                    .__tabsterInstance as unknown as Types.TabsterCore;
                const parentResult = tabsterInstance.getParent(
                    child
                ) as HTMLElement | null;
                return parentResult?.id;
            }, parentId)
            .check((id) => {
                expect(id).toEqual(parentId);
            });
    });

    it("should not dispose global tabster core if there are still tabster instances", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const first = getTabsterTestVariables().createTabster?.(window);
                getTabsterTestVariables().createTabster?.(window);

                if (first) {
                    getTabsterTestVariables().disposeTabster?.(first);
                }

                return !!(window as unknown as WindowWithTabster)
                    .__tabsterInstance;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toBe(true);
            });
    });

    it("should dispose global tabster core if there are no more tabster instances", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const first = getTabsterTestVariables().createTabster?.(window);
                const second =
                    getTabsterTestVariables().createTabster?.(window);

                if (first && second) {
                    getTabsterTestVariables().disposeTabster?.(first);
                    getTabsterTestVariables().disposeTabster?.(second);
                }
                return !!(window as unknown as WindowWithTabster)
                    .__tabsterInstance;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toBe(false);
            });
    });

    it("should dispose global tabster core if allInstances parameter is passed", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();
                const first = getTabsterTestVariables().createTabster?.(window);
                getTabsterTestVariables().createTabster?.(window);

                if (first) {
                    getTabsterTestVariables().disposeTabster?.(first, true);
                }

                return !!(window as unknown as WindowWithTabster)
                    .__tabsterInstance;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toBe(false);
            });
    });

    it("should not take getTabster() instances into account global tabster core if there are no more tabster instances", async () => {
        await new BroTest.BroTest(<div />)
            .eval(() => {
                // dispose default tabster on the test page
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__tabsterInstance.dispose();

                const first = getTabsterTestVariables().createTabster?.(window);
                const second =
                    getTabsterTestVariables().createTabster?.(window);
                const third = getTabsterTestVariables().getTabster?.(window);

                const ret: boolean[] = [!!third];

                if (first) {
                    getTabsterTestVariables().disposeTabster?.(first);
                    ret.push(
                        !!(window as unknown as WindowWithTabster)
                            .__tabsterInstance
                    );
                }

                if (second) {
                    getTabsterTestVariables().disposeTabster?.(second);
                    ret.push(
                        !!(window as unknown as WindowWithTabster)
                            .__tabsterInstance
                    );
                }

                return ret;
            })
            .check((tabsterExists) => {
                expect(tabsterExists).toEqual([true, true, false]);
            });
    });

    it("should make Tabster noop", async () => {
        await new BroTest.BroTest(
            <div id="root" {...getTabsterAttribute({ root: {} })} />
        )
            .eval(() => {
                const root = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "root"
                );
                return !!(
                    root &&
                    getTabsterTestVariables().core?.core.storageEntry(root)
                );
            })
            .check((exists) => {
                expect(exists).toEqual(true);
            })
            .eval(() => {
                const tabsterTest = getTabsterTestVariables();

                if (tabsterTest.core) {
                    tabsterTest.makeNoOp?.(tabsterTest.core, true);
                }

                const root = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "root"
                );

                return !!(root && tabsterTest.core?.core.storageEntry(root));
            })
            .check((exists) => {
                expect(exists).toEqual(false);
            })
            .eval(() => {
                const tabsterTest = getTabsterTestVariables();

                if (tabsterTest.core) {
                    tabsterTest.makeNoOp?.(tabsterTest.core, false);
                }

                const root = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "root"
                );

                return !!(root && tabsterTest.core?.core.storageEntry(root));
            })
            .check((exists) => {
                expect(exists).toEqual(true);
            });
    });
});

describe("Tabster create", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage();
    });

    it("should initialize Modalizer when the DOM is mounted before Tabster is created", async () => {
        await new BroTest.BroTest(
            (
                <div>
                    <button>Button1</button>
                    <div
                        {...getTabsterAttribute({
                            modalizer: { id: "modal", isTrapped: true },
                        })}
                    >
                        <button>Button2</button>
                    </div>
                    <button id="button3">Button3</button>
                </div>
            )
        )
            .eval(() => {
                return !!(window as WindowWithTabsterInstance)
                    .__tabsterInstance;
            })
            .check((hasInstance: boolean) => {
                expect(hasInstance).toBe(false);
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
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .eval(() => {
                const vars = getTabsterTestVariables();

                const tabster = vars.createTabster?.(window, { autoRoot: {} });

                if (tabster) {
                    vars.getModalizer?.(tabster);
                }

                return !!(window as WindowWithTabsterInstance)
                    .__tabsterInstance;
            })
            .check((hasInstance: boolean) => {
                expect(hasInstance).toBe(true);
            })
            .eval(() => {
                return document.body.getAttribute("data-tabster");
            })
            .check((bodyTabster: string | null) => {
                expect(bodyTabster).toEqual('{"root":{}}');
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .focusElement("#button3")
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should initialize Modalizer when the DOM is mounted and the focus is called synchronously before Tabster is fully initialized", async () => {
        await new BroTest.BroTest(
            (
                <div>
                    <button>Button1</button>
                    <div
                        id="modal"
                        {...getTabsterAttribute({
                            modalizer: { id: "modal", isTrapped: true },
                        })}
                    >
                        <button>Button2</button>
                    </div>
                    <button id="button3">Button3</button>
                </div>
            )
        )
            .eval(() => {
                return !!(window as WindowWithTabsterInstance)
                    .__tabsterInstance;
            })
            .check((hasInstance: boolean) => {
                expect(hasInstance).toBe(false);
            })
            .eval(() => {
                const vars = getTabsterTestVariables();

                const tabster = vars.createTabster?.(window, { autoRoot: {} });
                tabster && vars.getModalizer?.(tabster);

                const modalContainer =
                    getTabsterTestVariables().dom?.getElementById(
                        document,
                        "modal"
                    );

                if (modalContainer && tabster) {
                    const first = tabster.focusable.findFirst({
                        container: modalContainer,
                    });

                    first?.focus();
                }

                // The dev time custom state style should be propagated and set to active
                // as the sign that the modalizer is initialized and handled.
                return (
                    modalContainer?.getAttribute("style")?.indexOf("active") ||
                    -1
                );
            })
            .check((hasInstance: boolean) => {
                expect(hasInstance).toBeGreaterThan(0);
            })
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should initialize Grouppers when the DOM is mounted before Tabster is created", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ mover: {} })}>
                    <button>Button1</button>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    Types.GroupperTabbabilities
                                        .LimitedTrapFocus,
                            },
                        })}
                    >
                        <div
                            tabIndex={0}
                            {...getTabsterAttribute({
                                groupper: {
                                    tabbability:
                                        Types.GroupperTabbabilities
                                            .LimitedTrapFocus,
                                },
                            })}
                        >
                            <button>Button2</button>
                            <button>Button3</button>
                        </div>
                        <button>Button4</button>
                    </div>
                    <button>Button5</button>
                </div>
            )
        )
            .eval(() => {
                return !!(window as WindowWithTabsterInstance)
                    .__tabsterInstance;
            })
            .check((hasInstance: boolean) => {
                expect(hasInstance).toBe(false);
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
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
                expect(el?.textContent).toEqual("Button5");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .eval(() => {
                const vars = getTabsterTestVariables();

                const tabster = vars.createTabster?.(window, { autoRoot: {} });

                if (tabster) {
                    vars.getMover?.(tabster);
                    vars.getGroupper?.(tabster);
                }

                return !!(window as WindowWithTabsterInstance)
                    .__tabsterInstance;
            })
            .check((hasInstance: boolean) => {
                expect(hasInstance).toBe(true);
            })
            .wait(500)
            .eval(() => {
                return document.body.getAttribute("data-tabster");
            })
            .check((bodyTabster: string | null) => {
                expect(bodyTabster).toEqual('{"root":{}}');
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressUp()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button3");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button4");
            })
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3");
            })
            .pressEsc()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2Button3Button4");
            })
            .pressDown()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button5");
            });
    });
});
