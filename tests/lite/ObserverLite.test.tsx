/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster/lite";
import * as BroTest from "../utils/BroTest";

describe("Lite - Observer", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({}, { lite: true });
    });

    it("should mount, remount and unmount instances on attribute changes", async () => {
        await new BroTest.BroTest(
            <div {...getTabsterAttribute({ root: {} })}>
                <div id="target" {...getTabsterAttribute({ groupper: {} })}>
                    <button>Foo</button>
                </div>
            </div>
        )
            .eval(async () => {
                const vars = getTabsterTestVariables() as {
                    createLiteObserver?: (opts: {
                        modules: ("groupper" | "mover")[];
                    }) => {
                        dispose: () => void;
                        getInstance: (
                            element: HTMLElement,
                            module: "groupper" | "mover"
                        ) => unknown;
                    };
                    dom?: {
                        getElementById: (
                            document: Document,
                            id: string
                        ) => HTMLElement | null;
                    };
                };

                const observer = vars.createLiteObserver?.({
                    modules: ["groupper", "mover"],
                });

                const target = vars.dom?.getElementById(document, "target");
                const initialGroupper = !!(
                    observer &&
                    target &&
                    observer.getInstance(target, "groupper")
                );

                if (target) {
                    target.setAttribute(
                        "data-tabster",
                        JSON.stringify({ mover: {} })
                    );
                }
                await new Promise((resolve) => setTimeout(resolve, 25));

                const groupperRemoved =
                    !!observer &&
                    !!target &&
                    observer.getInstance(target, "groupper") === null;
                const moverMounted =
                    !!observer &&
                    !!target &&
                    !!observer.getInstance(target, "mover");

                if (target) {
                    target.removeAttribute("data-tabster");
                }
                await new Promise((resolve) => setTimeout(resolve, 25));

                const moverRemoved =
                    !!observer &&
                    !!target &&
                    observer.getInstance(target, "mover") === null;

                observer?.dispose();

                return {
                    initialGroupper,
                    groupperRemoved,
                    moverMounted,
                    moverRemoved,
                };
            })
            .check((result) => {
                expect(result.initialGroupper).toBe(true);
                expect(result.groupperRemoved).toBe(true);
                expect(result.moverMounted).toBe(true);
                expect(result.moverRemoved).toBe(true);
            });
    });

    it("should mount instances for dynamically added elements", async () => {
        await new BroTest.BroTest(
            <div id="root" {...getTabsterAttribute({ root: {} })} />
        )
            .eval(async () => {
                const vars = getTabsterTestVariables() as {
                    createLiteObserver?: (opts: {
                        root: HTMLElement;
                        modules: "groupper"[];
                    }) => {
                        dispose: () => void;
                        getInstance: (
                            element: HTMLElement,
                            module: "groupper"
                        ) => unknown;
                    };
                    dom?: {
                        getElementById: (
                            document: Document,
                            id: string
                        ) => HTMLElement | null;
                    };
                };

                const root = vars.dom?.getElementById(document, "root");
                const observer = root
                    ? vars.createLiteObserver?.({ root, modules: ["groupper"] })
                    : undefined;

                const child = document.createElement("div");
                child.id = "dynamic";
                child.setAttribute(
                    "data-tabster",
                    JSON.stringify({ groupper: {} })
                );
                child.innerHTML = "<button>Child</button>";
                root?.appendChild(child);

                await new Promise((resolve) => setTimeout(resolve, 25));

                const mounted =
                    !!observer && !!observer.getInstance(child, "groupper");

                observer?.dispose();
                return mounted;
            })
            .check((mounted) => {
                expect(mounted).toBe(true);
            });
    });
});
