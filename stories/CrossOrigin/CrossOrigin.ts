/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./crossOrigin.css";
import {
    createTabster,
    getCrossOrigin,
    getCurrentTabster,
    getDeloser,
    getGroupper,
    getModalizer,
    getMover,
    getObservedElement,
    getOutline,
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

    getModalizer(tabster);
    getDeloser(tabster);
    getOutline(tabster);
    getMover(tabster);
    getGroupper(tabster);
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

    // create observed target in iframe
    const observedTarget = createObserved(props);
    iframe.srcdoc = `
<script>parent.setupTabsterInIframe(window)</script>
<body>${observedTarget.outerHTML}</body>
`;

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

const createObserved = (props: ObservedElementProps) => {
    const observed = document.createElement("div");
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
