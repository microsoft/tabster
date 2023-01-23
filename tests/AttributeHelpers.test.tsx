/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { Types, getTabsterAttribute, mergeTabsterProps } from "tabster";
import * as BroTest from "./utils/BroTest";

describe("getTabsterAttribute()", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            mover: true,
            groupper: true,
            modalizer: true,
        });
    });

    it("should return Tabster attribute", () => {
        expect(
            getTabsterAttribute({
                root: {},
                deloser: {},
                modalizer: { id: "test" },
            })
        ).toEqual({
            "data-tabster": JSON.stringify({
                root: {},
                deloser: {},
                modalizer: { id: "test" },
            }),
        });

        expect(
            getTabsterAttribute(
                {
                    root: {},
                    deloser: {},
                    modalizer: { id: "test" },
                },
                true
            )
        ).toEqual(
            JSON.stringify({
                root: {},
                deloser: {},
                modalizer: { id: "test" },
            })
        );
    });

    it("should set Tabster attribute", async () => {
        await new BroTest.BroTest(
            (
                <div>
                    <div id="div1"></div>
                    <div
                        id="div2"
                        {...getTabsterAttribute({
                            mover: {},
                            modalizer: { id: "test" },
                        })}
                    ></div>
                </div>
            )
        )
            .eval(() => {
                const div1 = document.getElementById("div1");
                const div2 = document.getElementById("div2");

                if (div1) {
                    getTabsterTestVariables().setTabsterAttribute?.(div1, {
                        groupper: {},
                        modalizer: { id: "ololo" },
                    });
                }

                if (div2) {
                    getTabsterTestVariables().setTabsterAttribute?.(
                        div2,
                        {
                            groupper: {},
                            modalizer: undefined,
                        },
                        true
                    );
                }

                return {
                    div1: div1?.getAttribute("data-tabster"),
                    div2: div2?.getAttribute("data-tabster"),
                };
            })
            .check((attrs: { div1?: string; div2?: string }) => {
                expect(attrs.div1).toEqual(
                    JSON.stringify({
                        groupper: {},
                        modalizer: { id: "ololo" },
                    })
                );
                expect(attrs.div2).toEqual(
                    JSON.stringify({ mover: {}, groupper: {} })
                );
            })
            .eval(() => {
                const div1 = document.getElementById("div1");
                const div2 = document.getElementById("div2");

                if (div1) {
                    getTabsterTestVariables().setTabsterAttribute?.(
                        div1,
                        {
                            groupper: undefined,
                            modalizer: undefined,
                        },
                        true
                    );
                }

                if (div2) {
                    getTabsterTestVariables().setTabsterAttribute?.(div2, {
                        groupper: undefined,
                        mover: undefined,
                    });
                }

                return [
                    div1?.getAttribute("data-tabster") === null,
                    div2?.getAttribute("data-tabster") === null,
                ];
            })
            .check((isNull?: boolean[]) => {
                expect(isNull).toEqual([true, true]);
            });
    });

    it("should merge Tabster props", () => {
        const props1: Types.TabsterAttributeProps = {
            deloser: {},
            modalizer: { id: "test" },
        };

        const props2: Types.TabsterAttributeProps = {
            deloser: undefined,
            groupper: {},
            modalizer: { id: "test2" },
        };

        mergeTabsterProps(props1, props2);

        expect(props1).toEqual({ groupper: {}, modalizer: { id: "test2" } });
    });
});
