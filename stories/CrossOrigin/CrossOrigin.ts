/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./crossOrigin.css";
import {
    getCurrentTabster,
    getTabsterAttribute,
    Types as TabsterTypes,
} from "tabster";

export type ObservedElementProps = TabsterTypes.ObservedElementProps;

const DELAY = 1000;

export const createObservedWrapperWithIframe = (
    props: ObservedElementProps
) => {
    const { name } = props;

    // create observed target in iframe
    const observedContainer = document.createElement("div");
    const observedTarget = createObserved(props);
    const iframe = document.createElement("iframe");
    iframe.srcdoc = `<body>${observedTarget.outerHTML}</body>`;
    const mountObservedTargetWithDelay = () => {
        if (observedContainer.childElementCount) {
            observedContainer.removeChild(iframe);
        }
        setTimeout(() => {
            observedContainer.appendChild(iframe);
        }, DELAY);
    };

    // create trigger button
    const trigger = createTrigger({
        name,
        showObservedTarget: mountObservedTargetWithDelay,
    });

    const wrapper = document.createElement("div");
    wrapper.appendChild(trigger);
    wrapper.appendChild(observedContainer);

    return wrapper;
};

type TriggerProps = {
    name: string;
    showObservedTarget: () => void;
};
const createTrigger = ({ name, showObservedTarget }: TriggerProps) => {
    const trigger = document.createElement("button");
    trigger.id = `trigger-for-${name}`;
    trigger.innerText = `Focus observed element in iframe with name ${name}`;
    trigger.onclick = function () {
        showObservedTarget();
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
