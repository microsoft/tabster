/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import { getTabsterAttribute } from "tabster";
import * as BroTest from "./utils/BroTest";
import { WindowWithTabsterCore } from "./utils/test-utils";

describe("keyboard navigation state", () => {
    beforeAll(async () => {
        await BroTest.bootstrapTabsterPage({ mover: true, groupper: true });
    });

    afterEach(async () => {
        // reset the keyboard navigation state with a mousedown event
        await new BroTest.BroTest(<div />).eval(() => {
            document.body.dispatchEvent(
                new MouseEvent("mousedown", {
                    clientX: 100,
                    clientY: 100,
                    screenX: 100,
                    screenY: 100,
                    buttons: 1,
                })
            );
        });
    });

    const getKeyboardNavigationState = () => {
        const win = window as unknown as WindowWithTabsterCore;
        return win.__tabsterInstance.keyboardNavigation.isNavigatingWithKeyboard();
    };

    it("should be true when navigating inside a Mover", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        {...getTabsterAttribute({
                            mover: { memorizeCurrent: true },
                        })}
                    >
                        <button>Button1</button>
                        <button>Button2</button>
                        <button>Button3</button>
                        <button>Button4</button>
                    </div>
                </div>
            )
        )
            .eval(getKeyboardNavigationState)
            .check((isNavigatingWIthKeyboard: boolean) => {
                expect(isNavigatingWIthKeyboard).toBe(false);
            })
            .focusElement("button")
            .eval(getKeyboardNavigationState)
            .check((isNavigatingWIthKeyboard: boolean) => {
                expect(isNavigatingWIthKeyboard).toBe(false);
            })
            .pressDown()
            .eval(getKeyboardNavigationState)
            .check((isNavigatingWIthKeyboard: boolean) => {
                expect(isNavigatingWIthKeyboard).toBe(true);
            });
    });

    it("should be true after pressing Enter key on a groupper", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const groupperAttr = getTabsterAttribute({ groupper: {} });

        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <div id="groupper" tabIndex={0} {...groupperAttr}>
                        <button>Foo</button>
                        <button>Bar</button>
                    </div>
                </div>
            )
        )
            .focusElement("#groupper")
            .eval(getKeyboardNavigationState)
            .check((keyboardNavgationState: boolean) => {
                expect(keyboardNavgationState).toBe(false);
            })
            .pressEnter()
            .pressTab()
            .eval(getKeyboardNavigationState)
            .check((keyboardNavgationState: boolean) => {
                expect(keyboardNavgationState).toBe(true);
            });
    });
});
