/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Meta, Story } from "@storybook/html";
import { Types as TabsterTypes, getTabsterAttribute } from "tabster";
import "./restorer.css";

export default {
    title: "Restorer",
} as Meta;

export const RestorerBasicExample: Story = () => {
    const sourceAttr = getTabsterAttribute(
        {
            restorer: { type: TabsterTypes.RestorerTypes.Source },
        },
        true
    );

    const targetAttr = getTabsterAttribute(
        {
            restorer: { type: TabsterTypes.RestorerTypes.Target },
        },
        true
    );
    const example = document.createElement("div");
    const source = document.createElement("div");
    source.setAttribute(TabsterTypes.TabsterAttributeName, sourceAttr);
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
    target.setAttribute(TabsterTypes.TabsterAttributeName, targetAttr);
    target.addEventListener("click", () => {
        example.append(source);
        const initialFocus = source.querySelector("#unmount") as HTMLButtonElement;
        initialFocus?.focus();
        document.getElementById("unmount")?.addEventListener("click", () => {
            source.remove();
        });
    });

    example.append(target);

    return example;
};

export const UseTargetHistory: Story = () => {
    const sourceAttr = getTabsterAttribute(
        {
            restorer: { type: TabsterTypes.RestorerTypes.Source },
        },
        true
    );

    const targetAttr = getTabsterAttribute(
        {
            restorer: { type: TabsterTypes.RestorerTypes.Target },
        },
        true
    );
    const example = document.createElement("div");
    const source = document.createElement("div");
    source.tabIndex = -1;
    source.setAttribute(TabsterTypes.TabsterAttributeName, sourceAttr);
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
    target.setAttribute(TabsterTypes.TabsterAttributeName, targetAttr);
    target.addEventListener("click", () => {
        example.append(source);
        const initialFocus = source.querySelector("#unmount") as HTMLButtonElement;
        initialFocus?.focus();
        document.getElementById("unmount")?.addEventListener("click", () => {
            source.remove();
        });
        target.remove();
    });

    const secondTarget = document.createElement("button");
    secondTarget.textContent = "secondTarget";
    secondTarget.setAttribute(TabsterTypes.TabsterAttributeName, targetAttr);

    example.append(secondTarget);
    example.append(target);
    return example;
};
