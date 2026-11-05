/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Focusable backward enumeration", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            mover: true,
            groupper: true,
            modalizer: true,
        });
    });

    it.each([1, 2, 3, 4, 5])(
        "includes every element when the last leaf is focusable (%i buttons)",
        async (count) => {
            const expected = Array.from(
                { length: count },
                (_, index) => `Button${index + 1}`
            );

            await new BroTest.BroTest(
                <div {...getTabsterAttribute({ root: {} })}>
                    <div id="container">
                        {expected.map((label) => (
                            <button key={label}>{label}</button>
                        ))}
                    </div>
                </div>
            )
                .eval(() => {
                    const vars = getTabsterTestVariables();
                    const container = vars.dom!.getElementById(
                        document,
                        "container"
                    )!;
                    const focusable = vars.core!.focusable;
                    const callbacks: (string | null)[] = [];

                    return {
                        forward: focusable
                            .findAll({ container })
                            .map((element) => element.textContent),
                        backward: focusable
                            .findAll({
                                container,
                                isBackward: true,
                                onElement: (element) => {
                                    callbacks.push(element.textContent);
                                    return true;
                                },
                            })
                            .map((element) => element.textContent),
                        callbacks,
                        first: focusable.findFirst({ container })?.textContent,
                        last: focusable.findLast({ container })?.textContent,
                    };
                })
                .check((result) => {
                    expect(result).toEqual({
                        forward: expected,
                        backward: [...expected].reverse(),
                        callbacks: [...expected].reverse(),
                        first: expected[0],
                        last: expected[count - 1],
                    });
                });
        }
    );

    it("enumerates an explicit table without a trailing sentinel", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <table id="container">
                    <tbody>
                        {[0, 1, 2].map((row) => (
                            <tr key={row}>
                                {[1, 2, 3, 4, 5].map((column) => (
                                    <td key={column} tabIndex={0}>
                                        {row * 5 + column}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                return vars
                    .core!.focusable.findAll({ container, isBackward: true })
                    .map((element) => element.textContent);
            })
            .check((result) => {
                expect(result).toEqual(
                    Array.from({ length: 15 }, (_, index) => `${15 - index}`)
                );
            });
    });

    it("stops at the callback's pending candidate without skipping its predecessor", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <button>Button1</button>
                    <button>Button2</button>
                    <button>Button3</button>
                    <button>Button4</button>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const callbacks: (string | null)[] = [];
                const found = vars.core!.focusable.findAll({
                    container,
                    isBackward: true,
                    onElement: (element) => {
                        callbacks.push(element.textContent);
                        return callbacks.length < 2;
                    },
                });

                return {
                    found: found.map((element) => element.textContent),
                    callbacks,
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    found: ["Button4", "Button3"],
                    callbacks: ["Button4", "Button3"],
                });
            });
    });

    it("preserves currentElement bounds and the single-element search APIs", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <button>Button1</button>
                    <button>Button2</button>
                    <button id="current">Button3</button>
                    <button>Button4</button>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const currentElement = vars.dom!.getElementById(
                    document,
                    "current"
                )!;
                const focusable = vars.core!.focusable;
                const options = { container, currentElement };

                return {
                    before: focusable
                        .findAll({ ...options, isBackward: true })
                        .map((element) => element.textContent),
                    after: focusable
                        .findAll(options)
                        .map((element) => element.textContent),
                    previous: focusable.findPrev(options)?.textContent,
                    next: focusable.findNext(options)?.textContent,
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    before: ["Button2", "Button1"],
                    after: ["Button4"],
                    previous: "Button2",
                    next: "Button4",
                });
            });
    });

    it("observes live callback changes and permits a reentrant search", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <button>Button1</button>
                    <button id="disabled">Button2</button>
                    <button>Button3</button>
                    <button>Button4</button>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const focusable = vars.core!.focusable;
                let nested: (string | null)[] | undefined;
                const found = focusable.findAll({
                    container,
                    isBackward: true,
                    onElement: () => {
                        if (!nested) {
                            nested = focusable
                                .findAll({ container })
                                .map((element) => element.textContent);
                            (
                                vars.dom!.getElementById(
                                    document,
                                    "disabled"
                                ) as HTMLButtonElement
                            ).disabled = true;
                        }
                        return true;
                    },
                });

                return {
                    found: found.map((element) => element.textContent),
                    nested,
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    found: ["Button4", "Button3", "Button1"],
                    nested: ["Button1", "Button2", "Button3", "Button4"],
                });
            });
    });

    it("enumerates childless input siblings with and without a current element", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <input id="first" />
                    <input id="second" />
                    <input id="third" />
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const focusable = vars.core!.focusable;
                const callbacks: string[] = [];
                return {
                    forward: focusable
                        .findAll({ container })
                        .map((element) => element.id),
                    backward: focusable
                        .findAll({
                            container,
                            isBackward: true,
                            onElement: (element) => {
                                callbacks.push(element.id);
                                return true;
                            },
                        })
                        .map((element) => element.id),
                    callbacks,
                    beforeThird: focusable
                        .findAll({
                            container,
                            currentElement: vars.dom!.getElementById(
                                document,
                                "third"
                            )!,
                            isBackward: true,
                        })
                        .map((element) => element.id),
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    forward: ["first", "second", "third"],
                    backward: ["third", "second", "first"],
                    callbacks: ["third", "second", "first"],
                    beforeThird: ["second", "first"],
                });
            });
    });

    it("visits focusable ancestors after their descendants without skipping a sibling subtree", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <div id="first-row" tabIndex={0}>
                        <button id="first-button">First</button>
                    </div>
                    <div id="second-row" tabIndex={0}>
                        <button id="second-button">Second</button>
                    </div>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const focusable = vars.core!.focusable;
                return {
                    forward: focusable
                        .findAll({ container })
                        .map((element) => element.id),
                    backward: focusable
                        .findAll({ container, isBackward: true })
                        .map((element) => element.id),
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    forward: [
                        "first-row",
                        "first-button",
                        "second-row",
                        "second-button",
                    ],
                    backward: [
                        "second-button",
                        "second-row",
                        "first-button",
                        "first-row",
                    ],
                });
            });
    });

    it("keeps the cursor on the reported candidate before a callback removes it", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="container">
                    <input id="first" />
                    <input id="second" />
                    <input id="third" />
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                const container = vars.dom!.getElementById(
                    document,
                    "container"
                )!;
                const callbacks: string[] = [];
                const result = vars.core!.focusable.findAll({
                    container,
                    isBackward: true,
                    onElement: (element) => {
                        callbacks.push(element.id);
                        element.remove();
                        return true;
                    },
                });
                return {
                    result: result.map((element) => element.id),
                    callbacks,
                };
            })
            .check((result) => {
                expect(result).toEqual({
                    result: ["third"],
                    callbacks: ["third"],
                });
            });
    });
});
