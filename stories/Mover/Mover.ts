/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./mover.css";
import {
    getTabsterAttribute,
    MoverDirections,
    TABSTER_ATTRIBUTE_NAME,
    Types as TabsterTypes,
} from "tabster";

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

    wrapper.setAttribute(TABSTER_ATTRIBUTE_NAME, attr);

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
    table.setAttribute(TABSTER_ATTRIBUTE_NAME, attr);
    return table;
};

export const createTestTableMover = () => {
    const attr = getTabsterAttribute(
        {
            mover: {
                cyclic: false,
                direction: MoverDirections.GridLinear,
                memorizeCurrent: true,
                tabbable: false,
            },
        },
        true
    );
    const theadHtml = `
    <thead>
        <tr>
            <td class="mover-table-select"><input type="checkbox" /></td>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
            <th tabindex="0">Company</th>
            <th tabindex="0">Contact</th>
            <th tabindex="0">Country</th>
        </tr>
    </thead>
    `;
    const rows = [
        {
            company: "Alfreds Futterkiste",
            contact: "Maria Anders",
            country: "Germany",
        },
        {
            company: "Centro comercial Moctezuma",
            contact: "Francisco Chang",
            country: "Mexico",
        },
        {
            company: "Ernst Handel",
            contact: "Roland Mendel",
            country: "Austria",
        },
        {
            company: "Island Trading",
            contact: "Helen Bennett",
            country: "UK",
        },
    ];
    const lotsOfRows = [];
    for (let i = 0; i < 35; i++) {
        lotsOfRows.push(rows[0]);
        lotsOfRows.push(rows[1]);
        lotsOfRows.push(rows[2]);
        lotsOfRows.push(rows[3]);
    }

    let tbodyHtml = "";
    lotsOfRows.forEach(row => {
        tbodyHtml += `
        <tr>
            <td class="mover-table-select"><input type="checkbox" /></td>
            <td tabindex="0">${row.company}</td>
            <td tabindex="0">${row.contact}</td>
            <td tabindex="0">${row.country}</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
            <td tabindex="0">Alfreds Futterkiste</td>
            <td tabindex="0">Maria Anders</td>
            <td tabindex="0">Germany</td>
        </tr>
        `;
    });

    const thead = document.createElement("thead");
    thead.innerHTML = theadHtml;

    const tbody = document.createElement("tbody");
    tbody.classList.add("mover-grid");
    tbody.innerHTML = tbodyHtml;
    tbody.setAttribute(TABSTER_ATTRIBUTE_NAME, attr);

    const table = document.createElement("table");
    table.innerHTML = thead.outerHTML + tbody.outerHTML;

    return table;
};
