/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    disposeTabster,
    createTabster,
    findAllFocusable,
    findDefaultFocusable,
    findFirstFocusable,
    findFocusable,
    findLastFocusable,
    findNextFocusable,
    findPrevFocusable,
    getFocusableProps,
    getTabster,
    getCrossOrigin,
    getDeloser,
    getGroupper,
    getModalizer,
    getMover,
    getRestorer,
    getRootDummyInputs,
    getObservedElement,
    getOutline,
    isElementAccessible,
    isElementVisible,
    isFocusable,
    makeNoOp,
    mergeTabsterProps,
    getTabsterAttribute,
    setTabsterAttribute,
    getDummyInputContainer,
} from "../src";
import * as Events from "../src/Events";
import * as shadowDOM from "../src/Shadowdomize";
import { dom } from "../src/DOMAPI";

const tabsterTest = {};

const params = new URL(location.href).searchParams;
const enableShadowDOM = params.get("shadowdom") !== "false";
const controlTab = params.get("controlTab") !== "false";
const rootDummyInputs = params.get("rootDummyInputs") !== "false";
const partsValue = params.get("parts");
const parts =
    typeof partsValue === "string" ? partsValue.split(",") : undefined;
const partsToEnable = {};

tabsterTest.createTabster = (win, props) => {
    const newProps = { ...(props || {}) };
    newProps.DOMAPI = enableShadowDOM ? shadowDOM : undefined;
    // The public `controlTab` default is now `false` (slim baseline).
    // Tests historically relied on `createTabster(win)` giving controlled
    // Tab behaviour, so the test-time wrapper defaults to `true` unless
    // the caller explicitly sets it. Tests that want uncontrolled mode
    // still pass `controlTab: false` via the parts-bootstrap URL params.
    if (newProps.controlTab === undefined) {
        newProps.controlTab = true;
    }
    const tabster = createTabster(win, newProps);
    // Register dummy-input infrastructure unconditionally — per-part
    // Mover/Groupper/Modalizer dummies need the factories regardless of
    // whether root dummies are installed. The Tab keyhandler / root
    // dummy installation inside `getRootDummyInputs` is gated by the
    // controlTab/rootDummyInputs flags above.
    getRootDummyInputs(tabster);
    return tabster;
};
tabsterTest.disposeTabster = disposeTabster;
tabsterTest.getTabster = getTabster;
tabsterTest.getCrossOrigin = getCrossOrigin;
tabsterTest.getDeloser = getDeloser;
tabsterTest.getGroupper = getGroupper;
tabsterTest.getModalizer = getModalizer;
tabsterTest.getMover = getMover;
tabsterTest.getObservedElement = getObservedElement;
tabsterTest.getOutline = getOutline;
tabsterTest.makeNoOp = makeNoOp;
tabsterTest.getTabsterAttribute = getTabsterAttribute;
tabsterTest.setTabsterAttribute = setTabsterAttribute;
tabsterTest.mergeTabsterProps = mergeTabsterProps;
tabsterTest.getDummyInputContainer = getDummyInputContainer;
tabsterTest.findAllFocusable = findAllFocusable;
tabsterTest.findDefaultFocusable = findDefaultFocusable;
tabsterTest.findFirstFocusable = findFirstFocusable;
tabsterTest.findFocusable = findFocusable;
tabsterTest.findLastFocusable = findLastFocusable;
tabsterTest.findNextFocusable = findNextFocusable;
tabsterTest.findPrevFocusable = findPrevFocusable;
tabsterTest.getFocusableProps = getFocusableProps;
tabsterTest.isElementAccessible = isElementAccessible;
tabsterTest.isElementVisible = isElementVisible;
tabsterTest.isFocusable = isFocusable;
tabsterTest.dom = dom;
tabsterTest.shadowDOM = shadowDOM;
tabsterTest.Events = Events;

if (parts !== undefined) {
    for (let part of parts) {
        partsToEnable[part] = true;
    }

    const tabster = tabsterTest.createTabster(window, {
        controlTab,
        rootDummyInputs,
    });

    tabsterTest.core = tabster;

    console.log(
        "created tabster",
        `as ${
            controlTab ? "controlled" : "uncontrolled"
        }, root dummy inputs ${rootDummyInputs}`
    );

    if ("modalizer" in partsToEnable) {
        tabsterTest.modalizer = getModalizer(tabster);
        console.log("created modalizer");
    }

    if ("deloser" in partsToEnable) {
        tabsterTest.deloser = getDeloser(tabster);
        console.log("created deloser");
    }

    if ("outline" in partsToEnable) {
        tabsterTest.outline = getOutline(tabster);
        console.log("created outline");
    }

    if ("mover" in partsToEnable) {
        tabsterTest.mover = getMover(tabster);
        console.log("created mover");
    }

    if ("groupper" in partsToEnable) {
        tabsterTest.groupper = getGroupper(tabster);
        console.log("created groupper");
    }

    if ("observed" in partsToEnable) {
        tabsterTest.observedElement = getObservedElement(tabster);
        console.log("created observed");
    }

    if ("restorer" in partsToEnable) {
        tabsterTest.crossOrigin = getRestorer(tabster);
        console.log("created restorer");
    }

    if ("crossOrigin" in partsToEnable) {
        tabsterTest.crossOrigin = getCrossOrigin(tabster);
        tabsterTest.crossOrigin.setup();
        console.log("created cross origin");
    }
}

window.getTabsterTestVariables = () => tabsterTest;
