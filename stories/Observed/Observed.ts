/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./observed.css";
import {
    createTabster,
    getCrossOrigin,
    getObservedElement,
    getTabsterAttribute,
    Types as TabsterTypes,
} from "tabster";

export type ObservedElementProps = TabsterTypes.ObservedElementProps;

const DELAY = 1000;

export const createObservedWrapper = (props: ObservedElementProps) => {
    const { names } = props;

    // create observed target
    const observedContainer = document.createElement("div");
    const observedTarget = createObserved(props, document);
    const mountObservedTargetWithDelay = () => {
        if (observedContainer.childElementCount) {
            observedContainer.removeChild(observedTarget);
        }
        setTimeout(() => {
            observedContainer.appendChild(observedTarget);
        }, DELAY);
    };

    // create multiple triggers buttons
    const triggers = names.map((name) =>
        createTrigger({
            name,
            innerText: `Asynchronously show and focus observed element with name ${name}`,
            onClick: mountObservedTargetWithDelay,
        })
    );

    const wrapper = document.createElement("div");
    triggers.forEach((trigger) => wrapper.appendChild(trigger));
    wrapper.appendChild(observedContainer);

    return wrapper;
};

const setupTabsterInIframe = (currWindow: Window) => {
    const tabster = createTabster(currWindow, {
        autoRoot: {},
        controlTab: true,
        rootDummyInputs: undefined,
    });
    console.log("created tabster for iframe");
    getObservedElement(tabster);
    const crossOrigin = getCrossOrigin(tabster);
    crossOrigin.setup();
    console.log("created cross origin");
};

declare global {
    interface Window {
        setupTabsterInIframe: (currWindow: Window) => void;
    }
}
window.setupTabsterInIframe = setupTabsterInIframe;

export const createObservedWrapperWithIframe = (
    props: ObservedElementProps
) => {
    const { names } = props;

    const iframe = document.createElement("iframe");
    // Note: dynamic iframe using srcdoc does not work https://bugs.chromium.org/p/chromium/issues/detail?id=1339813
    // a `src` attribute is required
    iframe.src = `#`;
    iframe.onload = () => {
        const document = iframe.contentDocument;
        if (document) {
            document.body.innerHTML = "";
            const script = document.createElement("script");
            script.innerText = `setupTabsterInIframe(window)`;
            document.body.append(script);
            const observedTarget = createObserved(props, document);
            document.body.append(observedTarget);
        }
    };
    iframe.width = "600px";

    // create trigger button
    const triggers = names.map((name) =>
        createTrigger({
            name,
            innerText: `Focus observed element in iframe with name ${name}`,
            isCrossOrigin: true,
        })
    );

    const wrapper = document.createElement("div");
    triggers.forEach((trigger) => wrapper.appendChild(trigger));
    wrapper.appendChild(iframe);

    return wrapper;
};

type TriggerProps = {
    name: string;
    innerText: string;
    onClick?: () => void;
    isCrossOrigin?: boolean;
};
const createTrigger = ({
    name,
    innerText,
    onClick,
    isCrossOrigin,
}: TriggerProps) => {
    const trigger = document.createElement("button");
    trigger.id = `trigger-for-${name}`;
    trigger.innerText = innerText;
    trigger.onclick = function () {
        onClick?.();
        const tabster = createTabster(window);
        if (isCrossOrigin) {
            const crossOrigin = getCrossOrigin(tabster);
            crossOrigin.observedElement?.requestFocus(name, 5000);
        } else {
            const observedElement = getObservedElement(tabster);
            observedElement.requestFocus(name, 5000);
        }
    };

    return trigger;
};

const createObserved = (
    props: ObservedElementProps,
    currDocument: Document
) => {
    const observed = currDocument.createElement("div");
    observed.tabIndex = 0;
    observed.classList.add("observed");
    observed.innerText = `observed element with names: ${JSON.stringify(
        props.names
    )}`;

    const attr = getTabsterAttribute(
        {
            observed: props,
        },
        true
    );

    observed.setAttribute(TabsterTypes.TabsterAttributeName, attr);

    return observed;
};
