/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Focusable", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            mover: true,
            groupper: true,
            modalizer: true,
        });
    });

    describe("aria-disabled", () => {
        it("should allow aria-disabled elements to be focused", async () => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button aria-disabled="true">Button1</button>
                    </div>
                )
            )
                .pressTab()
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        });
    });

    describe("aria-hidden", () => {
        it("should allow aria-hidden elements to be focused", async () => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button aria-hidden="true">Button1</button>
                        <button>Button2</button>
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
                .pressTab(true)
                .activeElement((el) => {
                    expect(el?.textContent).toEqual("Button1");
                });
        });
    });

    describe("findAll()", () => {
        let broTest: BroTest.BroTest;

        beforeEach(async () => {
            broTest = new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button aria-hidden="true">Button1</button>
                        <button>Button2</button>
                        <div {...getTabsterAttribute({ mover: {} })}>
                            <button>Button3</button>
                            <div {...getTabsterAttribute({ groupper: {} })}>
                                <button>Button4</button>
                                <button>Button5</button>
                            </div>
                            <div
                                id="groupper"
                                tabIndex={0}
                                {...getTabsterAttribute({ groupper: {} })}
                            >
                                <button>Button6</button>
                                <div {...getTabsterAttribute({ mover: {} })}>
                                    <button>Button7</button>
                                    <div
                                        {...getTabsterAttribute({
                                            groupper: {},
                                        })}
                                    >
                                        <button id="button8">Button8</button>
                                        <button>Button9</button>
                                    </div>
                                    <div
                                        tabIndex={0}
                                        {...getTabsterAttribute({
                                            groupper: {},
                                        })}
                                    >
                                        <button>Button10</button>
                                        <button>Button11</button>
                                    </div>
                                </div>
                                <button>Button12</button>
                            </div>
                            <button>Button13</button>
                        </div>
                    </div>
                )
            );
        });

        it("should return proper elements when findAll() is called", async () => {
            await broTest
                .eval(() => {
                    return getTabsterTestVariables()
                        .core?.focusable.findAll({ container: document.body })
                        .map((el) => el.textContent);
                })
                .check((evalRet: string[]) => {
                    expect(evalRet).toEqual([
                        "Button2",
                        "Button3",
                        "Button4",
                        "Button6Button7Button8Button9Button10Button11Button12",
                        "Button13",
                    ]);
                })
                .eval(() => {
                    const container =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            "groupper"
                        );

                    return container
                        ? getTabsterTestVariables()
                              .core?.focusable.findAll({ container })
                              .map((el) => el.textContent)
                        : [];
                })
                .check((evalRet: string[]) => {
                    expect(evalRet).toEqual([
                        "Button6",
                        "Button7",
                        "Button8",
                        "Button10Button11",
                        "Button12",
                    ]);
                });
        });

        it("should call callback when finding focusable elements", async () => {
            await broTest
                .eval(() => {
                    const ret: (string | null)[] = [];
                    const found = getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container: document.body,
                            onElement: (el) => {
                                ret.push(el.textContent);
                                return true;
                            },
                        })
                        .map((el) => el.textContent);

                    return [found, ret];
                })
                .check((evalRet: string[]) => {
                    const expected = [
                        "Button2",
                        "Button3",
                        "Button4",
                        "Button6Button7Button8Button9Button10Button11Button12",
                        "Button13",
                    ];
                    expect(evalRet).toEqual([expected, expected]);
                });
        });

        it("should call callback when finding focusable elements in backward direction", async () => {
            await broTest
                .eval(() => {
                    const ret: (string | null)[] = [];
                    const found = getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container: document.body,
                            isBackward: true,
                            onElement: (el) => {
                                ret.push(el.textContent);
                                return true;
                            },
                        })
                        .map((el) => el.textContent);

                    return [found, ret];
                })
                .check((evalRet: string[]) => {
                    const expected = [
                        "Button13",
                        "Button6Button7Button8Button9Button10Button11Button12",
                        "Button4",
                        "Button3",
                        "Button2",
                    ];
                    expect(evalRet).toEqual([expected, expected]);
                });
        });

        it("should call callback when finding focusable elements within a container", async () => {
            await broTest
                .eval(() => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const container =
                        getTabsterTestVariables().dom!.getElementById(
                            document,
                            "groupper"
                        )!;
                    const ret: (string | null)[] = [];
                    const found = getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container,
                            onElement: (el) => {
                                ret.push(el.textContent);
                                return true;
                            },
                        })
                        .map((el) => el.textContent);

                    return [found, ret];
                })
                .check((evalRet: string[]) => {
                    const expected = [
                        "Button6",
                        "Button7",
                        "Button8",
                        "Button10Button11",
                        "Button12",
                    ];
                    expect(evalRet).toEqual([expected, expected]);
                });
        });

        it("should call callback when finding focusable elements in backward direction within a container", async () => {
            await broTest
                .eval(() => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const container =
                        getTabsterTestVariables().dom!.getElementById(
                            document,
                            "groupper"
                        )!;
                    const ret: (string | null)[] = [];
                    const found = getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container,
                            isBackward: true,
                            onElement: (el) => {
                                ret.push(el.textContent);
                                return true;
                            },
                        })
                        .map((el) => el.textContent);

                    return [found, ret];
                })
                .check((evalRet: string[]) => {
                    const expected = [
                        "Button12",
                        "Button10Button11",
                        "Button8",
                        "Button7",
                        "Button6",
                    ];
                    expect(evalRet).toEqual([expected, expected]);
                });
        });

        it("should call callback when finding focusable elements within a container from a certain element", async () => {
            await broTest
                .eval(() => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const container =
                        getTabsterTestVariables().dom!.getElementById(
                            document,
                            "groupper"
                        )!;
                    const from = getTabsterTestVariables().dom?.getElementById(
                        document,
                        "button8"
                    );
                    const ret: (string | null)[] = [];
                    const found = getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container,
                            currentElement: from || undefined,
                            onElement: (el) => {
                                ret.push(el.textContent);
                                return true;
                            },
                        })
                        .map((el) => el.textContent);

                    return [found, ret];
                })
                .check((evalRet: string[]) => {
                    const expected = ["Button10Button11", "Button12"];
                    expect(evalRet).toEqual([expected, expected]);
                });
        });

        it("should call callback when finding focusable elements in backward direction within a container from a certain element", async () => {
            await broTest
                .eval(() => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const container =
                        getTabsterTestVariables().dom!.getElementById(
                            document,
                            "groupper"
                        )!;
                    const from = getTabsterTestVariables().dom?.getElementById(
                        document,
                        "button8"
                    );
                    const ret: (string | null)[] = [];
                    const found = getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container,
                            currentElement: from || undefined,
                            isBackward: true,
                            onElement: (el) => {
                                ret.push(el.textContent);
                                return true;
                            },
                        })
                        .map((el) => el.textContent);

                    return [found, ret];
                })
                .check((evalRet: string[]) => {
                    const expected = ["Button7", "Button6"];
                    expect(evalRet).toEqual([expected, expected]);
                });
        });

        it("should stop search if the callback returns false", async () => {
            await broTest
                .eval(() => {
                    const ret: (string | null)[] = [];
                    let counter = 0;
                    const found = getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container: document.body,
                            isBackward: true,
                            onElement: (el) => {
                                counter++;
                                ret.push(el.textContent);
                                return counter < 2;
                            },
                        })
                        .map((el) => el.textContent);

                    return [found, ret];
                })
                .check((evalRet: string[]) => {
                    const expected = [
                        "Button13",
                        "Button6Button7Button8Button9Button10Button11Button12",
                    ];
                    expect(evalRet).toEqual([expected, expected]);
                });
        });
    });

    describe("find*() with modalizers", () => {
        let broTest: BroTest.BroTest;

        beforeEach(async () => {
            broTest = new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <div>
                            <button id="button1">Button1</button>
                            <button>Button2</button>
                        </div>
                        <div
                            id="modalizer"
                            {...getTabsterAttribute({
                                modalizer: { id: "ololo" },
                            })}
                        >
                            <button id="modal-button-1">ModalButton1</button>
                            <button>ModalButton2</button>
                        </div>
                        <div
                            id="modalizer2"
                            {...getTabsterAttribute({
                                modalizer: { id: "ololo2" },
                            })}
                        >
                            <button id="modal-button-3">ModalButton3</button>
                            <button>ModalButton4</button>
                        </div>
                        <div>
                            <button>Button3</button>
                            <button>Button4</button>
                        </div>
                    </div>
                )
            );
        });

        it("should return proper elements when findAll() is called", async () => {
            await broTest
                .eval(() => {
                    return getTabsterTestVariables()
                        .core?.focusable.findAll({ container: document.body })
                        .map((el) => el.textContent);
                })
                .check((evalRet: string[]) => {
                    expect(evalRet).toEqual([
                        "Button1",
                        "Button2",
                        "Button3",
                        "Button4",
                    ]);
                })
                .eval(() => {
                    const container =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            "modalizer"
                        );
                    return (
                        container &&
                        getTabsterTestVariables()
                            .core?.focusable.findAll({
                                container,
                            })
                            .map((el) => el.textContent)
                    );
                })
                .check((evalRet: string[]) => {
                    expect(evalRet).toEqual(["ModalButton1", "ModalButton2"]);
                })
                .eval(() => {
                    const container =
                        getTabsterTestVariables().dom?.getElementById(
                            document,
                            "modalizer2"
                        );
                    return (
                        container &&
                        getTabsterTestVariables()
                            .core?.focusable.findAll({
                                container,
                            })
                            .map((el) => el.textContent)
                    );
                })
                .check((evalRet: string[]) => {
                    expect(evalRet).toEqual(["ModalButton3", "ModalButton4"]);
                })
                .focusElement("#modal-button-1")
                .activeElement((el) =>
                    expect(el?.textContent).toEqual("ModalButton1")
                )
                .eval(() => {
                    return getTabsterTestVariables()
                        .core?.focusable.findAll({ container: document.body })
                        .map((el) => el.textContent);
                })
                .check((evalRet: string[]) => {
                    expect(evalRet).toEqual([
                        "Button1",
                        "Button2",
                        "Button3",
                        "Button4",
                    ]);
                })
                .eval(() => {
                    return getTabsterTestVariables()
                        .core?.focusable.findAll({
                            container: document.body,
                            useActiveModalizer: true,
                        })
                        .map((el) => el.textContent);
                })
                .check((evalRet: string[]) => {
                    expect(evalRet).toEqual(["ModalButton1", "ModalButton2"]);
                });
        });
    });

    describe("isVisible", () => {
        it("should correctly detect visibility for position:fixed elements", async () => {
            await new BroTest.BroTest(
                (
                    <div {...getTabsterAttribute({ root: {} })}>
                        <button
                            style={{
                                position: "fixed",
                                width: 100,
                                height: 50,
                            }}
                            id="button"
                        >
                            Button1
                        </button>
                    </div>
                )
            )
                .eval(() => {
                    const vars = getTabsterTestVariables();
                    const button = vars.dom?.getElementById(document, "button");
                    return button && vars.core?.focusable.isVisible(button);
                })
                .check((isVisible: boolean) => {
                    expect(isVisible).toEqual(true);
                });
        });
    });
});
