/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "./modalizer.css";
import {
    getCurrentTabster,
    getTabsterAttribute,
    Types as TabsterTypes,
} from "../..";

export type ModalDialogProps = TabsterTypes.ModalizerProps;

export const createModalDialog = (props: ModalDialogProps) => {
    const {
        id = "modalizer",
        isAlwaysAccessible,
        isNoFocusDefault,
        isNoFocusFirst,
        isOthersAccessible,
    } = props;

    const tabster = getCurrentTabster(window);

    const dialog = document.createElement("div");
    dialog.classList.add("lightbox");
    dialog.classList.add("hidden");
    dialog.innerHTML = `
      <div aria-label="Modal" role="region" class="modal">
        <h3>Modal dialog</h3>
        <div class="modal-body">
          This is a modal dialog powered by Tabster 

          <button>Focusable item</button>
          <button>Focusable item</button>
          <button>Focusable item</button>
        </div>
      <div class="button-group" />
    `;

    const openDialog = () => {
        dialog.classList.remove("hidden");
        const firstFocusable = tabster?.focusable.findFirst({
            container: dialog,
        });
        firstFocusable?.focus();
    };

    const closeDialog = () => dialog.classList.add("hidden");

    const rootBtn = document.createElement("button");
    rootBtn.innerHTML = "Open modal dialog";
    rootBtn.addEventListener("click", () => {
        openDialog();
    });

    const closeButton = document.createElement("button");
    closeButton.innerHTML = "Close dialog";
    closeButton.addEventListener("click", () => {
        closeDialog();
    });

    const dismissButton = closeButton.cloneNode() as HTMLButtonElement;
    dismissButton.innerHTML = "Dismiss dialog";
    dismissButton.addEventListener("click", () => {
        closeDialog();
    });

    const isDialogOpen = () => !dialog.classList.contains("hidden");
    document.addEventListener("click", (e) => {
        if (
            isDialogOpen() &&
            e.target &&
            !dialog.firstElementChild?.contains(e.target as HTMLElement) &&
            !rootBtn.contains(e.target as HTMLElement)
        ) {
            closeDialog();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (isDialogOpen() && e.key === "Escape") {
            closeDialog();
        }
    });

    const wrapper = document.createElement("div");
    wrapper.appendChild(rootBtn);
    wrapper.appendChild(dialog);
    dialog.querySelector(".button-group")?.appendChild(closeButton);
    dialog.querySelector(".button-group")?.appendChild(dismissButton);

    const attr = getTabsterAttribute(
        {
            modalizer: {
                id,
                isAlwaysAccessible,
                isNoFocusDefault,
                isNoFocusFirst,
                isOthersAccessible,
            },
        },
        true
    );

    dialog.setAttribute(TabsterTypes.TabsterAttributeName, attr);

    return wrapper;
};
