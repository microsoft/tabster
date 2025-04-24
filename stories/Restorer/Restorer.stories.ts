/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, StoryFn } from "@storybook/html";
import {
    getTabsterAttribute,
    RestorerTypes,
    TABSTER_ATTRIBUTE_NAME,
} from "tabster";
import "./restorer.css";

export default {
    title: "Restorer",
} as Meta;

export const RestorerBasicExample: StoryFn = () => {
    const sourceAttr = getTabsterAttribute(
        {
            restorer: { type: RestorerTypes.Source },
        },
        true
    );

    const targetAttr = getTabsterAttribute(
        {
            restorer: { type: RestorerTypes.Target },
        },
        true
    );
    const example = document.createElement("div");
    const source = document.createElement("div");
    source.setAttribute(TABSTER_ATTRIBUTE_NAME, sourceAttr);
    source.classList.add("source");
    source.innerHTML = `
        <button id="unmount">unmount</button>
        <button>Foo</button>
        <button>Foo</button>
        <button>Foo</button>
        <button>Foo</button>
    `;

    const target = document.createElement("button");
    target.textContent = "Target";
    target.setAttribute(TABSTER_ATTRIBUTE_NAME, targetAttr);
    target.addEventListener("click", () => {
        example.append(source);
        const initialFocus = source.querySelector(
            "#unmount"
        ) as HTMLButtonElement;
        initialFocus?.focus();
        document.getElementById("unmount")?.addEventListener("click", () => {
            source.remove();
        });
    });

    example.append(target);

    return example;
};

export const UseTargetHistory: StoryFn = () => {
    const sourceAttr = getTabsterAttribute(
        {
            restorer: { type: RestorerTypes.Source },
        },
        true
    );

    const targetAttr = getTabsterAttribute(
        {
            restorer: { type: RestorerTypes.Target },
        },
        true
    );
    const example = document.createElement("div");
    const source = document.createElement("div");
    source.tabIndex = -1;
    source.setAttribute(TABSTER_ATTRIBUTE_NAME, sourceAttr);
    source.classList.add("source");
    source.innerHTML = `
        <button id="unmount">unmount</button>
        <button>Foo</button>
        <button>Foo</button>
        <button>Foo</button>
        <button>Foo</button>
    `;

    const target = document.createElement("button");
    target.textContent = "Target";
    target.setAttribute(TABSTER_ATTRIBUTE_NAME, targetAttr);
    target.addEventListener("click", () => {
        example.append(source);
        const initialFocus = source.querySelector(
            "#unmount"
        ) as HTMLButtonElement;
        initialFocus?.focus();
        document.getElementById("unmount")?.addEventListener("click", () => {
            source.remove();
        });
        target.remove();
    });

    const secondTarget = document.createElement("button");
    secondTarget.textContent = "secondTarget";
    secondTarget.setAttribute(TABSTER_ATTRIBUTE_NAME, targetAttr);

    example.append(secondTarget);
    example.append(target);
    return example;
};
