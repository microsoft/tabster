/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./groupper.css";
import { getTabsterAttribute, Types as TabsterTypes } from "../..";

export type FocusableContainerProps = TabsterTypes.GroupperProps;

export const createFocusableContainer = (props: FocusableContainerProps) => {
    const { tabbability } = props;

    const wrapper = document.createElement("div");
    wrapper.tabIndex = 0;
    wrapper.classList.add("item");

    const attr = getTabsterAttribute(
        {
            groupper: {
                tabbability,
            },
        },
        true
    );

    wrapper.setAttribute(TabsterTypes.TabsterAttributeName, attr);

    wrapper.innerHTML = `
    <button>Focusable button</button>
    <button>Focusable button</button>
  `;

    return wrapper;
};
