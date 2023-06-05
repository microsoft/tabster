/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./mover.css";
import { getTabsterAttribute, Types as TabsterTypes } from "tabster";

export type MoverProps = TabsterTypes.MoverProps;

export const createBasicMover = ({
    cyclic,
    direction,
    memorizeCurrent,
    tabbable,
    trackState,
    visibilityAware,
    hasDefault,
}: MoverProps) => {
    console.log(direction);

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
                trackState,
                visibilityAware,
                hasDefault,
            },
        },
        true
    );

    wrapper.setAttribute(TabsterTypes.TabsterAttributeName, attr);

    return wrapper;
};

export const createTableMover = ({
    cyclic,
    direction,
    memorizeCurrent,
    tabbable,
    trackState,
    visibilityAware,
    hasDefault,
}: MoverProps) => {
    const attr = getTabsterAttribute(
        {
            mover: {
                cyclic,
                direction,
                memorizeCurrent,
                tabbable,
                trackState,
                visibilityAware,
                hasDefault,
            },
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
    table.setAttribute(TabsterTypes.TabsterAttributeName, attr);
    return table;
};
