/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./observed.css";
import {
    getCurrentTabster,
    getTabsterAttribute,
    Types as TabsterTypes,
} from "tabster";

export type ObservedElementProps = TabsterTypes.ObservedElementProps;

const DELAY = 1000;

export const createObservedWrapper = (props: ObservedElementProps) => {
    const { names } = props;

    // create observed target
    const observedContainer = document.createElement("div");
    const observedTarget = createObserved(props);
    const mountObservedTargetWithDelay = () => {
        setTimeout(() => {
            observedContainer.appendChild(observedTarget);
        }, DELAY);
    };
    const unmountObservedTarget = () => {
        observedContainer.removeChild(observedTarget);
    };

    // create multiple triggers buttons
    const triggers = names.map((name) =>
        createTrigger({
            name,
            innerText: `Asynchronously show and focus observed element with name ${name}`,
            onClick: mountObservedTargetWithDelay,
        })
    );

    // A button to remove observed target
    const cleanupButton = document.createElement("button");
    cleanupButton.innerText = `Hide observed element`;
    cleanupButton.onclick = function () {
        unmountObservedTarget();
    };

    const wrapper = document.createElement("div");
    triggers.forEach((trigger) => wrapper.appendChild(trigger));
    wrapper.appendChild(observedContainer);
    wrapper.appendChild(cleanupButton);

    return wrapper;
};

export const createObservedWrapperWithIframe = (
    props: ObservedElementProps
) => {
    const { names } = props;

    const iframe = document.createElement("iframe");

    // create observed target
    const observedTarget = createObserved(props);
    const html = `<body>${observedTarget.outerHTML}</body>`;
    iframe.src = "data:text/html;charset=utf-8," + encodeURI(html);

    // create multiple triggers buttons
    const triggers = names.map((name) =>
        createTrigger({
            name,
            innerText: `Focus observed element in iframe with name ${name}`,
        })
    );

    const wrapper = document.createElement("div");
    triggers.forEach((trigger) => wrapper.appendChild(trigger));
    document.body.appendChild(iframe);

    return wrapper;
};

type TriggerProps = {
    name: string;
    innerText: string;
    onClick?: () => void;
};
const createTrigger = ({ name, onClick, innerText }: TriggerProps) => {
    const trigger = document.createElement("button");
    trigger.id = `trigger-for-${name}`;
    trigger.innerText = innerText;
    trigger.onclick = function () {
        onClick?.();
        const tabster = getCurrentTabster(window);
        tabster?.observedElement?.requestFocus(name, 5000);
    };

    return trigger;
};

const createObserved = (props: TabsterTypes.ObservedElementProps) => {
    const observed = document.createElement("div");
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
