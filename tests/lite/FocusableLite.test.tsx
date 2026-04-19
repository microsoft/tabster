/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Focusable", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({}, { lite: true });
    });

    it("should support ordering options in findAll", async () => {
        await new BroTest.BroTest(
            <div id="root" {...getTabsterAttribute({ root: {} })}>
                <button id="a">A</button>
                <button id="b">B</button>
                <button id="c" tabIndex={-1}>
                    C
                </button>
                <button id="d">D</button>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                vars.createTabster?.(window);

                const root = vars.dom?.getElementById(document, "root");
                const core = vars.core as unknown as {
                    focusable: {
                        findAll: (
                            options: Record<string, unknown>
                        ) => HTMLElement[];
                    };
                };

                const forward = root
                    ? core.focusable
                          .findAll({ container: root })
                          .map((el) => el.id)
                    : [];

                const includeProgrammaticallyFocusable = root
                    ? core.focusable
                          .findAll({
                              container: root,
                              includeProgrammaticallyFocusable: true,
                          })
                          .map((el) => el.id)
                    : [];

                const d = vars.dom?.getElementById(document, "d");
                const backwardFromD =
                    root && d
                        ? core.focusable
                              .findAll({
                                  container: root,
                                  isBackward: true,
                                  currentElement: d,
                              })
                              .map((el) => el.id)
                        : [];

                const visited: string[] = [];
                const onElementResult = root
                    ? core.focusable
                          .findAll({
                              container: root,
                              onElement: (el: HTMLElement) => {
                                  visited.push(el.id);
                                  return visited.length < 2;
                              },
                          })
                          .map((el) => el.id)
                    : [];

                return {
                    forward,
                    includeProgrammaticallyFocusable,
                    backwardFromD,
                    onElementResult,
                };
            })
            .check((result) => {
                expect(result.forward).toEqual(["a", "b", "d"]);
                expect(result.includeProgrammaticallyFocusable).toEqual([
                    "a",
                    "b",
                    "c",
                    "d",
                ]);
                expect(result.backwardFromD).toEqual(["b", "a"]);
                expect(result.onElementResult).toEqual(["a", "b"]);
            });
    });

    it("should respect accessibility filters", async () => {
        await new BroTest.BroTest(
            <div id="root" {...getTabsterAttribute({ root: {} })}>
                <button id="visible">Visible</button>
                <div aria-hidden="true">
                    <button id="ariaHidden">AriaHidden</button>
                </div>
                <div id="inertWrap">
                    <button id="inerted">Inerted</button>
                </div>
            </div>
        )
            .eval(() => {
                const vars = getTabsterTestVariables();
                vars.createTabster?.(window);

                const root = vars.dom?.getElementById(document, "root");
                const inertWrap = vars.dom?.getElementById(
                    document,
                    "inertWrap"
                ) as (HTMLElement & { inert?: boolean }) | undefined;
                if (inertWrap) {
                    inertWrap.inert = true;
                }

                const ariaHidden = vars.dom?.getElementById(
                    document,
                    "ariaHidden"
                );
                const inerted = vars.dom?.getElementById(document, "inerted");

                const core = vars.core as unknown as {
                    focusable: {
                        findAll: (
                            options: Record<string, unknown>
                        ) => HTMLElement[];
                        isAccessible: (el: HTMLElement) => boolean;
                    };
                };

                const defaultFound = root
                    ? core.focusable
                          .findAll({ container: root })
                          .map((el) => el.id)
                    : [];
                const includeInertFound = root
                    ? core.focusable
                          .findAll({ container: root, includeInert: true })
                          .map((el) => el.id)
                    : [];

                return {
                    defaultFound,
                    includeInertFound,
                    ariaAccessible: ariaHidden
                        ? core.focusable.isAccessible(ariaHidden)
                        : true,
                    inertAccessible: inerted
                        ? core.focusable.isAccessible(inerted)
                        : true,
                };
            })
            .check((result) => {
                expect(result.defaultFound).toEqual(["visible"]);
                expect(result.includeInertFound).toEqual([
                    "visible",
                    "ariaHidden",
                    "inerted",
                ]);
                expect(result.ariaAccessible).toBe(false);
                expect(result.inertAccessible).toBe(false);
            });
    });
});
