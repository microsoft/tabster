/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import './modalizer.css';
import { getTabsterAttribute, Types as TabsterTypes } from '../..';

export interface ModalDialogProps extends TabsterTypes.ModalizerProps {}

export const createModalDialog = (props: ModalDialogProps) => {
    const {
        id = 'modalizer',
        isAlwaysAccessible,
        isNoFocusDefault,
        isNoFocusFirst,
        isOthersAccessible,
    } = props;

    const dialog = document.createElement('div');
    dialog.classList.add('lightbox');
    dialog.classList.add('hidden');
    dialog.innerHTML = `
      <div aria-label="Modal" role="region" class="modal">
        <h3>Modal dialog</h3>
        <div>
          This is a modal dialog powered by Tabster 
        </div>
      <div class="button-group" />
    `;

    const rootBtn = document.createElement('button');
    rootBtn.innerHTML = 'Open modal dialog';
    rootBtn.addEventListener('click', () => {
        console.log(dialog);
        dialog.classList.remove('hidden');
    });

    const closeButton = document.createElement('button');
    closeButton.innerHTML = 'Close dialog';
    closeButton.addEventListener('click', () => {
        dialog.classList.add('hidden');
    });

    const isDialogOpen = () => !dialog.classList.contains('hidden');
    document.addEventListener('click', (e) => {
        if (
            isDialogOpen() &&
            e.target &&
            !dialog.firstElementChild?.contains(e.target as HTMLElement) &&
            !rootBtn.contains(e.target as HTMLElement)
        ) {
            dialog.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (isDialogOpen() && e.key === 'Escape') {
            dialog.classList.add('hidden');
        }
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(rootBtn);
    wrapper.appendChild(dialog);
    dialog.querySelector('.button-group')?.appendChild(closeButton);

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
