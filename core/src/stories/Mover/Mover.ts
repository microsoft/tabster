/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import './mover.css';
import { getTabsterAttribute, Types as TabsterTypes } from '../..';

export interface MoverProps extends TabsterTypes.MoverProps {}

export const createBasicMover = ({
  cyclic,
  direction,
  disableHomeEndKeys,
  memorizeCurrent,
  tabbable,
  trackState,
  visibilityAware
}: MoverProps) => {

  console.log(direction);
  
  const wrapper = document.createElement('div');
  wrapper.classList.add('mover-wrapper');
  const html = `
    <button class="mover-item">Mover Item</button>
    <button class="mover-item">Mover Item</button>
    <button class="mover-item">Mover Item</button>
    <button class="mover-item">Mover Item</button>
  `;
  wrapper.innerHTML = html;

  const attr = getTabsterAttribute({ mover: {
    cyclic,
    direction,
    disableHomeEndKeys,
    memorizeCurrent,
    tabbable,
    trackState,
    visibilityAware,
  }}, true);

  wrapper.setAttribute(TabsterTypes.TabsterAttributeName, attr);

  return wrapper;
};
