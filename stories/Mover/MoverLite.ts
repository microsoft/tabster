/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./mover.css";
import {
    createLiteObserver,
    getTabsterAttribute,
    MoverOptions,
    TABSTER_ATTRIBUTE_NAME,
} from "tabster/lite";

export type MoverLiteProps = MoverOptions;

export const createBasicMoverLite = (props: MoverLiteProps) => {
    const {
        cyclic,
        direction,
        memorizeCurrent,
        tabbable,
        visibilityAware,
        hasDefault,
    } = props;

    const observer = createLiteObserver({ modules: ["mover"] });

    const wrapper = document.createElement("div");
    wrapper.classList.add("mover-wrapper");
    const html = `
    <button class="mover-item">Mover Item</button>
    <button class="mover-item">Mover Item</button>
    <button class="mover-item">Mover Item</button>
    <button class="mover-item">Mover Item</button>
  `;
    wrapper.innerHTML = html;

    const attr = getTabsterAttribute(
        {
            mover: {
                cyclic,
                direction,
                memorizeCurrent,
                tabbable,
                visibilityAware,
                hasDefault,
            } as unknown as Record<string, unknown>,
        },
        true
    );

    wrapper.setAttribute(TABSTER_ATTRIBUTE_NAME, attr);

    wrapper.addEventListener("DOMNodeRemoved", () => {
        observer.dispose();
    });

    return wrapper;
};

export const createTableMoverLite = (props: MoverLiteProps) => {
    const {
        cyclic,
        direction,
        memorizeCurrent,
        tabbable,
        visibilityAware,
        hasDefault,
    } = props;

    const observer = createLiteObserver({ modules: ["mover"] });

    const attr = getTabsterAttribute(
        {
            mover: {
                cyclic,
                direction,
                memorizeCurrent,
                tabbable,
                visibilityAware,
                hasDefault,
            } as unknown as Record<string, unknown>,
        },
        true
    );
    const html = `
    <thead>
        <tr>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
        </tr>
    </thead>
    <tbody class="mover-grid">
        <tr>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
        </tr>
        <tr>
            <td tabindex="0">Centro comercial Moctezuma</td>
            <td tabindex="0">Francisco Chang</td>
            <td tabindex="0">Mexico</td>
        </tr>
        <tr>
            <td tabindex="0">Ernst Handel</td>
            <td tabindex="0">Roland Mendel</td>
            <td tabindex="0">Austria</td>
        </tr>
        <tr>
            <td tabindex="0">Island Trading</td>
            <td tabindex="0">Helen Bennett</td>
            <td tabindex="0">UK</td>
        </tr>
    </tbody>
    `;

    const table = document.createElement("table");
    table.innerHTML = html;
    table.setAttribute(TABSTER_ATTRIBUTE_NAME, attr);

    table.addEventListener("DOMNodeRemoved", () => {
        observer.dispose();
    });

    return table;
};
