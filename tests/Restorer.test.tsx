/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as React from "react";
import {
    getTabsterAttribute,
    RestorerTypes,
    TABSTER_ATTRIBUTE_NAME,
} from "tabster";
import * as BroTest from "./utils/BroTest";

describe("Restorer", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ restorer: true });
    });
    it("should restore focus when focus is moved to body from source", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target" {...targetAttr}>
                        target
                    </button>

                    <div id="source" {...sourceAttr}>
                        <button>source</button>
                    </div>
                </div>
            )
        )
            .focusElement("#target")
            .focusElement("#source button")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target"));
    });

    it("should restore focus when source is a focusable element", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target" {...targetAttr}>
                        target
                    </button>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .focusElement("#target")
            .focusElement("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target"));
    });

    it("should follow target history", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target-1" {...targetAttr}>
                        target 1
                    </button>
                    <button id="target-2" {...targetAttr}>
                        target 2
                    </button>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .focusElement("#target-1")
            .focusElement("#target-2")
            .focusElement("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target 2"));
    });

    it("should follow target history when element is removed", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target-1" {...targetAttr}>
                        target 1
                    </button>
                    <button id="target-2" {...targetAttr}>
                        target 2
                    </button>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .focusElement("#target-1")
            .focusElement("#target-2")
            .focusElement("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "target-2")
                    ?.remove();
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target 1"));
    });

    it("should not restore focus when lost focus is not on body", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target-1" {...targetAttr}>
                        target
                    </button>
                    <button id="other" {...targetAttr}>
                        other
                    </button>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .focusElement("#target-1")
            .focusElement("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
                getTabsterTestVariables()
                    .dom?.getElementById(document, "other")
                    ?.focus();
            })
            .wait(100)
            .activeElement((el) => expect(el?.textContent).toEqual("other"));
    });

    it("should not restore focus when focus is not lost from source", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target-1" {...targetAttr}>
                        target
                    </button>

                    <button id="not-source">not source</button>
                </div>
            )
        )
            .focusElement("#target-1")
            .focusElement("#not-source")
            .activeElement((el) =>
                expect(el?.textContent).toEqual("not source")
            )
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "not-source")
                    ?.remove();
            })
            .activeElement((el) => expect(el).toBeNull());
    });

    it("should not restore focus during mouse navigation mode", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target" {...targetAttr}>
                        target
                    </button>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .click("#target")
            .activeElement((el) => expect(el?.textContent).toEqual("target"))
            .click("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .click("body")
            .activeElement((el) => expect(el).toBeNull());
    });

    it("should restore focus during mouse navigation mode if source is removed from DOM", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target" {...targetAttr}>
                        target
                    </button>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .click("#target")
            .activeElement((el) => expect(el?.textContent).toEqual("target"))
            .click("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target"));
    });

    it("should not run infinite loop when there is no history", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target" {...targetAttr}>
                        target
                    </button>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .click("#target")
            .activeElement((el) => expect(el?.textContent).toEqual("target"))
            .click("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "target")
                    ?.remove();
            })
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            });
    }, 10000);

    it("should register already focused target", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        const sourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <div id="target-container" {...targetAttr}></div>

                    <button id="source" {...sourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .eval(
                (tabsterAttrName, targetAttr) => {
                    const target = document.createElement("button");
                    target.textContent = "target";
                    target.setAttribute(tabsterAttrName, targetAttr);
                    getTabsterTestVariables()
                        .dom?.getElementById(document, "target-container")
                        ?.appendChild(target);
                    target.focus();
                },
                TABSTER_ATTRIBUTE_NAME,
                targetAttr[TABSTER_ATTRIBUTE_NAME] as string
            )
            .activeElement((el) => expect(el?.textContent).toEqual("target"))
            .click("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target"));
    });
});

describe("Restorer focus priority", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({
            restorer: true,
            groupper: true,
            modalizer: true,
        });
    });
    it("should prioritize Restorer before Groupper when both want to move focus", async () => {
        await new BroTest.BroTest(
            (
                <div {...getTabsterAttribute({ root: {} })}>
                    <div
                        tabIndex={0}
                        {...getTabsterAttribute({
                            groupper: { tabbability: 2 },
                            modalizer: { id: "modal" },
                        })}
                    >
                        <button
                            id="target"
                            {...getTabsterAttribute({
                                restorer: { type: RestorerTypes.Target },
                            })}
                        >
                            target
                        </button>
                        <button>button</button>
                    </div>

                    <div
                        id="source"
                        {...getTabsterAttribute({
                            restorer: { type: RestorerTypes.Source },
                            modalizer: { id: "modal" },
                        })}
                    >
                        <button>source</button>
                    </div>
                </div>
            )
        )
            .focusElement("#target")
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("button"))
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .pressEsc()
            // When Esc is pressed, groupper handles is asynchronously, and restorer is not
            // involved, because the source is still in the DOM. So, the groupper should handle
            // the Esc normally.
            .activeElement((el) =>
                expect(el?.textContent).toEqual("targetbutton")
            )
            .pressEnter()
            .pressTab()
            .pressTab()
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                const source = getTabsterTestVariables().dom?.getElementById(
                    document,
                    "source"
                );

                if (source) {
                    // This will trigger both async Esc handling and restorer focus restoration at the same time.
                    // The async focus intent from the Restorer should win.
                    source.dispatchEvent(
                        new KeyboardEvent("keydown", {
                            key: "Escape",
                            bubbles: true,
                            composed: true,
                        })
                    );
                    source.remove();
                }
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target"));
    });
});

describe("Restorer focus link", () => {
    beforeEach(async () => {
        await BroTest.bootstrapTabsterPage({ restorer: true });
    });
    it('should restore focus to the last "linked" target', async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const linkedSourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source, id: "link" },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        const linkedTargetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target, id: "link" },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target-1" {...linkedTargetAttr}>
                        target 1
                    </button>
                    <button id="target-2" {...targetAttr}>
                        target 2
                    </button>

                    <button id="source" {...linkedSourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .focusElement("#target-1")
            .focusElement("#target-2")
            .focusElement("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target 1"));
    });
    it('should not restore focus if no "linked" target is available', async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const linkedSourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source, id: "link" },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target-1" {...targetAttr}>
                        target 1
                    </button>
                    <button id="target-2" {...targetAttr}>
                        target 2
                    </button>
                    <button id="source" {...linkedSourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .focusElement("#target-1")
            .focusElement("#target-2")
            .focusElement("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el).toEqual(null));
    });
    it("should not restore focus to target that is not in DOM anymore", async () => {
        const rootAttr = getTabsterAttribute({ root: {} });
        const linkedSourceAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Source, id: "link" },
        });
        const targetAttr = getTabsterAttribute({
            restorer: { type: RestorerTypes.Target, id: "link" },
        });
        await new BroTest.BroTest(
            (
                <div {...rootAttr}>
                    <button id="target-1" {...targetAttr}>
                        target 1
                    </button>
                    <button id="target-2" {...targetAttr}>
                        target 1
                    </button>
                    <button id="source" {...linkedSourceAttr}>
                        source
                    </button>
                </div>
            )
        )
            .focusElement("#target-1")
            .focusElement("#target-2")
            .focusElement("#source")
            .activeElement((el) => expect(el?.textContent).toEqual("source"))
            .eval(() => {
                getTabsterTestVariables()
                    .dom?.getElementById(document, "target-2")
                    ?.remove();
                getTabsterTestVariables()
                    .dom?.getElementById(document, "source")
                    ?.remove();
            })
            .activeElement((el) => expect(el?.textContent).toEqual("target 1"));
    });
});
