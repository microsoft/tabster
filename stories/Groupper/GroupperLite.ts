/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./groupper.css";
import {
    createLiteObserver,
    getTabsterAttribute,
    GroupperOptions,
    TABSTER_ATTRIBUTE_NAME,
} from "tabster/lite";

export type FocusableContainerLiteProps = GroupperOptions;

export const createFocusableContainerLite = (
    props: FocusableContainerLiteProps
) => {
    const { tabbability } = props;

    const observer = createLiteObserver({ modules: ["groupper"] });

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

    wrapper.setAttribute(TABSTER_ATTRIBUTE_NAME, attr);

    wrapper.innerHTML = `
    <button>Focusable button</button>
    <button>Focusable button</button>
  `;

    wrapper.addEventListener("DOMNodeRemoved", () => {
        observer.dispose();
    });

    return wrapper;
};
