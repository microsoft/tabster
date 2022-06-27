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

export const createAsyncObservedWrapper = (props: ObservedElementProps) => {
    const { name } = props;

    // create observed target
    const observedContainer = document.createElement("div");
    const observedTarget = createObserved(props);
    const mountObservedTargetWithDelay = () => {
        if (observedContainer.childElementCount) {
            observedContainer.removeChild(observedTarget);
        }
        setTimeout(() => {
            observedContainer.appendChild(observedTarget);
        }, DELAY);
    };

    // create multiple triggers buttons
    const trigger = createTrigger({
        name,
        text: `Asynchronously show and focus observed element with name ${name}`,
        onClick: mountObservedTargetWithDelay,
    });

    const wrapper = document.createElement("div");
    wrapper.appendChild(trigger);
    wrapper.appendChild(observedContainer);

    return wrapper;
};

export const createObservedWrapper = (props: ObservedElementProps) => {
    const { name } = props;

    // create observed target
    const observedTarget = createObserved(props);

    // create multiple triggers buttons
    const trigger = createTrigger({
        name,
        text: `Focus observed element with name ${name}`,
    });

    const wrapper = document.createElement("div");
    wrapper.appendChild(trigger);
    wrapper.appendChild(observedTarget);

    return wrapper;
};

type TriggerProps = {
    name: string;
    text: string;
    onClick?: () => void;
};
const createTrigger = ({ name, text, onClick }: TriggerProps) => {
    const trigger = document.createElement("button");
    trigger.id = `trigger-for-${name}`;
    trigger.innerText = text;
    trigger.onclick = function () {
        onClick?.();
        const tabster = getCurrentTabster(window);
        tabster?.observedElement?.requestFocus(name, 5000);
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
