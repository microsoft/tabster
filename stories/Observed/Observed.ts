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
    TABSTER_ATTRIBUTE_NAME,
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

export const createObservedWrapperWithAPIDemo = (
    props: ObservedElementProps
) => {
    const { names } = props;

    const wrapper = document.createElement("div");
    wrapper.style.padding = "20px";
    wrapper.style.fontFamily = "monospace";

    // Create onObservedElementChange log display
    const logContainer = document.createElement("div");
    logContainer.style.border = "1px solid #ccc";
    logContainer.style.padding = "10px";
    logContainer.style.marginBottom = "20px";
    logContainer.style.maxHeight = "200px";
    logContainer.style.overflowY = "auto";
    logContainer.style.backgroundColor = "#f5f5f5";

    const logTitle = document.createElement("h3");
    logTitle.textContent = "Event Log (onObservedElementChange):";
    logTitle.style.marginTop = "0";
    wrapper.appendChild(logTitle);
    wrapper.appendChild(logContainer);

    const log = (message: string) => {
        const entry = document.createElement("div");
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        entry.style.padding = "2px 0";
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    };

    // Setup change tracking
    const tabster = createTabster(window);
    const observedElement = getObservedElement(tabster);
    observedElement.onObservedElementChange = (change) => {
        const namesInfo =
            change.names.length > 0
                ? `all names=[${change.names.join(", ")}]`
                : "element removed";

        const changeDetails: string[] = [];
        if (change.addedNames && change.addedNames.length > 0) {
            changeDetails.push(`added=[${change.addedNames.join(", ")}]`);
        }
        if (change.removedNames && change.removedNames.length > 0) {
            changeDetails.push(`removed=[${change.removedNames.join(", ")}]`);
        }

        const changeInfo =
            changeDetails.length > 0 ? ` (${changeDetails.join(", ")})` : "";

        log(
            `${change.type.toUpperCase()}: element="${change.element.textContent}" ${namesInfo}${changeInfo}`
        );
    };

    // Create observed elements display
    const observedListTitle = document.createElement("h3");
    observedListTitle.textContent =
        "Current Observed Elements (getAllObservedElements):";
    wrapper.appendChild(observedListTitle);

    const observedListContainer = document.createElement("div");
    observedListContainer.style.border = "1px solid #ccc";
    observedListContainer.style.padding = "10px";
    observedListContainer.style.marginBottom = "20px";
    observedListContainer.style.backgroundColor = "#f5f5f5";
    observedListContainer.style.minHeight = "50px";
    wrapper.appendChild(observedListContainer);

    const updateObservedList = () => {
        observedListContainer.innerHTML = "";
        const allObserved = observedElement.getAllObservedElements();

        if (allObserved.size === 0) {
            observedListContainer.textContent = "No observed elements";
        } else {
            allObserved.forEach((items, name) => {
                const nameEntry = document.createElement("div");
                nameEntry.style.padding = "5px 0";
                nameEntry.innerHTML = `<strong>${name}</strong>: ${items.length} element(s) - [${items
                    .map(
                        (item) =>
                            `${item.element.textContent} (names: [${item.names.join(", ")}])`
                    )
                    .join(", ")}]`;
                observedListContainer.appendChild(nameEntry);
            });
        }
    };

    // Create control buttons
    const controlsContainer = document.createElement("div");
    controlsContainer.style.marginBottom = "20px";

    const addButton = document.createElement("button");
    addButton.textContent = "Add Observed Element";
    addButton.style.marginRight = "10px";
    let counter = 0;
    addButton.onclick = () => {
        counter++;
        const newElement = createObserved(
            { names: [`dynamic-${counter}`] },
            document
        );
        newElement.textContent = `Dynamic Element ${counter}`;
        newElement.style.margin = "5px";
        elementsContainer.appendChild(newElement);
        requestAnimationFrame(updateObservedList);
    };

    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear All Elements";
    clearButton.onclick = () => {
        elementsContainer.innerHTML = "";
        counter = 0;
        requestAnimationFrame(updateObservedList);
    };

    controlsContainer.appendChild(addButton);
    controlsContainer.appendChild(clearButton);
    wrapper.appendChild(controlsContainer);

    // Create container for elements
    const elementsTitle = document.createElement("h3");
    elementsTitle.textContent = "Observed Elements:";
    wrapper.appendChild(elementsTitle);

    const elementsContainer = document.createElement("div");
    elementsContainer.style.border = "1px solid #ccc";
    elementsContainer.style.padding = "10px";
    elementsContainer.style.minHeight = "100px";

    // Add initial elements
    names.forEach((name) => {
        const element = createObserved({ names: [name] }, document);
        element.textContent = `Element with name: ${name}`;
        element.style.margin = "5px";
        elementsContainer.appendChild(element);
    });

    wrapper.appendChild(elementsContainer);

    requestAnimationFrame(updateObservedList);

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
            script.innerText += `
                window.__setupInterval = setInterval(
                    () => { 
                        if (typeof setupTabsterInIframe === "function") {
                            clearInterval(window.__setupInterval);
                            delete window.__setupInterval;
                            setupTabsterInIframe(window);
                            document.body.removeAttribute("class");
                        }
                    });`;
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

    observed.setAttribute(TABSTER_ATTRIBUTE_NAME, attr);

    return observed;
};
