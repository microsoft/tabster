/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./crossOrigin.css";
import {
    createTabster,
    getCrossOrigin,
    getCurrentTabster,
    getObservedElement,
    getTabsterAttribute,
    Types as TabsterTypes,
} from "tabster";

export type ObservedElementProps = TabsterTypes.ObservedElementProps;

const setupTabsterInIframe = (currWindow: Window) => {
    const tabster = createTabster(currWindow, {
        autoRoot: {},
        controlTab: true,
        rootDummyInputs: undefined,
    });
    console.log("created tabster for iframe");
    getObservedElement(tabster);
    getCrossOrigin(tabster);
    tabster?.crossOrigin?.setup();
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
    const { name } = props;

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
    const trigger = createTrigger({ name });

    const wrapper = document.createElement("div");
    wrapper.appendChild(trigger);
    wrapper.appendChild(iframe);

    return wrapper;
};

type TriggerProps = {
    name: string;
};
const createTrigger = ({ name }: TriggerProps) => {
    const trigger = document.createElement("button");
    trigger.id = `trigger-for-${name}`;
    trigger.innerText = `Focus observed element in iframe with name ${name}`;
    trigger.onclick = function () {
        const tabster = getCurrentTabster(window);
        tabster?.crossOrigin?.observedElement?.requestFocus(name, 5000);
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
    observed.innerText = `observed element with name: ${JSON.stringify(
        props.name
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
