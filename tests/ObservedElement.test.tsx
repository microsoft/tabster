/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    Types,
    ObservedElementRequestStatuses,
} from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Focusable", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ observed: true });
    });

    it("should request focus for element with tabindex -1", async () => {
        const name = "test";
        await new BroTest.BroTest(
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
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval(async (name) => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        name,
                        0
                    );

                const initialStatus = request?.status;

                return request
                    ? [await request.result, request.status, initialStatus]
                    : [];
            }, name)
            .check(
                ([res, status, initialStatus]: [
                    boolean,
                    Types.ObservedElementRequestStatus,
                    Types.ObservedElementRequestStatus,
                ]) => {
                    expect(res).toBe(true);
                    expect(status).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                    // Given the element is already there, the initial status is Succeeded too.
                    expect(initialStatus).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                }
            )
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should request focus for element with tabindex -1 and multiple names", async () => {
        const names = ["test-1", "test-0"];
        await new BroTest.BroTest(
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
            // reuqest focus for names[0]
            .pressTab()
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval(async (name) => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        name,
                        0
                    );

                const initialStatus = request?.status;

                return request
                    ? [await request.result, request.status, initialStatus]
                    : [];
            }, names[0])
            .check(
                ([res, status, initialStatus]: [
                    boolean,
                    Types.ObservedElementRequestStatus,
                    Types.ObservedElementRequestStatus,
                ]) => {
                    expect(res).toBe(true);
                    expect(status).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                    // Given the element is already there, the initial status is Succeeded too.
                    expect(initialStatus).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                }
            )
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            })
            // reuqest focus for names[1]
            .pressTab(true)
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            })
            .eval(async (name) => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        name,
                        0
                    );

                const initialStatus = request?.status;

                return request
                    ? [await request.result, request.status, initialStatus]
                    : [];
            }, names[1])
            .check(
                ([res, status, initialStatus]: [
                    boolean,
                    Types.ObservedElementRequestStatus,
                    Types.ObservedElementRequestStatus,
                ]) => {
                    expect(res).toBe(true);
                    expect(status).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                    // Given the element is already there, the initial status is Succeeded too.
                    expect(initialStatus).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                }
            )
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should request focus for non-existent element with tabindex -1", async () => {
        const name = "test";
        await new BroTest.BroTest(
            <div id="root" {...getTabsterAttribute({ root: {} })}></div>
        )
            .eval(async (name) => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        name,
                        5000
                    );

                const initialStatus = request?.status;

                const observedButton = document.createElement("button");
                observedButton.textContent = name;
                getTabsterTestVariables()
                    .dom?.getElementById(document, "root")
                    ?.appendChild(observedButton);
                const observed: Types.TabsterOnElement = {
                    observed: { names: [name] },
                };
                observedButton.setAttribute(
                    "data-tabster",
                    JSON.stringify(observed)
                );

                return request
                    ? [await request.result, request.status, initialStatus]
                    : [];
            }, name)
            .check(
                ([res, status, initialStatus]: [
                    boolean,
                    Types.ObservedElementRequestStatus,
                    Types.ObservedElementRequestStatus,
                ]) => {
                    expect(res).toBe(true);
                    expect(status).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                    expect(initialStatus).toBe(
                        ObservedElementRequestStatuses.Waiting
                    );
                }
            )
            .activeElement((el) => {
                expect(el?.textContent).toEqual(name);
            });
    });

    it("should cancel the focus request when the next one is happened", async () => {
        await new BroTest.BroTest(<div id="root"></div>)
            .eval(async () => {
                return await new Promise((resolve) => {
                    const request1 =
                        getTabsterTestVariables().observedElement?.requestFocus(
                            "button1",
                            10005000
                        );
                    const initialRequest1Status = request1?.status;

                    setTimeout(() => {
                        const request2 =
                            getTabsterTestVariables().observedElement?.requestFocus(
                                "button2",
                                10005000
                            );
                        const initialRequest2Status = request2?.status;

                        setTimeout(() => {
                            const button1 = document.createElement("button");
                            button1.setAttribute(
                                "data-tabster",
                                '{"observed":{"names": ["button1"]}}'
                            );
                            button1.textContent = "Button1";

                            const root =
                                getTabsterTestVariables().dom?.getElementById(
                                    document,
                                    "root"
                                );

                            root?.appendChild(button1);

                            setTimeout(async () => {
                                const button2 =
                                    document.createElement("button");
                                button2.setAttribute(
                                    "data-tabster",
                                    '{"observed":{"names": ["button2"]}}'
                                );
                                button2.textContent = "Button2";
                                root?.appendChild(button2);

                                resolve(
                                    request1 && request2
                                        ? [
                                              await request1.result,
                                              request1.status,
                                              initialRequest1Status,
                                              await request2.result,
                                              request2.status,
                                              initialRequest2Status,
                                          ]
                                        : []
                                );
                            }, 100);
                        }, 100);
                    }, 100);
                });
            })
            .check(
                ([
                    res1,
                    status1,
                    initialStatus1,
                    res2,
                    status2,
                    initialStatus2,
                ]: [
                    boolean,
                    Types.ObservedElementRequestStatus,
                    Types.ObservedElementRequestStatus,
                    boolean,
                    Types.ObservedElementRequestStatus,
                    Types.ObservedElementRequestStatus,
                ]) => {
                    expect(res1).toBe(false);
                    expect(status1).toBe(
                        ObservedElementRequestStatuses.Canceled
                    );
                    expect(initialStatus1).toBe(
                        ObservedElementRequestStatuses.Waiting
                    );

                    expect(res2).toBe(true);
                    expect(status2).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                    expect(initialStatus2).toBe(
                        ObservedElementRequestStatuses.Waiting
                    );
                }
            )
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button2");
            });
    });

    it("should wait for the element to become focusable when the element is already in the DOM", async () => {
        const name = "test";
        await new BroTest.BroTest(
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
            .eval((name) => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        name,
                        100500
                    );

                (
                    window as {
                        __tabsterTestRequest?: Types.ObservedElementAsyncRequest<boolean>;
                    }
                ).__tabsterTestRequest = request;

                return request?.status;
            }, name)
            .check((initialStatus: Types.ObservedElementRequestStatus) => {
                expect(initialStatus).toBe(
                    ObservedElementRequestStatuses.Waiting
                );
            })
            .wait(500)
            .eval(
                () =>
                    (
                        window as {
                            __tabsterTestRequest?: Types.ObservedElementAsyncRequest<boolean>;
                        }
                    ).__tabsterTestRequest?.status
            )
            .check((status: Types.ObservedElementRequestStatus) => {
                expect(status).toBe(ObservedElementRequestStatuses.Waiting);
            })
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "test-button")
                    ?.removeAttribute("aria-hidden");
            })
            .eval(async () => {
                const request = (
                    window as {
                        __tabsterTestRequest?: Types.ObservedElementAsyncRequest<boolean>;
                    }
                ).__tabsterTestRequest;

                // Clean up the global variable.
                delete (
                    window as {
                        __tabsterTestRequest?: Types.ObservedElementAsyncRequest<boolean>;
                    }
                ).__tabsterTestRequest;

                return request ? [await request.result, request.status] : [];
            })
            .check(
                ([res, status]: [
                    boolean,
                    Types.ObservedElementRequestStatus,
                ]) => {
                    expect(res).toBe(true);
                    expect(status).toBe(
                        ObservedElementRequestStatuses.Succeeded
                    );
                }
            )
            .activeElement((el) => {
                expect(el?.textContent).toEqual("Button1");
            });
    });

    it("should wait for the element to become focusable when the element is already in the DOM, removed then added again", async () => {
        const name = "test3";
        await new BroTest.BroTest(
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
                const b = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "test-button"
                );
                if (b && b.parentNode) {
                    b.parentNode.removeChild(b);
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
                getTabsterTestVariables()
                    .dom?.getElementById(document, "root")
                    ?.appendChild(b);
            }, name)
            .wait(300)
            .activeElement((el) => {
                expect(el?.textContent).toBeUndefined();
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "test-button-2")
                    ?.removeAttribute("aria-hidden");
            })
            .wait(300)
            .activeElement((el) => {
                expect(el?.attributes.id).toEqual("test-button-2");
                expect(el?.textContent).toEqual("CreatedButton");
            });
    });

    it("should time out waiting for nonexistent element", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button>Button1</button>
            </div>
        )
            .eval(async () => {
                const request =
                    getTabsterTestVariables().observedElement?.requestFocus(
                        "SomeName",
                        600 // Set timeout relatively low to not wait forever
                    );

                const initialStatus = request?.status;

                return request
                    ? [await request.result, request.status, initialStatus]
                    : [];
            })
            .check(
                ([res, status, initialStatus]: [
                    boolean,
                    Types.ObservedElementRequestStatus,
                    Types.ObservedElementRequestStatus,
                ]) => {
                    expect(res).toBe(false);
                    expect(status).toBe(
                        ObservedElementRequestStatuses.TimedOut
                    );
                    expect(initialStatus).toBe(
                        ObservedElementRequestStatuses.Waiting
                    );
                }
            );
    });

    it("should return all observed elements via getAllObservedElements", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button
                    {...getTabsterAttribute({
                        observed: { names: ["test-1", "test-shared"] },
                    })}
                >
                    Button1
                </button>
                <button
                    {...getTabsterAttribute({
                        observed: { names: ["test-2", "test-shared"] },
                    })}
                >
                    Button2
                </button>
                <button
                    {...getTabsterAttribute({
                        observed: { names: ["test-3"] },
                    })}
                >
                    Button3
                </button>
            </div>
        )
            .eval(() => {
                const allObserved =
                    getTabsterTestVariables().observedElement?.getAllObservedElements();

                const result: Record<
                    string,
                    { count: number; allNames: string[][] }
                > = {};
                allObserved?.forEach((items, name) => {
                    result[name] = {
                        count: items.length,
                        allNames: items.map((item) => item.names),
                    };
                });

                return result;
            })
            .check(
                (
                    result: Record<
                        string,
                        { count: number; allNames: string[][] }
                    >
                ) => {
                    // test-1 appears in one element with two names
                    expect(result["test-1"].count).toBe(1);
                    expect(result["test-1"].allNames[0]).toEqual([
                        "test-1",
                        "test-shared",
                    ]);
                    // test-2 appears in one element with two names
                    expect(result["test-2"].count).toBe(1);
                    expect(result["test-2"].allNames[0]).toEqual([
                        "test-2",
                        "test-shared",
                    ]);
                    // test-3 appears in one element with one name
                    expect(result["test-3"].count).toBe(1);
                    expect(result["test-3"].allNames[0]).toEqual(["test-3"]);
                    // test-shared appears in two elements, each with two names
                    expect(result["test-shared"].count).toBe(2);
                }
            );
    });

    it("should trigger onObservedElementChange callback when elements are added", async () => {
        await new BroTest.BroTest(<div id="root"></div>)
            .eval(() => {
                const changes: Array<{
                    type: string;
                    names: string[];
                    text: string;
                    addedNames?: string[];
                    removedNames?: string[];
                }> = [];

                const observedElement =
                    getTabsterTestVariables().observedElement;
                if (observedElement) {
                    observedElement.onObservedElementChange = (change) => {
                        changes.push({
                            type: change.type,
                            names: change.names,
                            text: change.element.textContent || "",
                            addedNames: change.addedNames,
                            removedNames: change.removedNames,
                        });
                    };
                }

                // Add first button
                const button1 = document.createElement("button");
                button1.textContent = "Button1";
                const observed1: Types.TabsterOnElement = {
                    observed: { names: ["test-1"] },
                };
                button1.setAttribute("data-tabster", JSON.stringify(observed1));
                getTabsterTestVariables()
                    .dom?.getElementById(document, "root")
                    ?.appendChild(button1);

                // Add second button with multiple names
                const button2 = document.createElement("button");
                button2.textContent = "Button2";
                const observed2: Types.TabsterOnElement = {
                    observed: { names: ["test-2", "test-shared"] },
                };
                button2.setAttribute("data-tabster", JSON.stringify(observed2));
                getTabsterTestVariables()
                    .dom?.getElementById(document, "root")
                    ?.appendChild(button2);

                return changes;
            })
            .check(
                (
                    changes: Array<{
                        type: string;
                        names: string[];
                        text: string;
                        addedNames?: string[];
                        removedNames?: string[];
                    }>
                ) => {
                    expect(changes.length).toBe(2);
                    // First button is a new element with one name
                    expect(changes[0]).toEqual({
                        type: "added",
                        names: ["test-1"],
                        text: "Button1",
                        addedNames: ["test-1"],
                        removedNames: undefined,
                    });
                    // Second button is a new element with two names
                    expect(changes[1]).toEqual({
                        type: "added",
                        names: ["test-2", "test-shared"],
                        text: "Button2",
                        addedNames: ["test-2", "test-shared"],
                        removedNames: undefined,
                    });
                }
            );
    });

    it("should trigger onObservedElementChange callback when elements are removed", async () => {
        await new BroTest.BroTest(
            <div id="root">
                <button
                    id="button1"
                    {...getTabsterAttribute({
                        observed: { names: ["test-1"] },
                    })}
                >
                    Button1
                </button>
                <button
                    id="button2"
                    {...getTabsterAttribute({
                        observed: { names: ["test-2", "test-shared"] },
                    })}
                >
                    Button2
                </button>
            </div>
        )
            .eval(() => {
                const changes: Array<{
                    type: string;
                    names: string[];
                    text: string;
                    addedNames?: string[];
                    removedNames?: string[];
                }> = [];

                const observedElement =
                    getTabsterTestVariables().observedElement;
                if (observedElement) {
                    observedElement.onObservedElementChange = (change) => {
                        changes.push({
                            type: change.type,
                            names: change.names,
                            text: change.element.textContent || "",
                            addedNames: change.addedNames,
                            removedNames: change.removedNames,
                        });
                    };
                }

                // Remove button2
                const button2 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "button2"
                );
                if (button2) {
                    button2.remove();
                }

                return changes;
            })
            .check(
                (
                    changes: Array<{
                        type: string;
                        names: string[];
                        text: string;
                        addedNames?: string[];
                        removedNames?: string[];
                    }>
                ) => {
                    expect(changes.length).toBe(1);
                    // When element is removed completely, names array is empty and removedNames has all previous names
                    expect(changes[0]).toEqual({
                        type: "removed",
                        names: [],
                        text: "Button2",
                        addedNames: undefined,
                        removedNames: ["test-2", "test-shared"],
                    });
                }
            );
    });

    it("should trigger onObservedElementChange callback when element names are updated", async () => {
        await new BroTest.BroTest(
            <div id="root">
                <button
                    id="button1"
                    {...getTabsterAttribute({
                        observed: { names: ["test-1"] },
                    })}
                >
                    Button1
                </button>
            </div>
        )
            .eval(() => {
                const changes: Array<{
                    type: string;
                    names: string[];
                    text: string;
                    addedNames?: string[];
                    removedNames?: string[];
                }> = [];

                const observedElement =
                    getTabsterTestVariables().observedElement;
                if (observedElement) {
                    observedElement.onObservedElementChange = (change) => {
                        changes.push({
                            type: change.type,
                            names: change.names,
                            text: change.element.textContent || "",
                            addedNames: change.addedNames,
                            removedNames: change.removedNames,
                        });
                    };
                }

                // Update button1 observed names
                const button1 = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "button1"
                );
                if (button1) {
                    const observed: Types.TabsterOnElement = {
                        observed: { names: ["test-1", "test-new"] },
                    };
                    button1.setAttribute(
                        "data-tabster",
                        JSON.stringify(observed)
                    );
                }

                return changes;
            })
            .check(
                (
                    changes: Array<{
                        type: string;
                        names: string[];
                        text: string;
                        addedNames?: string[];
                        removedNames?: string[];
                    }>
                ) => {
                    expect(changes.length).toBe(1);
                    // When names are updated on existing element, addedNames shows the new name
                    expect(changes[0]).toEqual({
                        type: "updated",
                        names: ["test-1", "test-new"],
                        text: "Button1",
                        addedNames: ["test-new"],
                        removedNames: undefined,
                    });
                }
            );
    });
});
