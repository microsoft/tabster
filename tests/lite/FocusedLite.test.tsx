/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Focused", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({}, { lite: true });
    });

    it("should notify programmatic focus and blur", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <button id="a">A</button>
            </div>
        )
            .eval(async () => {
                const vars = getTabsterTestVariables() as {
                    createFocusedElementTracker?: (doc: Document) => {
                        subscribe: (
                            cb: (
                                element: HTMLElement | undefined,
                                detail: {
                                    relatedTarget?: HTMLElement;
                                    isFocusedProgrammatically?: boolean;
                                }
                            ) => void
                        ) => void;
                        dispose: () => void;
                    };
                    dom?: {
                        getElementById: (
                            document: Document,
                            id: string
                        ) => HTMLElement | null;
                    };
                };

                const tracker = vars.createFocusedElementTracker?.(document);
                const events: Array<{
                    id?: string;
                    related?: string;
                    isProgrammatic?: boolean;
                }> = [];

                tracker?.subscribe((element, detail) => {
                    events.push({
                        id: element?.id,
                        related: detail.relatedTarget?.id,
                        isProgrammatic: detail.isFocusedProgrammatically,
                    });
                });

                vars.dom?.getElementById(document, "a")?.focus();
                vars.dom?.getElementById(document, "a")?.blur();

                await new Promise((resolve) => setTimeout(resolve, 25));
                tracker?.dispose();

                return events;
            })
            .check(
                (
                    events: Array<{
                        id?: string;
                        related?: string;
                        isProgrammatic?: boolean;
                    }>
                ) => {
                    expect(events[0]).toEqual({
                        id: "a",
                        related: undefined,
                        isProgrammatic: true,
                    });
                    expect(events[1]).toEqual({
                        id: undefined,
                        related: "a",
                        isProgrammatic: undefined,
                    });
                }
            );
    });
});
